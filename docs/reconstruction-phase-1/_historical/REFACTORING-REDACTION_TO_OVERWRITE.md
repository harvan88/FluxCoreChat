# Refactoring: Redacción → Sobrescritura

## 🎯 Propósito

Clarificar la terminología ambigua de "redacción" reemplazándola por "sobrescritura" para eliminar confusiones conceptuales y mejorar la comprensión del sistema.

## 📊 Impacto y Riesgos

### 🚨 Riesgos Críticos
- **Datos existentes:** Columnas `redacted_at`/`redacted_by` con datos reales
- **APIs externas:** Clientes que dependen de los nombres actuales
- **Queries en producción:** Strings SQL hardcodeados
- **Frontend en caché:** Componentes con referencias viejas

### 🟡 Riesgos Medios
- **Tests unitarios:** 50+ tests actualizándose
- **Documentación:** Múltiples archivos sincronizados
- **Logs históricos:** Búsquedas por términos viejos

### 🟢 Riesgos Bajos
- **Código nuevo:** Solo cambios de nombres
- **Lógica de negocio:** Sin cambios funcionales

---

## 📋 Checklist de Auditoría Pre-Refactoring

### 🔍 Descubrimiento de Impacto

#### **Schema y Base de Datos**
- [ ] `packages/db/src/schema/messages.ts` - Columnas redactedAt/redactedBy
- [ ] `packages/db/migrations/*` - Migrations previas con estos nombres
- [ ] **Datos existentes:** Verificar cuántos mensajes tienen `redacted_at IS NOT NULL`

#### **Backend Services**
- [ ] `apps/api/src/services/message-deletion.service.ts` - Método `redactMessage()`
- [ ] `apps/api/src/services/message.service.ts` - Referencias a campos
- [ ] `apps/api/src/routes/messages.routes.ts` - Validaciones usando campos viejos

#### **Frontend Components**
- [ ] `apps/web/src/components/chat/MessageBubble.tsx` - Renderizado condicional
- [ ] `apps/web/src/components/chat/ChatView.tsx` - Lógica de UI
- [ ] `apps/web/src/hooks/useChat.ts` - Manejo de estado
- [ ] `apps/web/src/services/api.ts` - Tipos y respuestas

#### **Tests**
- [ ] `apps/api/**/*.test.ts` - Tests de servicios
- [ ] `apps/web/**/*.test.tsx` - Tests de componentes
- [ ] `packages/db/**/*.test.ts` - Tests de schema

#### **Documentación**
- [ ] `PLAN-canonical-message-deletion.md` - Referencias principales
- [ ] `canonical-definitions.md` - Definiciones del sistema
- [ ] `system-flows.md` - Diagramas de flujo
- [ ] `chatcore-components.md` - Descripción de componentes

---

## 🔄 Plan de Refactoring (Fases)

### **Fase 1: Preparación y Backup**

#### **1.1 Backup de Datos**
```sql
-- Crear tabla backup por seguridad
CREATE TABLE messages_redacted_backup AS 
SELECT * FROM messages WHERE redacted_at IS NOT NULL;

-- Contar mensajes afectados
SELECT COUNT(*) FROM messages WHERE redacted_at IS NOT NULL;
-- Resultado esperado: X mensajes
```

#### **1.2 Feature Flag**
```ts
// apps/api/src/config/features.ts
export const FEATURES = {
  USE_NEW_OVERWRITE_TERMINOLOGY: process.env.ENABLE_OVERWRITE_TERMINOLOGY === 'true',
};
```

#### **1.3 Compatibilidad Temporal**
```ts
// message-deletion.service.ts - Transición
const REDACTED_CONTENT = Object.freeze({
  text: 'Este mensaje fue eliminado',
});

const OVERWRITTEN_CONTENT = REDACTED_CONTENT; // Alias temporal

// Método con ambos nombres durante transición
async redactMessage(messageId: string, requesterAccountId: string) {
  return await this.overwriteMessageForAll(messageId, requesterAccountId);
}
```

### **Fase 2: Schema y Base de Datos**

#### **2.1 Migration Principal**
```sql
-- Migration: 048_messages_terminology_cleanup.sql

-- Paso 1: Agregar nuevas columnas (sin datos)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS overwritten_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS overwritten_by TEXT;

-- Paso 2: Migrar datos existentes
UPDATE messages 
SET overwritten_at = redacted_at, 
    overwritten_by = redacted_by
WHERE redacted_at IS NOT NULL;

-- Paso 3: Crear constraint para nuevas columnas
ALTER TABLE messages 
ALTER COLUMN overwritten_at SET NOT NULL DEFAULT NULL,
ALTER COLUMN overwritten_by SET NOT NULL DEFAULT NULL;

-- Paso 4: Índices para nuevas columnas
CREATE INDEX IF NOT EXISTS idx_messages_overwritten_at ON messages(overwritten_at);
CREATE INDEX IF NOT EXISTS idx_messages_overwritten_by ON messages(overwritten_by);
```

#### **2.2 Schema TypeScript**
```ts
// packages/db/src/schema/messages.ts
export const messages = pgTable('messages', {
  // ... otros campos ...
  
  // NUEVAS columnas (reemplazo)
  overwrittenAt: timestamp('overwritten_at', { withTimezone: true }),
  overwrittenBy: text('overwritten_by'),
  
  // ANTIGUAS columnas (mantener por ahora)
  redactedAt: timestamp('redacted_at', { withTimezone: true }),
  redactedBy: text('redacted_by'),
}, (table) => ({
  // ... índices existentes ...
  idxMessagesOverwrittenAt: index('idx_messages_overwritten_at').on(table.overwrittenAt),
  idxMessagesOverwrittenBy: index('idx_messages_overwritten_by').on(table.overwrittenBy),
}));
```

#### **2.3 Tipos Compatibles**
```ts
// packages/db/src/schema/messages.ts
export type MessageSelect = typeof messages.$inferSelect;

// Tipos con ambos campos durante transición
export interface MessageWithLegacyFields extends MessageSelect {
  // Nuevos campos
  overwrittenAt?: Date | null;
  overwrittenBy?: string | null;
  
  // Campos legacy (deprecated)
  redactedAt?: Date | null;
  redactedBy?: string | null;
}
```

### **Fase 3: Backend Services**

#### **3.1 Service Principal**
```ts
// apps/api/src/services/message-deletion.service.ts

// Constantes renombradas
const OVERWRITTEN_CONTENT = Object.freeze({
  text: 'Este mensaje fue eliminado',
});

// Alias para compatibilidad
const REDACTED_CONTENT = OVERWRITTEN_CONTENT;

export class MessageDeletionService {
  // NUEVO método principal
  async overwriteMessageForAll(
    messageId: string,
    requesterAccountId: string,
  ): Promise<OverwriteResult> {
    try {
      const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (!message) {
        return { success: false, reason: 'Message not found' };
      }

      if (message.senderAccountId !== requesterAccountId) {
        return { success: false, reason: 'Only message sender can overwrite their own messages' };
      }

      if (message.overwrittenAt) {
        return { success: false, reason: 'Message already overwritten' };
      }

      // Ventana de tiempo: 60 minutos
      const now = new Date();
      const deadline = new Date(message.createdAt.getTime() + 60 * 60 * 1000);
      if (now > deadline) {
        return { success: false, reason: 'Cannot overwrite message after 60 minutes window' };
      }

      // Sobrescribir contenido y marcar
      const overwrittenAt = new Date();
      await db
        .update(messages)
        .set({
          content: OVERWRITTEN_CONTENT,
          overwrittenAt,
          overwrittenBy: requesterAccountId,
          // Mantener campos legacy por ahora
          redactedAt: overwrittenAt,
          redactedBy: requesterAccountId,
        })
        .where(eq(messages.id, messageId));

      console.log(`[MessageDeletion] Message ${messageId} overwritten by ${requesterAccountId}`);

      return { success: true, overwrittenAt };
    } catch (error) {
      console.error('[MessageDeletion] Error overwriting message:', error);
      return { success: false, reason: 'Internal server error' };
    }
  }

  // MÉTODO LEGACY (redirección)
  async redactMessage(messageId: string, requesterAccountId: string): Promise<RedactionResult> {
    console.warn('[MessageDeletion] DEPRECATED: redactMessage() called, use overwriteMessageForAll()');
    const result = await this.overwriteMessageForAll(messageId, requesterAccountId);
    
    // Convertir resultado al formato legacy
    return {
      success: result.success,
      reason: result.reason,
      redactedAt: result.overwrittenAt,
    };
  }

  // Actualizar otros métodos...
  async canOverwrite(messageId: string): Promise<boolean> {
    const [message] = await db
      .select({ createdAt: messages.createdAt, overwrittenAt: messages.overwrittenAt })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message || message.overwrittenAt) return false;

    const now = new Date();
    const deadline = new Date(message.createdAt.getTime() + 60 * 60 * 1000);
    return now <= deadline;
  }

  // Mantener método legacy por compatibilidad
  async canRedact(messageId: string): Promise<boolean> {
    console.warn('[MessageDeletion] DEPRECATED: canRedact() called, use canOverwrite()');
    return await this.canOverwrite(messageId);
  }
}

// Tipos nuevos
export type OverwriteResult = {
  success: boolean;
  reason?: string;
  overwrittenAt?: Date;
};

// Tipo legacy (deprecated)
export type RedactionResult = OverwriteResult;
```

#### **3.2 Message Service Integration**
```ts
// apps/api/src/services/message.service.ts

async getMessagesByConversationId(conversationId: string, limit = 50, cursor?: Date, viewerActorId?: string) {
  if (viewerActorId) {
    const { messageDeletionService } = await import('./message-deletion.service');
    return await messageDeletionService.getMessagesWithVisibilityFilter(conversationId, viewerActorId, limit, cursor);
  }

  const conditions = [eq(messages.conversationId, conversationId)];
  
  if (cursor) {
    conditions.push(lt(messages.createdAt, cursor));
  }
  
  return await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(messages.createdAt)
    .limit(limit);
}

// Método actualizado con nuevo nombre
async overwriteMessage(
  messageId: string,
  requesterAccountId: string,
  scope: 'self' | 'all' = 'self',
  requesterActorId?: string,
) {
  const { messageDeletionService } = await import('./message-deletion.service');

  const result = await messageDeletionService.deleteMessage(
    messageId,
    requesterAccountId,
    scope,
    requesterActorId,
  );

  if (!result.success) {
    throw new Error(result.reason || 'Failed to process message overwrite');
  }
}

// Mantener método legacy
async deleteMessage(
  messageId: string,
  requesterAccountId: string,
  scope: 'self' | 'all' = 'self',
  requesterActorId?: string,
) {
  console.warn('[MessageService] DEPRECATED: deleteMessage() called, use overwriteMessage()');
  return await this.overwriteMessage(messageId, requesterAccountId, scope, requesterActorId);
}
```

### **Fase 4: API Routes**

#### **4.1 Messages Routes**
```ts
// apps/api/src/routes/messages.routes.ts

.delete(
  '/:id',
  async ({ user, params, query, set }) => {
    // ... validaciones existentes ...

    try {
      const { messageService } = await import('../services/message.service');
      
      // Usar nuevo método
      await messageService.overwriteMessage(
        params.id,
        activeAccountId,
        scope,
        requesterActorId,
      );

      return {
        success: true,
        data: {
          scope,
          action: scope === 'all' ? 'overwritten' : 'hidden',
        },
      };
    } catch (error: any) {
      set.status = 400;
      return { success: false, message: error.message };
    }
  },
  {
    // ... schema existente ...
    detail: { 
      tags: ['Messages'], 
      summary: 'Overwrite message (overwrite for all or hide for self)' 
    },
  }
)
```

### **Fase 5: Frontend**

#### **5.1 Hook Principal**
```ts
// apps/web/src/hooks/useChat.ts

const deleteMessage = useCallback(async (messageId: string, scope: 'self' | 'all' = 'self') => {
  try {
    const response = await fetch(`${API_URL}/messages/${messageId}?scope=${scope}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || 'Failed to overwrite message');
    }

    setMessages(prev => prev.filter(m => m.id !== messageId));
    return true;
  } catch (err: any) {
    console.error('[useChat] overwriteMessage error:', err.message);
    setError(err.message);
    return false;
  }
}, [accountId]);

// Mantener por compatibilidad
const deleteMessageLegacy = deleteMessage; // Alias si necesario
```

#### **5.2 Componente MessageBubble**
```tsx
// apps/web/src/components/chat/MessageBubble.tsx

interface MessageBubbleProps {
  message: Message;
  onDelete: (messageId: string, scope: 'self' | 'all') => void;
  // ... otras props ...
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onDelete, ...props }) => {
  // Determinar si está sobrescrito (nueva lógica)
  const isOverwritten = !!message.overwrittenAt;
  const isRedacted = !!message.redactedAt; // Compatibilidad

  // Renderizado condicional
  if (isOverwritten || isRedacted) {
    return (
      <div className="message-bubble overwritten">
        <span>Este mensaje fue eliminado</span>
      </div>
    );
  }

  // ... resto del componente ...
};
```

### **Fase 6: Tests**

#### **6.1 Tests Actualizados**
```ts
// apps/api/src/services/__tests__/message-deletion.service.test.ts

describe('MessageDeletionService - Overwrite Terminology', () => {
  let service: MessageDeletionService;

  beforeEach(() => {
    service = new MessageDeletionService();
  });

  describe('overwriteMessageForAll', () => {
    it('should overwrite message content successfully', async () => {
      const result = await service.overwriteMessageForAll('msg-1', 'account-1');
      
      expect(result.success).toBe(true);
      expect(result.overwrittenAt).toBeInstanceOf(Date);
    });

    it('should respect 60-minute window', async () => {
      // Crear mensaje de hace 61 minutos
      const oldMessage = createMockMessage({ createdAt: new Date(Date.now() - 61 * 60 * 1000) });
      
      const result = await service.overwriteMessageForAll(oldMessage.id, oldMessage.senderAccountId);
      
      expect(result.success).toBe(false);
      expect(result.reason).toContain('60 minutes window');
    });
  });

  describe('Legacy Compatibility', () => {
    it('should redirect redactMessage to overwriteMessageForAll', async () => {
      const spy = jest.spyOn(service, 'overwriteMessageForAll');
      
      await service.redactMessage('msg-1', 'account-1');
      
      expect(spy).toHaveBeenCalledWith('msg-1', 'account-1');
    });
  });
});
```

### **Fase 7: Documentación**

#### **7.1 Actualización Principal**
```markdown
# PLAN-canonical-message-deletion.md

## Principios del modelo (actualizado)

1. Los mensajes nunca se eliminan físicamente por acción de un actor
2. "Eliminar para todos" = **sobrescribir** contenido (destructivo)
3. "Eliminar para mí" = ocultar por actor (tabla de visibilidad)
4. Las conversaciones se desuscriben, no se eliminan
5. Eliminación física solo cuando no quedan suscriptores (GC del sistema)
6. Toda mutación estructural debe notificarse al Kernel

## Implementación (actualizada)

### Servicios
- `overwriteMessageForAll()` - Sobrescribe contenido para todos
- `hideMessageForActor()` - Oculta mensaje para actor específico
- `OVERWRITTEN_CONTENT` - Contenido predefinido de reemplazo

### Schema
- `overwrittenAt` - Timestamp de sobrescritura
- `overwrittenBy` - Account ID que sobrescribió
```

---

## 🚀 Ejecución del Refactoring

### **Orden de Cambios**

1. **Feature Flag OFF** - Sistema funciona con términos viejos
2. **Agregar columnas nuevas** - Sin afectar funcionamiento
3. **Migrar datos** - Copiar datos viejos a nuevos
4. **Actualizar código** - Usar nuevos términos con feature flag
5. **Feature Flag ON** - Sistema usa nuevos términos
6. **Remover código legacy** - Limpieza final
7. **Eliminar columnas viejas** - Migration final

### **Validación en Cada Paso**

```bash
# Paso 1: Validar datos
SELECT COUNT(*) FROM messages WHERE overwritten_at IS NOT NULL;

# Paso 2: Validar API
curl -X DELETE "http://localhost:3000/messages/msg-1?scope=all"

# Paso 3: Validar Frontend
# Verificar que mensajes sobrescritos se muestren correctamente

# Paso 4: Validar Tests
npm run test -- --testPathPattern=message-deletion
```

---

## 📊 Métricas de Éxito

### **Técnicas**
- [ ] 0 errores en logs después del cambio
- [ ] 100% tests pasando
- [ ] Performance sin degradación (<5% diferencia)

### **Funcionales**
- [ ] Mensajes sobrescritos se muestran como "eliminados"
- [ ] Ventana de 60 minutos funciona
- [ ] Ocultamiento por actor funciona
- [ ] API responde con nuevos nombres

### **Documentación**
- [ ] Todos los documentos actualizados
- [ ] Sin referencias a "redacción" en código nuevo
- [ ] Guía de migración completa

---

## 🔄 Rollback Plan

### **Si algo falla:**

1. **Feature Flag OFF** - Volver a términos viejos
2. **Rollback Migration** - Eliminar columnas nuevas
3. **Restore Backup** - Si datos se corrompieron

### **Comandos de Rollback**

```sql
-- Rollback migration
ALTER TABLE messages 
DROP COLUMN IF EXISTS overwritten_at,
DROP COLUMN IF EXISTS overwritten_by;

-- Restore desde backup si es necesario
DELETE FROM messages WHERE id IN (SELECT id FROM messages_redacted_backup);
INSERT INTO messages SELECT * FROM messages_redacted_backup;
```

---

## 📝 Post-Refactoring

### **Limpieza Final**
```ts
// Eliminar después de 30 días de estabilidad
- Remover métodos legacy (redactMessage, canRedact)
- Eliminar columnas viejas (redactedAt, redactedBy)
- Actualizar todos los tests
- Limpiar documentación legacy
```

### **Monitorización**
```bash
# Monitorear por 30 días
- Logs de "DEPRECATED" methods
- Performance de nuevas columnas
- Errores en frontend
- Quejas de usuarios
```

---

## ✅ Checklist Final de Auditoría

### **Pre-Producción**
- [ ] Todos los tests pasan
- [ ] Migration probada en staging
- [ ] Frontend funciona con nueva API
- [ ] Documentación actualizada
- [ ] Feature flag probado

### **Post-Producción**
- [ ] Sin errores en logs
- [ ] Métricas normales
- [ ] Usuarios sin quejas
- [ ] Tests de humo pasan
- [ ] Backup verificado

### **Cierre**
- [ ] Legacy code removido
- [ ] Columnas viejas eliminadas
- [ ] Documentación finalizada
- [ ] Lecciones aprendidas documentadas

---

## 🎯 Conclusión

Este refactoring elimina la ambigüedad terminológica del sistema, mejorando la comprensión y mantenibilidad del código. El enfoque por fases con feature flags y compatibilidad temporal minimiza riesgos y permite rollback inmediato si surge algún problema.

**Tiempo estimado:** 2-3 días completos
**Riesgo:** Medio (controlado con feature flags)
**Impacto:** Alto (mejora claridad del sistema)
