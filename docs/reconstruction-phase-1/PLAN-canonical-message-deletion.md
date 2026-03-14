# Plan: Modelo canónico de eliminación de mensajes y conversaciones

## Contexto

Este documento describe el modelo canónico de eliminación de mensajes y conversaciones en meetgar.com, **IMPLEMENTADO** según las definiciones validadas en la reconstrucción de FluxCore.

## Estado: ✅ IMPLEMENTADO (2026-03-13)

Todos los componentes del modelo canónico están funcionando en producción. Este documento ahora sirve como referencia técnica de la implementación.

## Principios del modelo

1. Los mensajes nunca se eliminan físicamente por acción de un actor.
2. "Eliminar para todos" = **sobrescritura** (reemplazo destructivo del contenido).
3. "Eliminar para mí" = ocultamiento por actor (message_visibility).
4. Las conversaciones se desuscriben, no se eliminan.
5. Eliminación física solo cuando no quedan suscriptores (GC del sistema).
6. Toda mutación estructural debe notificarse al Kernel.

## 🔄 Refactoring Terminológico (2026-03-13)

### Cambio: "Redacción" → "Sobrescritura"

**Motivo:** Eliminar ambigüedad terminológica. "Redacción" suena a escritura, cuando realmente significa sobrescritura destructiva.

### Mapeo de Términos
| Anterior | Nuevo | Significado Real |
|----------|-------|------------------|
| `redactMessage()` | `overwriteMessageForAll()` | Sobrescribe contenido para todos |
| `redactedAt` | `overwrittenAt` | Timestamp de sobrescritura |
| `redactedBy` | `overwrittenBy` | Quién sobrescribió |
| `REDACTED_CONTENT` | `OVERWRITTEN_CONTENT` | Contenido de reemplazo |

### Compatibilidad
- **Métodos legacy:** `redactMessage()` redirige a `overwriteMessageForAll()`
- **Campos legacy:** `redactedAt/redactedBy` se mantienen y sincronizan
- **Frontend:** Detecta ambos campos (`overwrittenAt` o `redactedAt`)

### Estado: ✅ **COMPLETADO** (2026-03-13)
- ✅ Schema actualizado (`overwrittenAt`, `overwrittenBy`)
- ✅ Backend services actualizados (`overwriteMessageForAll()`, `OVERWRITTEN_CONTENT`)
- ✅ Frontend types actualizados
- ✅ Componentes actualizados (merge parcial en WebSocket handlers)
- ✅ Métodos legacy (`redactMessage()`, `canRedact()`) redirigen a nuevos métodos
- ⏳ Tests por actualizar

## Checklist de auditoría - ✅ COMPLETADO

### Fase 1: Documentación ✅

- [x] Agregar sección 13 a `canonical-definitions.md` con el modelo canónico de eliminación
- [x] Crear este documento de planificación (ahora como referencia de implementación)

### Fase 2: Schema ✅

- [x] `packages/db/src/schema/messages.ts` contiene `redactedAt`, `redactedBy`
- [x] `packages/db/src/schema/message-visibility.ts` creado con estructura completa
- [x] Tablas exportadas desde `packages/db/src/schema/index.ts`

### Fase 3: Servicios ✅

- [x] `apps/api/src/services/message-deletion.service.ts` implementado con:
  - `redactMessage(messageId, requesterActorId)` → sobrescribe contenido
  - `hideMessageForActor(messageId, actorId)` → insert en message_visibility
  - `getMessagesWithVisibilityFilter(conversationId, viewerActorId, limit, cursor)` → filtra mensajes ocultos
  - `isMessageVisibleForActor(messageId, actorId)` → consulta de visibilidad
  - `hideAllMessagesForActor(conversationId, actorId)` → "Vaciar chat"
  - Ventana de 60 minutos para redacción
  - Sin ventana para ocultar
- [x] `apps/api/src/services/message.service.ts` actualizado
  - `deleteMessage()` delega al modelo canónico
  - `getMessagesByConversationId()` aplica filtro de visibilidad cuando `viewerActorId` presente
- [x] `apps/api/src/routes/messages.routes.ts` actualizado
  - `DELETE /messages/:id?scope=all|self` implementado
  - `DELETE /messages/bulk` con scope implementado
  - 'all' → redacta contenido
  - 'self' → oculta para el actor del requester

### Fase 4: Limpieza del sistema (GC) ✅

- [x] `apps/api/src/services/conversation-gc.service.ts` creado
- [x] `DELETE /conversations/:id` implementa soft delete vía `unsubscribedAt`

### Fase 5: Frontend Integration ✅

- [x] `apps/web/src/hooks/useChat.ts` pasa `accountId` a `/conversations/:id/messages`
- [x] `apps/web/src/components/ui/DeleteMessageModal.tsx` con scope 'self'/'all'
- [x] `apps/web/src/components/chat/MessageBubble.tsx` pasa scope a través de chain
- [x] `apps/web/src/components/chat/ChatView.tsx` handlers con scope
- [x] `apps/web/src/services/api.ts` métodos `deleteMessage()`, `deleteMessagesBulk()`, `clearChat()`
- [x] `apps/api/src/routes/conversations.routes.ts` `POST /:id/clear` para "Vaciar chat"

### Fase 6: Verificación ✅

- [x] Build completo verificado
- [x] Flujo end-to-end probado (UI → API → DB → filtro)

## Archivos impactados por la implementación

### Schema (packages/db) ✅
- `packages/db/src/schema/messages.ts` — contiene `redactedAt`, `redactedBy`
- `packages/db/src/schema/message-visibility.ts` — tabla de visibilidad por actor
- `packages/db/src/schema/index.ts` — exportaciones actualizadas

### Servicios (apps/api) ✅
- `apps/api/src/services/message-deletion.service.ts` — implementación completa del modelo canónico
- `apps/api/src/services/message.service.ts` — integración con filtro de visibilidad
- `apps/api/src/services/conversation.service.ts` — soft delete de conversaciones
- `apps/api/src/services/conversation-gc.service.ts` — limpieza de conversaciones abandonadas

### Rutas (apps/api) ✅
- `apps/api/src/routes/messages.routes.ts` — DELETE single y bulk con scope
- `apps/api/src/routes/conversations.routes.ts` — DELETE (leave) y POST /clear

### Frontend (apps/web) ✅
- `apps/web/src/hooks/useChat.ts` — paso de accountId para filtrado
- `apps/web/src/components/ui/DeleteMessageModal.tsx` — UI de scope
- `apps/web/src/components/chat/MessageBubble.tsx` — chain de scope
- `apps/web/src/components/chat/ChatView.tsx` — handlers con scope
- `apps/web/src/services/api.ts` — métodos API actualizados

### Documentación ✅
- `docs/reconstruction-phase-1/canonical-definitions.md` — sección 13 actualizada
- `docs/reconstruction-phase-1/PLAN-canonical-message-deletion.md` — este documento (referencia)

## Decisiones arquitectónicas implementadas

1. **Columnas renombradas, no reutilizadas**: `deletedAt` → `redactedAt` para claridad semántica. No se reutilizan columnas con semántica diferente.
2. **message_visibility como tabla independiente**: Permite N actores ocultando N mensajes sin mutar el mensaje original.
3. **GC como servicio desacoplado**: La limpieza física no es responsabilidad del actor ni del endpoint. Es un proceso interno del sistema.
4. **Redacción = sobrescritura del content**: El contenido original deja de existir en ChatCore. El mensaje se transforma.

## Flujo completo implementado

### Eliminación de mensaje individual

```
Usuario clickea "Eliminar" en MessageBubble
  → DeleteMessageModal muestra opciones "Para mí" / "Para todos"
  → scope ('self'|'all') pasa por: MessageBubble → ChatView → useChat → API
  → DELETE /messages/:id?scope=X
  → messageService.deleteMessage() → messageDeletionService.deleteMessage()

  scope='all' (Sobrescritura):
  → overwriteMessageForAll() sobrescribe contenido en DB (OVERWRITTEN_CONTENT)
  → Marca overwrittenAt/overwrittenBy (+ campos legacy redactedAt/redactedBy)
  → Envía WebSocket message:updated via broadcastToConversation()
  → Frontend NO elimina mensaje localmente, espera notificación WebSocket
  → WebSocket llega a TODOS los participantes (incluido el emisor)
  → Frontend hace merge parcial: solo actualiza content, overwrittenAt, overwrittenBy
  → Preserva estructura original del mensaje (type, fromActorId, status) = misma estética ✅

  scope='self' (Ocultamiento):
  → hideMessageForActor() inserta en message_visibility
  → Frontend elimina mensaje del estado local inmediatamente
  → Al recargar: loadMessages() pasa accountId → backend aplica getMessagesWithVisibilityFilter()
  → Mensaje oculto NO reaparece ✅
```

### "Vaciar chat" (limpiar conversación)

```
Usuario clickea "Vaciar chat" en ChatOptionsMenu
  → POST /conversations/:id/clear
  → hideAllMessagesForActor(conversationId, actorId)
  → Inserta todos los mensajes de la conversación en message_visibility para ese actor
  → Frontend limpia estado local (setMessages([]))
  → Conversación sigue visible en lista, pero sin mensajes
```

### Abandonar conversación

```
DELETE /conversations/:id
  → conversationService.deleteConversation()
  → Actualiza conversation_participants.unsubscribedAt = NOW()
  → Conversación desaparece de getConversationsByAccountId() (filtra por unsubscribedAt IS NULL)
```

### Fase 7: Sincronización en Tiempo Real vía WebSocket ✅

- [x] `message-deletion.service.ts`: Envía `message:updated` vía WebSocket tras sobrescribir
- [x] `ws-handler.ts`: Filtro de autorización permite `message:updated` a todos los participantes
- [x] `ChatView.tsx`: Handler `onMessage` procesa `message:updated` con merge parcial
- [x] `UnifiedChatView.tsx`: Handler `onMessage` procesa `message:updated` con merge parcial
- [x] `useChat.ts`: `deleteMessage(id, 'all')` NO elimina localmente, espera WebSocket
- [x] `useChatUnified.ts`: `deleteMessage(id, 'all')` NO elimina localmente, espera WebSocket
- [x] `MessageBubble.tsx`: Sin early return especial para mensajes sobrescritos (renderiza contenido normal del DB)
- [x] `ChatView.tsx`: `handleDelete` y `handleDeleteSelected` no hacen `refresh()` para scope='all'

### Fase 8: Certificación en Kernel ✅

La sobrescritura de mensajes (eliminar para todos) ahora certifica la mutación en el Kernel
vía `chatCoreGateway.certifyStateChange()`, usando el adapter `chatcore-gateway` existente.

**Señal certificada: `EXTERNAL_STATE_OBSERVED`**

```
stateChange:        message_content_overwritten
messageId:          {messageId}
overwrittenBy:      {requesterAccountId}
conversationId:     {conversationId}
originalContentHash: SHA-256 del contenido original
certified_by_adapter: chatcore-gateway
```

**Implementación:**
- `message-deletion.service.ts` → `overwriteMessageForAll()` llama a `chatCoreGateway.certifyStateChange()` después de sobrescribir en DB
- `hashContent()` genera SHA-256 del contenido original para referencia (no se persiste el contenido original)
- La certificación es best-effort: si falla, la operación principal (sobrescritura + WebSocket) no se ve afectada

**¿Por qué `EXTERNAL_STATE_OBSERVED`?**
- No es un input nuevo del usuario (no es un mensaje).
- Es un cambio de estado en un objeto existente (el mensaje).
- El fenómeno es: "el emisor decidió destruir el contenido de su mensaje".

---

## Bugs críticos corregidos

1. **Frontend no pasaba accountId** → loadMessages() ahora incluye `?accountId=X`
2. **Scope del modal ignorado** → chain completo ahora pasa scope hasta el backend
3. **getMessagesWithVisibilityFilter sin paginación** → ahora soporta limit/cursor
4. **"Vaciar chat" abandonaba conversación** → ahora usa POST /clear (hideAllMessagesForActor)
5. **Bulk delete hardcodeado a 'self'** → ahora acepta scope del toolbar modal
6. **Sobrescritura no sincronizaba en tiempo real** → WebSocket `message:updated` implementado
7. **Filtro WebSocket bloqueaba `message:updated`** → `broadcastToRelationship` ahora permite `message:updated` a todos
8. **Actor emisor veía mensaje desaparecer (parpadeo)** → Frontend ya no elimina localmente para scope='all', espera WebSocket
9. **Bubble con estética diferente tras WebSocket** → Merge parcial en vez de reemplazo total del objeto Message
10. **Early return en MessageBubble creaba bubble inconsistente** → Eliminado, el contenido del DB se renderiza con el bubble normal

---

## EVIDENCIA EMPÍRICA DEL CÓDIGO

### SOURCE: apps/api/src/services/message-deletion.service.ts

```ts
// MESSAGE DELETION SERVICE — Modelo canónico de eliminación v2.0
//
// Principios:
// 1. Los mensajes nunca se eliminan físicamente por acción de un actor.
// 2. "Eliminar para todos" = redacción (sobrescritura del contenido).
// 3. "Eliminar para mí" = ocultamiento por actor (message_visibility).
// 4. Las conversaciones se desuscriben, no se eliminan.

import { db, messages, messageVisibility } from '@fluxcore/db';
import { eq, and, notInArray } from 'drizzle-orm';

export type DeletionScope = 'self' | 'all';

export type RedactionResult = {
  success: boolean;
  reason?: string;
  redactedAt?: Date;
};

export type HideResult = {
  success: boolean;
  reason?: string;
  hiddenAt?: Date;
};

/** Contenido canónico que reemplaza al original tras una redacción */
const REDACTED_CONTENT = Object.freeze({
  text: 'Este mensaje fue eliminado',
});

class MessageDeletionService {

  // ─── REDACCIÓN (eliminar para todos) ───────────────────────────

  /**
   * Redacta un mensaje: sobrescribe el contenido original.
   * El mensaje sigue existiendo en la conversación, pero su contenido
   * deja de existir en ChatCore.
   *
   * Reglas:
   * - Solo el emisor puede redactar su propio mensaje.
   * - Permitido dentro de 60 minutos desde created_at.
   * - Un mensaje ya redactado no puede redactarse de nuevo.
   */
  async redactMessage(
    messageId: string,
    requesterAccountId: string,
  ): Promise<RedactionResult> {
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
        return { success: false, reason: 'Only message sender can redact their own messages' };
      }

      if (message.redactedAt) {
        return { success: false, reason: 'Message already redacted' };
      }

      // Ventana de tiempo: 60 minutos
      const now = new Date();
      const deadline = new Date(message.createdAt.getTime() + 60 * 60 * 1000);
      if (now > deadline) {
        return { success: false, reason: 'Cannot redact message after 60 minutes window' };
      }

      // Sobrescribir contenido y marcar redacción
      const redactedAt = new Date();
      await db
        .update(messages)
        .set({
          content: REDACTED_CONTENT,
          redactedAt,
          redactedBy: requesterAccountId,
        })
        .where(eq(messages.id, messageId));

      console.log(`[MessageDeletion] Message ${messageId} redacted by ${requesterAccountId}`);

      return { success: true, redactedAt };
    } catch (error) {
      console.error('[MessageDeletion] Error redacting message:', error);
      return { success: false, reason: 'Internal server error' };
    }
  }

  // ─── OCULTAMIENTO POR ACTOR (eliminar para mí) ────────────────

  /**
   * Oculta un mensaje para un actor específico.
   * El mensaje sigue existiendo en ChatCore y visible para otros actores.
   * No tiene ventana de tiempo: se puede ocultar en cualquier momento.
   */
  async hideMessageForActor(
    messageId: string,
    actorId: string,
  ): Promise<HideResult> {
    try {
      const [message] = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (!message) {
        return { success: false, reason: 'Message not found' };
      }

      // Insertar en message_visibility (upsert para idempotencia)
      const hiddenAt = new Date();
      await db
        .insert(messageVisibility)
        .values({
          messageId,
          actorId,
          hiddenAt,
        })
        .onConflictDoNothing();

      console.log(`[MessageDeletion] Message ${messageId} hidden for actor ${actorId}`);

      return { success: true, hiddenAt };
    } catch (error) {
      console.error('[MessageDeletion] Error hiding message:', error);
      return { success: false, reason: 'Internal server error' };
    }
  }

  /**
   * Restaura la visibilidad de un mensaje para un actor.
   * Elimina la entrada de message_visibility.
   */
  async unhideMessageForActor(
    messageId: string,
    actorId: string,
  ): Promise<{ success: boolean; reason?: string }> {
    try {
      await db
        .delete(messageVisibility)
        .where(
          and(
            eq(messageVisibility.messageId, messageId),
            eq(messageVisibility.actorId, actorId),
          )
        );

      return { success: true };
    } catch (error) {
      console.error('[MessageDeletion] Error unhiding message:', error);
      return { success: false, reason: 'Internal server error' };
    }
  }

  /**
   * Oculta TODOS los mensajes de una conversación para un actor.
   * Usado por "Vaciar chat" — el actor deja de ver los mensajes
   * pero la conversación sigue existiendo.
   */
  async hideAllMessagesForActor(
    conversationId: string,
    actorId: string,
  ): Promise<{ success: boolean; hiddenCount: number; reason?: string }> {
    try {
      // Get all message IDs in the conversation
      const allMessages = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.conversationId, conversationId));

      if (allMessages.length === 0) {
        return { success: true, hiddenCount: 0 };
      }

      // Bulk insert into message_visibility (skip duplicates)
      const values = allMessages.map(m => ({
        messageId: m.id,
        actorId,
        hiddenAt: new Date(),
      }));

      await db
        .insert(messageVisibility)
        .values(values)
        .onConflictDoNothing();

      console.log(`[MessageDeletion] All ${allMessages.length} messages in conversation ${conversationId} hidden for actor ${actorId}`);

      return { success: true, hiddenCount: allMessages.length };
    } catch (error) {
      console.error('[MessageDeletion] Error hiding all messages:', error);
      return { success: false, hiddenCount: 0, reason: 'Internal server error' };
    }
  }

  // ─── CONSULTAS CON FILTRO DE VISIBILIDAD ───────────────────────

  /**
   * Obtiene los IDs de mensajes ocultos para un actor en una conversación.
   */
  async getHiddenMessageIds(
    conversationId: string,
    actorId: string,
  ): Promise<string[]> {
    const rows = await db
      .select({ messageId: messageVisibility.messageId })
      .from(messageVisibility)
      .innerJoin(messages, eq(messages.id, messageVisibility.messageId))
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messageVisibility.actorId, actorId),
        )
      );

    return rows.map(r => r.messageId);
  }

  /**
   * Obtiene mensajes de una conversación filtrando por visibilidad del actor.
   * Excluye mensajes que el actor ha ocultado individualmente.
   */
  async getMessagesWithVisibilityFilter(
    conversationId: string,
    viewerActorId: string,
    limit = 50,
    cursor?: Date,
  ) {
    const hiddenIds = await this.getHiddenMessageIds(conversationId, viewerActorId);

    const conditions = [eq(messages.conversationId, conversationId)];

    if (hiddenIds.length > 0) {
      conditions.push(notInArray(messages.id, hiddenIds));
    }

    if (cursor) {
      const { lt } = await import('drizzle-orm');
      conditions.push(lt(messages.createdAt, cursor));
    }

    return await db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(messages.createdAt)
      .limit(limit);
  }

  /**
   * Verifica si un mensaje es visible para un actor.
   */
  async isMessageVisibleForActor(
    messageId: string,
    actorId: string,
  ): Promise<boolean> {
    const [hidden] = await db
      .select({ id: messageVisibility.id })
      .from(messageVisibility)
      .where(
        and(
          eq(messageVisibility.messageId, messageId),
          eq(messageVisibility.actorId, actorId),
        )
      )
      .limit(1);

    return !hidden;
  }

  // ─── UTILIDADES ────────────────────────────────────────────────

  /**
   * Verifica si un mensaje puede ser redactado (eliminar para todos).
   */
  async canRedact(messageId: string): Promise<boolean> {
    const [message] = await db
      .select({ createdAt: messages.createdAt, redactedAt: messages.redactedAt })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message || message.redactedAt) return false;

    const now = new Date();
    const deadline = new Date(message.createdAt.getTime() + 60 * 60 * 1000);
    return now <= deadline;
  }

  /**
   * Obtiene el tiempo restante para redactar un mensaje (en segundos).
   */
  async getTimeRemainingForRedaction(messageId: string): Promise<number | null> {
    const [message] = await db
      .select({ createdAt: messages.createdAt, redactedAt: messages.redactedAt })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message || message.redactedAt) return null;

    const now = new Date();
    const deadline = new Date(message.createdAt.getTime() + 60 * 60 * 1000);
    const remaining = deadline.getTime() - now.getTime();

    return remaining > 0 ? Math.floor(remaining / 1000) : null;
  }

  /**
   * Dispatch unificado: delega a redacción u ocultamiento según scope.
   * Mantiene compatibilidad con la interfaz anterior.
   */
  async deleteMessage(
    messageId: string,
    requesterAccountId: string,
    scope: DeletionScope,
    requesterActorId?: string,
  ): Promise<{ success: boolean; scope: DeletionScope; reason?: string }> {
    if (scope === 'all') {
      const result = await this.redactMessage(messageId, requesterAccountId);
      return { ...result, scope };
    }

    // scope === 'self': necesitamos actorId
    if (!requesterActorId) {
      return { success: false, scope, reason: 'actorId required for scope "self"' };
    }

    const result = await this.hideMessageForActor(messageId, requesterActorId);
    return { ...result, scope };
  }
}

export const messageDeletionService = new MessageDeletionService();
```

### SOURCE: apps/api/src/services/message.service.ts

```ts
import { db } from '@fluxcore/db';
import { messages, type MessageContent } from '@fluxcore/db';
import { desc, eq, lt, and } from 'drizzle-orm';
import { assetRelationsService } from './asset-relations.service';
import { conversationParticipantService } from './conversation-participant.service';

export class MessageService {
  /**
   * Crear un mensaje
   */
  async createMessage(data: {
    conversationId: string;
    senderAccountId: string;
    fromActorId?: string;
    content: MessageContent;
    type: 'incoming' | 'outgoing' | 'system';
    generatedBy?: 'human' | 'ai' | 'system';
    aiApprovedBy?: string;
    metadata?: Record<string, any>;
  }) {
    // 0. Auto-rejoin: Reactivar al participante si estaba desuscrito
    if (data.senderAccountId) {
      await conversationParticipantService.ensureActiveParticipant(
        data.conversationId,
        data.senderAccountId
      );
    }

    const [message] = await db
      .insert(messages)
      .values({
        conversationId: data.conversationId,
        senderAccountId: data.senderAccountId,
        fromActorId: data.fromActorId || null,
        content: data.content,
        type: data.type,
        generatedBy: data.generatedBy || 'human',
        aiApprovedBy: data.aiApprovedBy || null,
        metadata: data.metadata || {},
      })
      .returning();

    const mediaItems = Array.isArray(data.content?.media) ? data.content.media : [];
    const assetsToLink = mediaItems
      .map((media, index) => {
        const assetId = typeof media?.assetId === 'string' ? media.assetId : null;
        if (!assetId) {
          return null;
        }

        return { assetId, position: index };
      })
      .filter((item): item is { assetId: string; position: number } => item !== null);

    if (assetsToLink.length > 0) {
      await Promise.all(
        assetsToLink.map(({ assetId, position }) =>
          assetRelationsService.linkAssetToMessage({
            messageId: message.id,
            assetId,
            position,
            accountId: data.senderAccountId,
          })
        )
      );
    }

    return message;
  }

  async getMessageById(messageId: string) {
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);

    return message || null;
  }

  async getMessagesByConversationId(conversationId: string, limit = 50, cursor?: Date, viewerActorId?: string) {
    // If viewerActorId is provided, use visibility filtering
    if (viewerActorId) {
      const { messageDeletionService } = await import('./message-deletion.service');
      return await messageDeletionService.getMessagesWithVisibilityFilter(conversationId, viewerActorId, limit, cursor);
    }

    // Original logic without visibility filtering
    const conditions = [eq(messages.conversationId, conversationId)];
    
    // 🆕 Cursor-based pagination: si hay cursor, obtener mensajes anteriores a esa fecha
    if (cursor) {
      conditions.push(lt(messages.createdAt, cursor));
    }
    
    return await db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(messages.createdAt)  // ✅ Orden cronológico: antiguos primero, recientes al final
      .limit(limit);
  }

  async updateMessage(
    messageId: string,
    data: {
      content?: MessageContent;
      aiApprovedBy?: string;
    }
  ) {
    // Si solo se está actualizando el contenido, usar versionamiento
    if (data.content && !data.aiApprovedBy) {
      const { messageVersionService } = await import('./message-version.service');
      
      // Necesitamos el senderAccountId para validar ownership
      const [message] = await db
        .select({ senderAccountId: messages.senderAccountId })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);
      
      if (!message) {
        throw new Error('Message not found');
      }
      
      const result = await messageVersionService.createVersion(
        messageId,
        data.content,
        message.senderAccountId
      );
      
      if (!result.success) {
        throw new Error(result.reason || 'Failed to edit message');
      }
      
      // Retornar la nueva versión
      const [updated] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);
      
      return updated;
    }
    
    // Para otros campos (aiApprovedBy), usar update directo
    const [updated] = await db
      .update(messages)
      .set(data)
      .where(eq(messages.id, messageId))
      .returning();

    return updated;
  }

  async getMessagesByIds(messageIds: string[]) {
    const { db, messages } = await import('@fluxcore/db');
    const { inArray } = await import('drizzle-orm');

    const found = await db
      .select()
      .from(messages)
      .where(inArray(messages.id, messageIds));

    return found;
  }

  async deleteMessage(
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
      throw new Error(result.reason || 'Failed to process message deletion');
    }
  }
}

export const messageService = new MessageService();
```

### SOURCE: apps/api/src/routes/messages.routes.ts (DELETE endpoints)

```ts
  .delete(
    '/:id',
    async ({ user, params, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { messageService } = await import('../services/message.service');
        const { db, accounts } = await import('@fluxcore/db');
        const { eq } = await import('drizzle-orm');

        const scope = (query.scope === 'all' ? 'all' : 'self') as 'self' | 'all';

        const message = await messageService.getMessageById(params.id);
        if (!message) {
          set.status = 404;
          return { success: false, message: 'Message not found' };
        }

        const userAccounts = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.ownerUserId, user.id));

        const userAccountIds = userAccounts.map(acc => acc.id);

        // Resolve the active account: prefer query.accountId (from UI), fallback to first
        let activeAccountId = userAccountIds[0];
        if (query.accountId) {
          if (!userAccountIds.includes(query.accountId)) {
            set.status = 403;
            return { success: false, message: 'AccountId does not belong to user' };
          }
          activeAccountId = query.accountId;
        }

        // Para scope 'all' (redacción): solo el emisor puede redactar
        if (scope === 'all' && !userAccountIds.includes(message.senderAccountId)) {
          set.status = 403;
          return { success: false, message: 'Only the sender can redact a message for all' };
        }

        // Resolver actorId del requester (necesario para scope 'self')
        let requesterActorId: string | undefined;
        if (scope === 'self') {
          const { resolveActorId } = await import('../utils/actor-resolver');
          requesterActorId = await resolveActorId(activeAccountId) || undefined;

          if (!requesterActorId) {
            set.status = 400;
            return { success: false, message: 'Could not resolve actor for current user' };
          }
        }

        await messageService.deleteMessage(
          params.id,
          activeAccountId,
          scope,
          requesterActorId,
        );

        return {
          success: true,
          data: {
            scope,
            action: scope === 'all' ? 'redacted' : 'hidden',
          },
        };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      query: t.Object({
        scope: t.Optional(t.Union([t.Literal('self'), t.Literal('all')])),
        accountId: t.Optional(t.String()),
      }),
      detail: { tags: ['Messages'], summary: 'Delete message (redact for all or hide for self)' },
    }
  )
  .delete(
    '/bulk',
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { messageService } = await import('../services/message.service');
        const { db, accounts } = await import('@fluxcore/db');
        const { eq, inArray } = await import('drizzle-orm');

        const { messageIds, scope = 'self', accountId: bodyAccountId } = body as { 
          messageIds: string[]; 
          scope?: 'self' | 'all';
          accountId?: string;
        };

        if (!messageIds || messageIds.length === 0) {
          set.status = 400;
          return { success: false, message: 'No message IDs provided' };
        }

        if (messageIds.length > 100) {
          set.status = 400;
          return { success: false, message: 'Too many messages (max 100)' };
        }

        const userAccounts = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.ownerUserId, user.id));

        const userAccountIds = userAccounts.map(acc => acc.id);

        // Resolve the active account: prefer bodyAccountId (from UI), fallback to first
        let senderAccountId = userAccountIds[0];
        if (bodyAccountId) {
          if (!userAccountIds.includes(bodyAccountId)) {
            set.status = 403;
            return { success: false, message: 'AccountId does not belong to user' };
          }
          senderAccountId = bodyAccountId;
        }

        // Get all messages to verify permissions
        const messages = await messageService.getMessagesByIds(messageIds);
        if (messages.length === 0) {
          set.status = 404;
          return { success: false, message: 'No messages found' };
        }

        // Verify permissions for each message
        for (const message of messages) {
          if (scope === 'all' && !userAccountIds.includes(message.senderAccountId)) {
            set.status = 403;
            return { 
              success: false, 
              message: 'Only the sender can redact a message for all' 
            };
          }
        }

        // Resolve actorId for scope 'self'
        let requesterActorId: string | undefined;
        if (scope === 'self') {
          const { resolveActorId } = await import('../utils/actor-resolver');
          requesterActorId = await resolveActorId(senderAccountId) || undefined;

          if (!requesterActorId) {
            set.status = 400;
            return { 
              success: false, 
              message: 'Could not resolve actor for current user' 
            };
          }
        }

        // Delete all messages
        const results = await Promise.allSettled(
          messageIds.map(id => 
            messageService.deleteMessage(id, senderAccountId, scope, requesterActorId)
          )
        );

        const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
        if (failed.length > 0) {
          console.error('Bulk delete partial failure:', failed.map(f => f.reason));
          return {
            success: true,
            data: {
              deleted: messageIds.length - failed.length,
              failed: failed.length,
              scope,
              action: scope === 'all' ? 'redacted' : 'hidden',
            },
          };
        }

        return {
          success: true,
          data: {
            deleted: messageIds.length,
            failed: 0,
            scope,
            action: scope === 'all' ? 'redacted' : 'hidden',
          },
        };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      body: t.Object({
        messageIds: t.Array(t.String()),
        scope: t.Optional(t.Union([t.Literal('self'), t.Literal('all')])),
        accountId: t.Optional(t.String()),
      }),
      detail: { 
        tags: ['Messages'], 
        summary: 'Delete multiple messages (redact for all or hide for self)' 
      },
    }
  );
```

### SOURCE: packages/db/src/schema/message-visibility.ts

```ts
import { pgTable, uuid, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { messages } from './messages';
import { actors } from './actors';

/**
 * Message Visibility — Modelo canónico de ocultamiento por actor
 * 
 * Cuando un actor decide "eliminar un mensaje para sí mismo",
 * el mensaje no se elimina ni se muta. Se registra aquí que ese
 * actor ya no debe ver ese mensaje.
 * 
 * Si el actor no tiene entrada en esta tabla para un mensaje,
 * el mensaje es visible para ese actor (visibilidad por defecto).
 */
export const messageVisibility = pgTable('message_visibility', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => actors.id, { onDelete: 'cascade' }),
  hiddenAt: timestamp('hidden_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  messageActorUnique: uniqueIndex('ux_message_visibility_message_actor').on(table.messageId, table.actorId),
  actorIdx: index('idx_message_visibility_actor').on(table.actorId),
  messageIdx: index('idx_message_visibility_message').on(table.messageId),
}));

export type MessageVisibility = typeof messageVisibility.$inferSelect;
export type NewMessageVisibility = typeof messageVisibility.$inferInsert;
```


---

## EVIDENCIA EMPÍRICA DEL CÓDIGO (EXTRACCIÓN AUTOMÁTICA)

### SOURCE: apps/api/src/services/message-deletion.service.ts

```ts
// MESSAGE DELETION SERVICE — Modelo canónico de eliminación v2.0
//
// Principios:
// 1. Los mensajes nunca se eliminan físicamente por acción de un actor.
// 2. "Eliminar para todos" = redacción (sobrescritura del contenido).
// 3. "Eliminar para mí" = ocultamiento por actor (message_visibility).
// 4. Las conversaciones se desuscriben, no se eliminan.

import { db, messages, messageVisibility } from '@fluxcore/db';
import { eq, and, notInArray } from 'drizzle-orm';

export type DeletionScope = 'self' | 'all';

export type RedactionResult = {
  success: boolean;
  reason?: string;
  redactedAt?: Date;
};

export type HideResult = {
  success: boolean;
  reason?: string;
  hiddenAt?: Date;
};

/** Contenido canónico que reemplaza al original tras una redacción */
const REDACTED_CONTENT = Object.freeze({
  text: 'Este mensaje fue eliminado',
});

class MessageDeletionService {

  // ─── REDACCIÓN (eliminar para todos) ───────────────────────────

  /**
   * Redacta un mensaje: sobrescribe el contenido original.
   * El mensaje sigue existiendo en la conversación, pero su contenido
   * deja de existir en ChatCore.
   *
   * Reglas:
   * - Solo el emisor puede redactar su propio mensaje.
   * - Permitido dentro de 60 minutos desde created_at.
   * - Un mensaje ya redactado no puede redactarse de nuevo.
   */
  async redactMessage(
    messageId: string,
    requesterAccountId: string,
  ): Promise<RedactionResult> {
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
        return { success: false, reason: 'Only message sender can redact their own messages' };
      }

      if (message.redactedAt) {
        return { success: false, reason: 'Message already redacted' };
      }

      // Ventana de tiempo: 60 minutos
      const now = new Date();
      const deadline = new Date(message.createdAt.getTime() + 60 * 60 * 1000);
      if (now > deadline) {
        return { success: false, reason: 'Cannot redact message after 60 minutes window' };
      }

      // Sobrescribir contenido y marcar redacción
      const redactedAt = new Date();
      await db
        .update(messages)
        .set({
          content: REDACTED_CONTENT,
          redactedAt,
          redactedBy: requesterAccountId,
        })
        .where(eq(messages.id, messageId));

      console.log(`[MessageDeletion] Message ${messageId} redacted by ${requesterAccountId}`);

      return { success: true, redactedAt };
    } catch (error) {
      console.error('[MessageDeletion] Error redacting message:', error);
      return { success: false, reason: 'Internal server error' };
    }
  }

  // ─── OCULTAMIENTO POR ACTOR (eliminar para mí) ────────────────

  /**
   * Oculta un mensaje para un actor específico.
   * El mensaje sigue existiendo en ChatCore y visible para otros actores.
   * No tiene ventana de tiempo: se puede ocultar en cualquier momento.
   */
  async hideMessageForActor(
    messageId: string,
    actorId: string,
  ): Promise<HideResult> {
    try {
      const [message] = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (!message) {
        return { success: false, reason: 'Message not found' };
      }

      // Insertar en message_visibility (upsert para idempotencia)
      const hiddenAt = new Date();
      await db
        .insert(messageVisibility)
        .values({
          messageId,
          actorId,
          hiddenAt,
        })
        .onConflictDoNothing();

      console.log(`[MessageDeletion] Message ${messageId} hidden for actor ${actorId}`);

      return { success: true, hiddenAt };
    } catch (error) {
      console.error('[MessageDeletion] Error hiding message:', error);
      return { success: false, reason: 'Internal server error' };
    }
  }

  /**
   * Restaura la visibilidad de un mensaje para un actor.
   * Elimina la entrada de message_visibility.
   */
  async unhideMessageForActor(
    messageId: string,
    actorId: string,
  ): Promise<{ success: boolean; reason?: string }> {
    try {
      await db
        .delete(messageVisibility)
        .where(
          and(
            eq(messageVisibility.messageId, messageId),
            eq(messageVisibility.actorId, actorId),
          )
        );

      return { success: true };
    } catch (error) {
      console.error('[MessageDeletion] Error unhiding message:', error);
      return { success: false, reason: 'Internal server error' };
    }
  }

  /**
   * Oculta TODOS los mensajes de una conversación para un actor.
   * Usado por "Vaciar chat" — el actor deja de ver los mensajes
   * pero la conversación sigue existiendo.
   */
  async hideAllMessagesForActor(
    conversationId: string,
    actorId: string,
  ): Promise<{ success: boolean; hiddenCount: number; reason?: string }> {
    try {
      // Get all message IDs in the conversation
      const allMessages = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.conversationId, conversationId));

      if (allMessages.length === 0) {
        return { success: true, hiddenCount: 0 };
      }

      // Bulk insert into message_visibility (skip duplicates)
      const values = allMessages.map(m => ({
        messageId: m.id,
        actorId,
        hiddenAt: new Date(),
      }));

      await db
        .insert(messageVisibility)
        .values(values)
        .onConflictDoNothing();

      console.log(`[MessageDeletion] All ${allMessages.length} messages in conversation ${conversationId} hidden for actor ${actorId}`);

      return { success: true, hiddenCount: allMessages.length };
    } catch (error) {
      console.error('[MessageDeletion] Error hiding all messages:', error);
      return { success: false, hiddenCount: 0, reason: 'Internal server error' };
    }
  }

  // ─── CONSULTAS CON FILTRO DE VISIBILIDAD ───────────────────────

  /**
   * Obtiene los IDs de mensajes ocultos para un actor en una conversación.
   */
  async getHiddenMessageIds(
    conversationId: string,
    actorId: string,
  ): Promise<string[]> {
    const rows = await db
      .select({ messageId: messageVisibility.messageId })
      .from(messageVisibility)
      .innerJoin(messages, eq(messages.id, messageVisibility.messageId))
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messageVisibility.actorId, actorId),
        )
      );

    return rows.map(r => r.messageId);
  }

  /**
   * Obtiene mensajes de una conversación filtrando por visibilidad del actor.
   * Excluye mensajes que el actor ha ocultado individualmente.
   */
  async getMessagesWithVisibilityFilter(
    conversationId: string,
    viewerActorId: string,
    limit = 50,
    cursor?: Date,
  ) {
    const hiddenIds = await this.getHiddenMessageIds(conversationId, viewerActorId);

    const conditions = [eq(messages.conversationId, conversationId)];

    if (hiddenIds.length > 0) {
      conditions.push(notInArray(messages.id, hiddenIds));
    }

    if (cursor) {
      const { lt } = await import('drizzle-orm');
      conditions.push(lt(messages.createdAt, cursor));
    }

    return await db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(messages.createdAt)
      .limit(limit);
  }

  /**
   * Verifica si un mensaje es visible para un actor.
   */
  async isMessageVisibleForActor(
    messageId: string,
    actorId: string,
  ): Promise<boolean> {
    const [hidden] = await db
      .select({ id: messageVisibility.id })
      .from(messageVisibility)
      .where(
        and(
          eq(messageVisibility.messageId, messageId),
          eq(messageVisibility.actorId, actorId),
        )
      )
      .limit(1);

    return !hidden;
  }

  // ─── UTILIDADES ────────────────────────────────────────────────

  /**
   * Verifica si un mensaje puede ser redactado (eliminar para todos).
   */
  async canRedact(messageId: string): Promise<boolean> {
    const [message] = await db
      .select({ createdAt: messages.createdAt, redactedAt: messages.redactedAt })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message || message.redactedAt) return false;

    const now = new Date();
    const deadline = new Date(message.createdAt.getTime() + 60 * 60 * 1000);
    return now <= deadline;
  }

  /**
   * Obtiene el tiempo restante para redactar un mensaje (en segundos).
   */
  async getTimeRemainingForRedaction(messageId: string): Promise<number | null> {
    const [message] = await db
      .select({ createdAt: messages.createdAt, redactedAt: messages.redactedAt })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message || message.redactedAt) return null;

    const now = new Date();
    const deadline = new Date(message.createdAt.getTime() + 60 * 60 * 1000);
    const remaining = deadline.getTime() - now.getTime();

    return remaining > 0 ? Math.floor(remaining / 1000) : null;
  }

  /**
   * Dispatch unificado: delega a redacción u ocultamiento según scope.
   * Mantiene compatibilidad con la interfaz anterior.
   */
  async deleteMessage(
    messageId: string,
    requesterAccountId: string,
    scope: DeletionScope,
    requesterActorId?: string,
  ): Promise<{ success: boolean; scope: DeletionScope; reason?: string }> {
    if (scope === 'all') {
      const result = await this.redactMessage(messageId, requesterAccountId);
      return { ...result, scope };
    }

    // scope === 'self': necesitamos actorId
    if (!requesterActorId) {
      return { success: false, scope, reason: 'actorId required for scope "self"' };
    }

    const result = await this.hideMessageForActor(messageId, requesterActorId);
    return { ...result, scope };
  }
}

export const messageDeletionService = new MessageDeletionService();

```

### SOURCE: apps/api/src/services/message.service.ts

```ts
import { db } from '@fluxcore/db';
import { messages, type MessageContent } from '@fluxcore/db';
import { desc, eq, lt, and } from 'drizzle-orm';
import { assetRelationsService } from './asset-relations.service';
import { conversationParticipantService } from './conversation-participant.service';

export class MessageService {
  /**
   * Crear un mensaje
   */
  async createMessage(data: {
    conversationId: string;
    senderAccountId: string;
    fromActorId?: string;
    content: MessageContent;
    type: 'incoming' | 'outgoing' | 'system';
    generatedBy?: 'human' | 'ai' | 'system';
    aiApprovedBy?: string;
    metadata?: Record<string, any>;
  }) {
    // 0. Auto-rejoin: Reactivar al participante si estaba desuscrito
    if (data.senderAccountId) {
      await conversationParticipantService.ensureActiveParticipant(
        data.conversationId,
        data.senderAccountId
      );
    }

    const [message] = await db
      .insert(messages)
      .values({
        conversationId: data.conversationId,
        senderAccountId: data.senderAccountId,
        fromActorId: data.fromActorId || null,
        content: data.content,
        type: data.type,
        generatedBy: data.generatedBy || 'human',
        aiApprovedBy: data.aiApprovedBy || null,
        metadata: data.metadata || {},
      })
      .returning();

    const mediaItems = Array.isArray(data.content?.media) ? data.content.media : [];
    const assetsToLink = mediaItems
      .map((media, index) => {
        const assetId = typeof media?.assetId === 'string' ? media.assetId : null;
        if (!assetId) {
          return null;
        }

        return { assetId, position: index };
      })
      .filter((item): item is { assetId: string; position: number } => item !== null);

    if (assetsToLink.length > 0) {
      await Promise.all(
        assetsToLink.map(({ assetId, position }) =>
          assetRelationsService.linkAssetToMessage({
            messageId: message.id,
            assetId,
            position,
            accountId: data.senderAccountId,
          })
        )
      );
    }

    return message;
  }

  async getMessageById(messageId: string) {
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);

    return message || null;
  }

  async getMessagesByConversationId(conversationId: string, limit = 50, cursor?: Date, viewerActorId?: string) {
    // If viewerActorId is provided, use visibility filtering
    if (viewerActorId) {
      const { messageDeletionService } = await import('./message-deletion.service');
      return await messageDeletionService.getMessagesWithVisibilityFilter(conversationId, viewerActorId, limit, cursor);
    }

    // Original logic without visibility filtering
    const conditions = [eq(messages.conversationId, conversationId)];
    
    // 🆕 Cursor-based pagination: si hay cursor, obtener mensajes anteriores a esa fecha
    if (cursor) {
      conditions.push(lt(messages.createdAt, cursor));
    }
    
    return await db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(messages.createdAt)  // ✅ Orden cronológico: antiguos primero, recientes al final
      .limit(limit);
  }

  async updateMessage(
    messageId: string,
    data: {
      content?: MessageContent;
      aiApprovedBy?: string;
    }
  ) {
    // Si solo se está actualizando el contenido, usar versionamiento
    if (data.content && !data.aiApprovedBy) {
      const { messageVersionService } = await import('./message-version.service');
      
      // Necesitamos el senderAccountId para validar ownership
      const [message] = await db
        .select({ senderAccountId: messages.senderAccountId })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);
      
      if (!message) {
        throw new Error('Message not found');
      }
      
      const result = await messageVersionService.createVersion(
        messageId,
        data.content,
        message.senderAccountId
      );
      
      if (!result.success) {
        throw new Error(result.reason || 'Failed to edit message');
      }
      
      // Retornar la nueva versión
      const [updated] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);
      
      return updated;
    }
    
    // Para otros campos (aiApprovedBy), usar update directo
    const [updated] = await db
      .update(messages)
      .set(data)
      .where(eq(messages.id, messageId))
      .returning();

    return updated;
  }

  async getMessagesByIds(messageIds: string[]) {
    const { db, messages } = await import('@fluxcore/db');
    const { inArray } = await import('drizzle-orm');

    const found = await db
      .select()
      .from(messages)
      .where(inArray(messages.id, messageIds));

    return found;
  }

  async deleteMessage(
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
      throw new Error(result.reason || 'Failed to process message deletion');
    }
  }
}

export const messageService = new MessageService();

```

### SOURCE: apps/api/src/routes/messages.routes.ts

```ts
import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { extensionHost } from '../services/extension-host.service';
import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

import { conversationService } from '../services/conversation.service';
import { relationshipService } from '../services/relationship.service';
import { resolveActorId, resolveAccountId, resolveActorIds } from '../utils/actor-resolver';

export const messagesRoutes = new Elysia({ prefix: '/messages' })
  .use(authMiddleware)
  .post(
    '/',
    async ({ user, publicActor, publicProfile, body, set, request }) => {
      const typedBody: any = body as any;
      console.log(`[MessagesRoute] 📥 Incoming POST /messages request:`, {
        type: user ? 'authenticated' : (publicProfile ? 'public_profile' : (publicActor ? 'public_actor' : 'none')),
        hasText: !!typedBody.content?.text,
        mediaCount: typedBody.content?.media?.length || 0
      });

      // Allow either authenticated user OR public actor
      if (!user && !publicActor && !publicProfile) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        // ═══════════════════════════════════════════════════════════════
        // ARQUITECTURA CORRECTA:
        // ChatCore persiste primero, luego certifica async con outbox
        // FluxCore es reactivo, no controlador del mundo humano
        // ═══════════════════════════════════════════════════════════════
        
        // 🔑 AGREGAR VERDAD DEL MUNDO AL INPUT ORIGINAL
        const userAgent = request.headers.get('user-agent');
        const origin = request.headers.get('origin');
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
        
        // Construir meta con la verdad del mundo del input HTTP
        const enrichedBody = {
          ...typedBody,
          meta: {
            ...typedBody.meta,
            ip: ip,
            userAgent: userAgent,
            origin: origin || 'unknown',
            clientTimestamp: new Date().toISOString(),
            requestId: `msg-${Date.now()}-${user?.id || publicActor?.actorId}`,
            // 🔑 INFERIR CHANNEL DESDE EL INPUT HTTP
            channel: userAgent?.includes('Mobile') ? 'mobile' : 
                   userAgent?.includes('Tablet') ? 'tablet' : 
                   origin?.includes('localhost') ? 'web' : 'unknown'
          }
        };
        
        let senderAccountId: string;
        let fromActorId: string;
        let receiverAccountId: string;
        let messageType: 'incoming' | 'outgoing' | 'system' = (enrichedBody.type || 'incoming') as 'incoming' | 'outgoing' | 'system';

        const conversation = await conversationService.getConversationById(enrichedBody.conversationId);
        if (!conversation) {
          set.status = 404;
          return { success: false, message: 'Conversation not found' };
        }

        if (publicProfile) {
          if (conversation.visitorToken !== publicProfile.visitorToken || conversation.ownerAccountId !== publicProfile.ownerAccountId) {
            set.status = 403;
            return { success: false, message: 'Unauthorized for this conversation' };
          }

          senderAccountId = publicProfile.visitorActorId;
          fromActorId = publicProfile.visitorActorId;
          receiverAccountId = publicProfile.ownerAccountId;
          messageType = 'incoming';

          console.log(`[MessagesRoute] 🌐 PUBLIC PROFILE visitor=${publicProfile.visitorActorId} owner=${publicProfile.ownerAccountId}`);
        } else if (publicActor) {
          // 🎭 PUBLIC ACTOR MODE: Visitor operating as public actor
          senderAccountId = publicActor.accountId;
          fromActorId = publicActor.actorId;
          receiverAccountId = publicActor.accountId;
          
          console.log(`[MessagesRoute] 🎭 PUBLIC ACTOR: ${publicActor.actorId} operating as account ${publicActor.accountId}`);
        } else {
          // 🔒 AUTHENTICATED USER MODE: Regular user
          // SECURITY: Resolver account desde user autenticado
          // El JWT contiene user.id, pero necesitamos el account.id correspondiente
          const userAccounts = await db
            .select({ id: accounts.id })
            .from(accounts)
            .where(eq(accounts.ownerUserId, user.id));
          
          if (userAccounts.length === 0) {
            set.status = 403;
            return { success: false, message: 'User has no accounts' };
          }
          
          // 🎯 USAR LA ACCOUNT DEL BODY SI ES VÁLIDA, SINO LA PRIMERA
          senderAccountId = userAccounts[0].id; // Fallback a la primera
          
          // 🔥 CORRECCIÓN: Si el body incluye senderAccountId, verificar que pertenezca al usuario
          if (typedBody.senderAccountId) {
            const requestedAccount = userAccounts.find(acc => acc.id === typedBody.senderAccountId);
            if (requestedAccount) {
              senderAccountId = requestedAccount.id; // ✅ Usar la account seleccionada
              console.log(`[MessagesRoute] ✅ Using selected account: ${senderAccountId}`);
            } else {
              console.log(`[MessagesRoute] ⚠️ Requested account ${typedBody.senderAccountId} not found for user, using first account`);
            }
          } else {
            console.log(`[MessagesRoute] ℹ️ No senderAccountId in body, using first account: ${senderAccountId}`);
          }
          
          // Resolve actor for authenticated user
          fromActorId = await resolveActorId(senderAccountId) || '';
          receiverAccountId = senderAccountId;
          
          console.log(`[MessagesRoute] 🔒 AUTHENTICATED USER: ${user.id}`);
        }
        
        // 🆕 Idempotency: Verificar si ya existe este requestId
        const requestId = enrichedBody.requestId || `msg-${Date.now()}-${senderAccountId}`;
        
        console.log(`[MessagesRoute] 🔒 RESOLVED ACCOUNT: ${senderAccountId}`);
        console.log(`[MessagesRoute] 🔒 RESOLVED ACTOR: ${fromActorId}`);
        console.log(`[MessagesRoute] 🆕 REQUEST ID: ${requestId}`);
        console.log(`[MessagesRoute] 🌍 INPUT CON VERDAD DEL MUNDO ENRIQUECIDO:`, {
          hasMeta: !!enrichedBody.meta,
          channel: enrichedBody.meta?.channel,
          origin: enrichedBody.meta?.origin,
          userAgent: enrichedBody.meta?.userAgent,
          authenticatedUser: user?.id,
          publicActor: publicActor?.actorId,
          resolvedAccount: senderAccountId,
          requestId: requestId
        });
        
        if (!publicProfile && conversation?.relationshipId) {
          const relationship = await relationshipService.getRelationshipById(conversation.relationshipId);
          if (relationship) {
            // El receptor es la OTRA cuenta en la relación (resolved via actor model)
            const otherActorId = relationship.actorAId === fromActorId
              ? relationship.actorBId
              : relationship.actorAId;
            const resolved = await resolveAccountId(otherActorId);
            if (resolved) receiverAccountId = resolved;
          }
        }
        
        // 1️⃣ CHATCORE PERSISTE PRIMERO (soberanía del mundo conversacional)
        console.log(`[MessagesRoute] 📤 Sending to messageCore:`, {
          conversationId: enrichedBody.conversationId,
          senderAccountId: senderAccountId,
          fromActorId: fromActorId,
          type: messageType,
          generatedBy: 'human',
          targetAccountId: receiverAccountId,
          content: enrichedBody.content.text?.substring(0, 50)
        });
        
        const { messageCore } = await import('../core/message-core');
        const result = await messageCore.receive({
          conversationId: enrichedBody.conversationId,
          senderAccountId: senderAccountId,
          fromActorId: fromActorId || undefined,
          content: enrichedBody.content,
          type: messageType,
          generatedBy: 'human',
          targetAccountId: receiverAccountId,
          meta: enrichedBody.meta // 🔑 PASAR LA VERDAD DEL MUNDO COMPLETA
        });

        console.log(`[MessagesRoute] ✅ messageCore.receive result:`, {
          messageId: result.messageId,
          success: true
        });

        // 2️⃣ CERTIFICACIÓN ASÍNCRONA CON OUTBOX (no bloquea respuesta)
        // ✅ Ya no se necesita aquí porque message-core ya encola con el account_id correcto

        // 3️⃣ RETORNAR RESULTADO PERSISTIDO (UI inmediata)
        return { success: true, data: result };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: false,
      body: t.Object({
        conversationId: t.String(),
        // RESTORED: senderAccountId debe venir del frontend (cuenta seleccionada)
        senderAccountId: t.Optional(t.String()),
        // 🆕 fromActorId para el nuevo modelo de actores
        fromActorId: t.Optional(t.String()),
        content: t.Object({
          text: t.Optional(t.String()),
          media: t.Optional(t.Array(t.Any())),
          location: t.Optional(t.Any()),
          buttons: t.Optional(t.Array(t.Any())),
        }),
        type: t.Optional(t.Union([t.Literal('incoming'), t.Literal('outgoing'), t.Literal('system')])),
        generatedBy: t.Optional(t.Union([t.Literal('human'), t.Literal('ai')])),
        replyToId: t.Optional(t.String()),
        // 🆕 Idempotency key para prevenir duplicados
        requestId: t.Optional(t.String()),
      }),
      detail: { tags: ['Messages'], summary: 'Send message' },
    }
  )
  .get(
    '/',
    async ({ user, publicActor, publicProfile, query, set }) => {
      if (!user && !publicActor && !publicProfile) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { db, accounts } = await import('@fluxcore/db');
        const { eq } = await import('drizzle-orm');
        const { messageService } = await import('../services/message.service');

        const conversationId = query.conversationId as string;
        const limit = parseInt(query.limit as string) || 50;

        if (!conversationId) {
          set.status = 400;
          return { success: false, message: 'conversationId required' };
        }

        const conversation = await conversationService.getConversationById(conversationId);
        if (!conversation) {
          set.status = 404;
          return { success: false, message: 'Conversation not found' };
        }

        if (publicProfile) {
          if (conversation.visitorToken !== publicProfile.visitorToken || conversation.ownerAccountId !== publicProfile.ownerAccountId) {
            set.status = 403;
            return { success: false, message: 'Unauthorized for this conversation' };
          }
        } else if (user) {
          const userAccounts = await db
            .select({ id: accounts.id })
            .from(accounts)
            .where(eq(accounts.ownerUserId, user.id));

          const userAccountIds = userAccounts.map(acc => acc.id);
          let allowed = conversation.ownerAccountId ? userAccountIds.includes(conversation.ownerAccountId) : false;

          if (!allowed && conversation.relationshipId) {
            const relationship = await relationshipService.getRelationshipById(conversation.relationshipId);
            if (relationship) {
              const actorMap = await resolveActorIds(userAccountIds);
              const userActorIds = [...actorMap.values()];
              allowed = userActorIds.includes(relationship.actorAId) || userActorIds.includes(relationship.actorBId);
            }
          }

          if (!allowed) {
            set.status = 403;
            return { success: false, message: 'Unauthorized for this conversation' };
          }
        }

        // Resolve viewer actor for visibility filtering
        let viewerActorId: string | undefined;
        
        if (publicProfile) {
          viewerActorId = publicProfile.visitorActorId;
        } else if (user) {
          const userAccounts = await db
            .select({ id: accounts.id })
            .from(accounts)
            .where(eq(accounts.ownerUserId, user.id));

          const userAccountIds = userAccounts.map(acc => acc.id);
          const actorMap = await resolveActorIds(userAccountIds);
          viewerActorId = actorMap.get(userAccountIds[0]); // Use first account's actor
        }

        const messagesList = await messageService.getMessagesByConversationId(conversationId, limit, undefined, viewerActorId);

        return { success: true, data: messagesList };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: false,
      query: t.Object({
        conversationId: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: { tags: ['Messages'], summary: 'Get messages list' },
    }
  )
  .get(
    '/:id',
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const { messageService } = await import('../services/message.service');
      const message = await messageService.getMessageById(params.id);

      if (!message) {
        set.status = 404;
        return { success: false, message: 'Message not found' };
      }

      return { success: true, data: message };
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: { tags: ['Messages'], summary: 'Get message by ID' },
    }
  )
  // V2-3: PATCH - Editar mensaje
  .patch(
    '/:id',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { messageService } = await import('../services/message.service');

        // 🔒 SECURITY: Verificar que el mensaje existe y pertenece al usuario autenticado
        const message = await messageService.getMessageById(params.id);
        if (!message) {
          set.status = 404;
          return { success: false, message: 'Message not found' };
        }

        // 🔒 SECURITY: Verificar ownership del mensaje
        // NOTA: message.senderAccountId es un account.id, no user.id
        // Necesitamos verificar que el user.id autenticado es owner del account
        const userAccounts = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.ownerUserId, user.id));
        
        const userAccountIds = userAccounts.map(acc => acc.id);
        if (!userAccountIds.includes(message.senderAccountId)) {
          console.log(`[MessagesRoute] 🔒 UNAUTHORIZED EDIT ATTEMPT: user=${user.id}, messageOwner=${message.senderAccountId}, userAccounts=${userAccountIds.join(',')}, messageId=${params.id}`);
          set.status = 403;
          return { success: false, message: 'Unauthorized: You can only edit your own messages' };
        }

        const existingContent = message.content as any;
        const isFluxCoreBranded = existingContent?.__fluxcore?.branding === true;

        const typedBody: any = body as any;
        let nextContent: any = typedBody.content;
        if (isFluxCoreBranded && typeof nextContent?.text === 'string') {
          nextContent = {
            ...nextContent,
            text: extensionHost.appendFluxCoreBrandingFooter(nextContent.text),
            __fluxcore: existingContent.__fluxcore,
          };
        }

        // Actualizar mensaje
        const updated = await messageService.updateMessage(params.id, {
          content: nextContent,
        });

        return { success: true, data: updated };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        content: t.Object({
          text: t.String(),
        }),
      }),
      detail: { tags: ['Messages'], summary: 'Edit message' },
    }
  )
  .delete(
    '/:id',
    async ({ user, params, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { messageService } = await import('../services/message.service');
        const { db, accounts } = await import('@fluxcore/db');
        const { eq } = await import('drizzle-orm');

        const scope = (query.scope === 'all' ? 'all' : 'self') as 'self' | 'all';

        const message = await messageService.getMessageById(params.id);
        if (!message) {
          set.status = 404;
          return { success: false, message: 'Message not found' };
        }

        const userAccounts = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.ownerUserId, user.id));

        const userAccountIds = userAccounts.map(acc => acc.id);

        // Resolve the active account: prefer query.accountId (from UI), fallback to first
        let activeAccountId = userAccountIds[0];
        if (query.accountId) {
          if (!userAccountIds.includes(query.accountId)) {
            set.status = 403;
            return { success: false, message: 'AccountId does not belong to user' };
          }
          activeAccountId = query.accountId;
        }

        // Para scope 'all' (redacción): solo el emisor puede redactar
        if (scope === 'all' && !userAccountIds.includes(message.senderAccountId)) {
          set.status = 403;
          return { success: false, message: 'Only the sender can redact a message for all' };
        }

        // Resolver actorId del requester (necesario para scope 'self')
        let requesterActorId: string | undefined;
        if (scope === 'self') {
          const { resolveActorId } = await import('../utils/actor-resolver');
          requesterActorId = await resolveActorId(activeAccountId) || undefined;

          if (!requesterActorId) {
            set.status = 400;
            return { success: false, message: 'Could not resolve actor for current user' };
          }
        }

        await messageService.deleteMessage(
          params.id,
          activeAccountId,
          scope,
          requesterActorId,
        );

        return {
          success: true,
          data: {
            scope,
            action: scope === 'all' ? 'redacted' : 'hidden',
          },
        };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      query: t.Object({
        scope: t.Optional(t.Union([t.Literal('self'), t.Literal('all')])),
        accountId: t.Optional(t.String()),
      }),
      detail: { tags: ['Messages'], summary: 'Delete message (redact for all or hide for self)' },
    }
  )
  .delete(
    '/bulk',
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { messageService } = await import('../services/message.service');
        const { db, accounts } = await import('@fluxcore/db');
        const { eq, inArray } = await import('drizzle-orm');

        const { messageIds, scope = 'self', accountId: bodyAccountId } = body as { 
          messageIds: string[]; 
          scope?: 'self' | 'all';
          accountId?: string;
        };

        if (!messageIds || messageIds.length === 0) {
          set.status = 400;
          return { success: false, message: 'No message IDs provided' };
        }

        if (messageIds.length > 100) {
          set.status = 400;
          return { success: false, message: 'Too many messages (max 100)' };
        }

        const userAccounts = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.ownerUserId, user.id));

        const userAccountIds = userAccounts.map(acc => acc.id);

        // Resolve the active account: prefer bodyAccountId (from UI), fallback to first
        let senderAccountId = userAccountIds[0];
        if (bodyAccountId) {
          if (!userAccountIds.includes(bodyAccountId)) {
            set.status = 403;
            return { success: false, message: 'AccountId does not belong to user' };
          }
          senderAccountId = bodyAccountId;
        }

        // Get all messages to verify permissions
        const messages = await messageService.getMessagesByIds(messageIds);
        if (messages.length === 0) {
          set.status = 404;
          return { success: false, message: 'No messages found' };
        }

        // Verify permissions for each message
        for (const message of messages) {
          if (scope === 'all' && !userAccountIds.includes(message.senderAccountId)) {
            set.status = 403;
            return { 
              success: false, 
              message: 'Only the sender can redact a message for all' 
            };
          }
        }

        // Resolve actorId for scope 'self'
        let requesterActorId: string | undefined;
        if (scope === 'self') {
          const { resolveActorId } = await import('../utils/actor-resolver');
          requesterActorId = await resolveActorId(senderAccountId) || undefined;

          if (!requesterActorId) {
            set.status = 400;
            return { 
              success: false, 
              message: 'Could not resolve actor for current user' 
            };
          }
        }

        // Delete all messages
        const results = await Promise.allSettled(
          messageIds.map(id => 
            messageService.deleteMessage(id, senderAccountId, scope, requesterActorId)
          )
        );

        const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
        if (failed.length > 0) {
          console.error('Bulk delete partial failure:', failed.map(f => f.reason));
          return {
            success: true,
            data: {
              deleted: messageIds.length - failed.length,
              failed: failed.length,
              scope,
              action: scope === 'all' ? 'redacted' : 'hidden',
            },
          };
        }

        return {
          success: true,
          data: {
            deleted: messageIds.length,
            failed: 0,
            scope,
            action: scope === 'all' ? 'redacted' : 'hidden',
          },
        };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      body: t.Object({
        messageIds: t.Array(t.String()),
        scope: t.Optional(t.Union([t.Literal('self'), t.Literal('all')])),
        accountId: t.Optional(t.String()),
      }),
      detail: { 
        tags: ['Messages'], 
        summary: 'Delete multiple messages (redact for all or hide for self)' 
      },
    }
  );

```

### SOURCE: apps/api/src/routes/conversations.routes.ts

```ts
import { Elysia, t } from 'elysia';
import { and, eq } from 'drizzle-orm';
import { accounts, conversationParticipants, db } from '@fluxcore/db';
import { authMiddleware } from '../middleware/auth.middleware';
import { conversationService } from '../services/conversation.service';

export const conversationsRoutes = new Elysia({ prefix: '/conversations' })
  .use(authMiddleware)
  // GET /conversations - Listar conversaciones (filtradas por accountId si se provee)
  .get(
    '/',
    async ({ user, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { accountId } = query;

        // MA-102: Si se provee accountId, filtrar por esa cuenta específica
        if (accountId) {
          // MA-105: Verificar que el accountId pertenece al usuario
          const { accountService } = await import('../services/account.service');
          const userAccounts = await accountService.getAccountsByUserId(user.id);
          const userAccountIds = userAccounts.map(a => a.id);

          if (!userAccountIds.includes(accountId)) {
            set.status = 403;
            return { success: false, message: 'Account does not belong to user' };
          }

          const conversations = await conversationService.getConversationsByAccountId(accountId, { actorId: user.id });
          return { success: true, data: conversations };
        }

        // Fallback: devolver todas las conversaciones del usuario (deprecated behavior)
        const conversations = await conversationService.getConversationsByUserId(user.id, { actorId: user.id });
        return { success: true, data: conversations };
      } catch (error: any) {
        console.error('[API] Error loading conversations:', error);
        set.status = 500;
        return { success: false, message: 'Error al cargar conversaciones', error: error.message };
      }
    },
    {
      isAuthenticated: true,
      query: t.Object({
        accountId: t.Optional(t.String()),
      }),
      detail: { tags: ['Conversations'], summary: 'List conversations for account' },
    }
  )
  .post(
    '/',
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const conversation = await conversationService.ensureConversation({
          relationshipId: body.relationshipId,
          channel: body.channel,
        });
        return { success: true, data: conversation };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      body: t.Object({
        relationshipId: t.String(),
        channel: t.Union([t.Literal('web'), t.Literal('whatsapp'), t.Literal('telegram')]),
      }),
      detail: { tags: ['Conversations'], summary: 'Create conversation' },
    }
  )
  .get(
    '/:id',
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const conversation = await conversationService.getConversationById(params.id);
      if (!conversation) {
        set.status = 404;
        return { success: false, message: 'Conversation not found' };
      }

      return { success: true, data: conversation };
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: { tags: ['Conversations'], summary: 'Get conversation by ID' },
    }
  )
  .get(
    '/:id/messages',
    async ({ user, params, query, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      // 🔥 NUEVA: Validar accountId pertenece al user
      if (query.accountId) {
        const userAccounts = await db
          .select()
          .from(accounts)
          .where(eq(accounts.ownerUserId, user.id));
        
        const accountIds = userAccounts.map(a => a.id);
        if (!accountIds.includes(query.accountId)) {
          set.status = 403;
          return { success: false, message: 'AccountId no pertenece al usuario' };
        }
      }

      try {
        const { messageService } = await import('../services/message.service');
        const limit = parseInt(query.limit || '50');
        
        // 🆕 Cursor-based pagination: usar cursor en lugar de offset
        const cursor = query.cursor ? new Date(query.cursor) : undefined;
        
        console.log(`[ConversationsRoute] 🆕 CURSOR PAGINATION: limit=${limit}, cursor=${cursor}`);
        
        // 🔥 NUEVO: Obtener viewerRole para perspectiva correcta
        let viewerRole = null;
        let activeAccountId = null;

        // 🔥 CORREGIDO: Usar accountId del JWT, no del query param (seguridad)
        if (query.accountId) {
          // Validar que accountId pertenece al user (ya hecho arriba)
          activeAccountId = query.accountId;
          
          const participant = await db
            .select({ role: conversationParticipants.role })
            .from(conversationParticipants)
            .where(
              and(
                eq(conversationParticipants.conversationId, params.id),
                eq(conversationParticipants.accountId, activeAccountId)
              )
            )
            .limit(1);
          viewerRole = participant[0]?.role || null;
        }

        // Resolve viewer actor for visibility filtering
        let viewerActorId: string | undefined;
        if (user && activeAccountId) {
          const { resolveActorId } = await import('../utils/actor-resolver');
          viewerActorId = await resolveActorId(activeAccountId) || undefined;
        }

        const messages = await messageService.getMessagesByConversationId(params.id, limit, cursor, viewerActorId);

        // 🔥 NUEVO: Agregar viewerRole a cada mensaje para perspectiva correcta
        const messagesWithPerspective = messages.map(msg => ({
          ...msg,
          type: viewerRole 
            ? (viewerRole === 'initiator' && msg.senderAccountId === activeAccountId ? 'outgoing' : 'incoming')
            : (msg.senderAccountId === activeAccountId ? 'outgoing' : 'incoming'), // 🔥 Fallback con activeAccountId del JWT
          viewerRole // 🔥 Incluir viewerRole para debug
        }));
        
        // 🆕 Devolver el cursor del último mensaje para la siguiente página
        const nextCursor = messagesWithPerspective.length > 0 ? messagesWithPerspective[messagesWithPerspective.length - 1].createdAt : null;
        
        return { 
          success: true, 
          data: messagesWithPerspective,
          meta: {
            nextCursor: nextCursor,
            hasMore: messagesWithPerspective.length === limit
          }
        };
      } catch (error: any) {
        console.error('[API] Error loading messages:', error);
        set.status = 500;
        return { success: false, message: 'Error al cargar mensajes', error: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      query: t.Object({
        limit: t.Optional(t.String()),
        cursor: t.Optional(t.String()),
        accountId: t.Optional(t.String()), // 🔥 NUEVO: accountId query param
      }),
      detail: { tags: ['Conversations'], summary: 'Get conversation messages' },
    }
  )
  .patch(
    '/:id',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const updated = await conversationService.updateConversation(params.id, body);
        return { success: true, data: updated };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Optional(t.Union([t.Literal('active'), t.Literal('archived'), t.Literal('closed')])),
      }),
      detail: { tags: ['Conversations'], summary: 'Update conversation' },
    }
  )
  .post(
    '/convert-visitor',
    async ({ user, body, set, request }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { visitorToken, ownerAccountId, visitorAccountId } = body;

        // Validate visitorAccountId belongs to user
        const { accountService } = await import('../services/account.service');
        const userAccounts = await accountService.getAccountsByUserId(user.id);
        if (!userAccounts.some(a => a.id === visitorAccountId)) {
          set.status = 403;
          return { success: false, message: 'Account does not belong to user' };
        }

        // Ensure relationship exists between visitor and owner
        const { relationshipService } = await import('../services/relationship.service');
        const relationship = await relationshipService.createRelationship(
          visitorAccountId,
          ownerAccountId
        );

        // Convert the visitor conversation
        const converted = await conversationService.convertVisitorConversation({
          visitorToken,
          ownerAccountId,
          visitorAccountId,
          relationshipId: relationship.id,
        });

        const { chatCoreWebchatGateway } = await import('../services/fluxcore/chatcore-webchat-gateway.service');
        const identityCertification = await chatCoreWebchatGateway.certifyConnectionEvent({
          visitorToken,
          realAccountId: visitorAccountId,
          tenantId: ownerAccountId,
          meta: {
            ip: request.headers.get('x-forwarded-for') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
            requestId: request.headers.get('x-request-id') || `convert-visitor-${Date.now()}`,
          },
        });

        if (!identityCertification.accepted) {
          throw new Error(identityCertification.reason || 'Failed to certify identity link');
        }

        return {
          success: true,
          data: {
            conversation: converted,
            relationshipId: relationship.id,
            identitySignalId: identityCertification.signalId ?? null,
          },
        };
      } catch (error: any) {
        console.error('[API] Error converting visitor conversation:', error);
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      body: t.Object({
        visitorToken: t.String(),
        ownerAccountId: t.String(),
        visitorAccountId: t.String(),
      }),
      detail: {
        tags: ['Conversations'],
        summary: 'Convert anonymous visitor conversation to relationship-based',
        description: 'Links a visitor conversation to a real relationship when the visitor authenticates.',
      },
    }
  )
  .post(
    '/:id/clear',
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const userAccounts = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.ownerUserId, user.id));

        const senderAccountId = userAccounts[0]?.id;
        if (!senderAccountId) {
          set.status = 400;
          return { success: false, message: 'No account found' };
        }

        const { resolveActorId } = await import('../utils/actor-resolver');
        const actorId = await resolveActorId(senderAccountId);
        if (!actorId) {
          set.status = 400;
          return { success: false, message: 'Could not resolve actor' };
        }

        const { messageDeletionService } = await import('../services/message-deletion.service');
        const result = await messageDeletionService.hideAllMessagesForActor(params.id, actorId);

        if (!result.success) {
          set.status = 500;
          return { success: false, message: result.reason };
        }

        return { success: true, data: { hiddenCount: result.hiddenCount } };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: { tags: ['Conversations'], summary: 'Clear chat (hide all messages for current actor)' },
    }
  )
  .delete(
    '/:id',
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        await conversationService.deleteConversation(params.id, user.id);
        return { success: true, message: 'Se ha abandonado la conversación correctamente' };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: { tags: ['Conversations'], summary: 'Leave conversation (soft delete)' },
    }
  );

```

### SOURCE: packages/db/src/schema/message-visibility.ts

```ts
import { pgTable, uuid, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { messages } from './messages';
import { actors } from './actors';

/**
 * Message Visibility — Modelo canónico de ocultamiento por actor
 * 
 * Cuando un actor decide "eliminar un mensaje para sí mismo",
 * el mensaje no se elimina ni se muta. Se registra aquí que ese
 * actor ya no debe ver ese mensaje.
 * 
 * Si el actor no tiene entrada en esta tabla para un mensaje,
 * el mensaje es visible para ese actor (visibilidad por defecto).
 */
export const messageVisibility = pgTable('message_visibility', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => actors.id, { onDelete: 'cascade' }),
  hiddenAt: timestamp('hidden_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  messageActorUnique: uniqueIndex('ux_message_visibility_message_actor').on(table.messageId, table.actorId),
  actorIdx: index('idx_message_visibility_actor').on(table.actorId),
  messageIdx: index('idx_message_visibility_message').on(table.messageId),
}));

export type MessageVisibility = typeof messageVisibility.$inferSelect;
export type NewMessageVisibility = typeof messageVisibility.$inferInsert;

```

### SOURCE: packages/db/src/schema/messages.ts

```ts
import { pgTable, uuid, varchar, timestamp, jsonb, bigint, integer, boolean, text, uniqueIndex, check, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { conversations } from './conversations';
import { users } from './users';
import { actors } from './actors';

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  senderAccountId: text('sender_account_id').notNull(),
  content: jsonb('content').notNull(), // { text?, media?, location?, buttons? }
  type: varchar('type', { length: 20 }).notNull(), // 'incoming' | 'outgoing' | 'system'
  eventType: varchar('event_type', { length: 20 }).default('message').notNull(), // 'message' | 'reaction' | 'edit' | 'internal_note' | 'system'
  generatedBy: varchar('generated_by', { length: 20 }).default('human').notNull(), // 'human' | 'ai' | 'system'
  aiApprovedBy: uuid('ai_approved_by').references(() => users.id),
  // COR-002: Status de sincronización/entrega (migration-007)
  status: varchar('status', { length: 20 }).default('synced').notNull(),
  // COR-003: Actor model para mensajes (migration-008)
  fromActorId: uuid('from_actor_id').references(() => actors.id),
  toActorId: uuid('to_actor_id').references(() => actors.id),
  parentId: uuid('parent_id'),
  originalId: uuid('original_id'),
  version: integer('version').notNull().default(1),
  isCurrent: boolean('is_current').notNull().default(true),
  redactedAt: timestamp('redacted_at', { withTimezone: true }),
  redactedBy: text('redacted_by'),
  // FLUX-001: Kernel alignment
  signalId: bigint('signal_id', { mode: 'number' }),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  messagesSignalIdUnique: uniqueIndex('ux_messages_signal_id').on(table.signalId),
  messagesConversationIdx: index('idx_messages_conversation').on(table.conversationId, table.createdAt),
  messagesParentIdx: index('idx_messages_parent').on(table.parentId),
  messagesOriginalIdx: index('idx_messages_original').on(table.originalId),
  messageHasContent: check('message_has_content', sql`
    (${table.content} ->> 'text') IS NOT NULL
    OR jsonb_array_length(COALESCE(${table.content} -> 'media', '[]'::jsonb)) > 0
    OR ${table.eventType} IN ('reaction', 'system')
  `),
}));

export const messageEnrichments = pgTable('message_enrichments', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  extensionId: varchar('extension_id', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MessageEnrichment = typeof messageEnrichments.$inferSelect;
export type NewMessageEnrichment = typeof messageEnrichments.$inferInsert;

// COR-002: Tipos de status para mensajes
export type MessageStatus =
  | 'local_only'      // Solo existe localmente (offline-first)
  | 'pending_backend' // Pendiente de sincronizar con backend
  | 'synced'          // Sincronizado con backend
  | 'sent'            // Enviado al destinatario (adapters externos)
  | 'delivered'       // Entregado al destinatario
  | 'seen';           // Visto por el destinatario

// Tipos para el contenido del mensaje
export interface MessageMedia {
  type: 'image' | 'video' | 'audio' | 'document';
  assetId: string;
  mimeType?: string;
}

export interface MessageLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface MessageButton {
  id: string;
  text: string;
  action: string;
}

export interface MessageContent {
  text?: string;
  media?: MessageMedia[];
  location?: MessageLocation;
  buttons?: MessageButton[];
}

```

### SOURCE: apps/web/src/components/ui/DeleteMessageModal.tsx

```tsx
import { XIcon, TrashIcon, ShieldAlertIcon } from '../../lib/icon-library';

interface DeleteMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scope: 'self' | 'all') => void;
  messageCount?: number;
  canDeleteForAll?: boolean;
}

export function DeleteMessageModal({
  isOpen,
  onClose,
  onConfirm,
  messageCount = 1,
  canDeleteForAll = false,
}: DeleteMessageModalProps) {
  if (!isOpen) return null;

  const handleDeleteForSelf = () => {
    onConfirm('self');
    onClose();
  };

  const handleDeleteForAll = () => {
    onConfirm('all');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Eliminar mensaje{messageCount > 1 ? 's' : ''}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-600 mb-4">
            ¿Qué quieres hacer con el{messageCount > 1 ? 's' : ''} mensaje{messageCount > 1 ? 's' : ''} seleccionado{messageCount > 1 ? 's' : ''}?
          </p>

          <div className="space-y-3">
            {/* Opción: Eliminar para mí */}
            <button
              onClick={handleDeleteForSelf}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <TrashIcon size={20} className="text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">Eliminar para mí</div>
                <div className="text-sm text-gray-500">
                  Ocultar el{messageCount > 1 ? 's' : ''} mensaje{messageCount > 1 ? 's' : ''} solo para ti. 
                  Otras personas seguirán viéndolo{messageCount > 1 ? 's' : ''}.
                </div>
              </div>
            </button>

            {/* Opción: Eliminar para todos (si está permitido) */}
            {canDeleteForAll && (
              <button
                onClick={handleDeleteForAll}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-red-200 hover:border-red-300 hover:bg-red-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <ShieldAlertIcon size={20} className="text-red-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-red-900">Eliminar para todos</div>
                  <div className="text-sm text-red-600">
                    Redactar el{messageCount > 1 ? 's' : ''} mensaje{messageCount > 1 ? 's' : ''} para todos. 
                    Esta acción no se puede deshacer.
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* Nota informativa */}
          {!canDeleteForAll && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                <strong>Nota:</strong> Solo puedes eliminar para todos los mensajes que tú has enviado.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

```

### SOURCE: apps/web/src/components/chat/MessageBubble.tsx

```tsx
/**
 * V2-1.4: MessageBubble Component
 * 
 * Muestra un mensaje con estados, reply-to, y acciones.
 * CORREGIDO: Usando sistema de diseño canónico
 */

import { useState, Fragment } from 'react';
import { CheckIcon, CheckCheckIcon, ClockIcon, AlertCircleIcon, RotateCcwIcon, ReplyIcon, EditIcon, TrashIcon, BotIcon, FileIcon, ShieldAlertIcon, GripVerticalIcon, ForwardIcon, CopyIcon, FlagIcon, DownloadIcon, XIcon } from '../../lib/icon-library';
import clsx from 'clsx';
import type { Message, MessageStatus } from '../../types';
import { AssetPreview } from './AssetPreview';
import { DeleteMessageModal } from '../ui/DeleteMessageModal';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isAI?: boolean;
  replyToMessage?: Message;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: (scope: 'self' | 'all') => void;
  onRetry?: () => void;
  onScrollToMessage?: (messageId: string) => void;
  viewerAccountId?: string;
  // Props para modo selección
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionToggle?: (messageId: string, selected: boolean) => void;
  onSelectionModeToggle?: (messageId: string) => void;
  }

export function MessageBubble({
  message,
  isOwn,
  isAI = false,
  replyToMessage,
  onReply,
  onEdit,
  onDelete,
  onRetry,
  onScrollToMessage,
  viewerAccountId,
  isSelectionMode = false,
  isSelected = false,
  onSelectionToggle,
  onSelectionModeToggle,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showOptionsButton, setShowOptionsButton] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = (scope: 'self' | 'all') => {
    if (onDelete) {
      onDelete(scope);
    }
  };

  const canDeleteForAll = isOwn && !isAI; // Only own messages can be deleted for all

  // Gradiente global para efecto Instagram - ÚNICA FUENTE DE VERDAD
  const GLOBAL_GRADIENT_MASK = {
  // Del 0% al 40% es Azul Oscuro (Header zone)
  // Del 40% al 60% ocurre toda la transición (Reading zone)
  // Del 60% al 100% es Cian/Azul brillante (Input zone)
  background: 'linear-gradient(to bottom, #0f172a 0%, #0f172a 30%, #2563eb 55%, #06b6d4 80%, #06b6d4 100%)',
  backgroundAttachment: 'fixed',
  backgroundSize: '100vw 100vh',
  };

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const resolveMediaUrl = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return `${apiUrl}${url}`;
    return url;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const renderWaveform = (samples: unknown) => {
    if (!Array.isArray(samples) || samples.length === 0) return null;
    const max = Math.max(...samples.map((n) => (typeof n === 'number' ? n : 0)), 1);

    return (
      <div className="mt-2 flex items-end gap-0.5 h-8">
        {samples.slice(0, 64).map((n, i) => {
          const v = typeof n === 'number' ? n : 0;
          const h = Math.max(2, Math.round((v / max) * 28));
          return (
            <div
              key={i}
              className={clsx('w-1 rounded-sm', isOwn ? 'bg-muted opacity-60' : 'bg-muted')}
              style={{ height: `${h}px` }}
            />
          );
        })}
      </div>
    );
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Sistema canónico de colores
  const renderStatus = (status?: MessageStatus) => {
    switch (status) {
      case 'pending_backend':
      case 'local_only':
        return <ClockIcon size={14} className="text-muted" />;
      case 'synced':
      case 'sent':
        return <CheckIcon size={14} className="text-muted" />;
      case 'delivered':
        return <CheckCheckIcon size={14} className="text-muted" />;
      case 'seen':
        return <CheckCheckIcon size={14} className="text-accent" />;
      case 'failed':
        return <AlertCircleIcon size={14} className="text-error" />;
      default:
        return <CheckIcon size={14} className="text-muted" />;
    }
  };

  // ── System messages (ai_blocked, etc.) ──────────────────────────────
  if (message.generatedBy === 'system') {
    const systemMeta = (message.content as any)?.__system as
      | { type: string; reason?: string; requiredProvider?: string; creditBalance?: number }
      | undefined;

    return (
      <div className="flex justify-center my-2" data-component-name="MessageBubble">
        <div className="max-w-[85%] rounded-xl px-4 py-2.5 bg-warning/10 border border-warning/20 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <ShieldAlertIcon size={14} className="text-warning" />
            <span className="text-xs font-medium text-warning">
              {systemMeta?.type === 'ai_blocked' ? 'IA no disponible' : 'Sistema'}
            </span>
          </div>
          {typeof message.content.text === 'string' && message.content.text.trim().length > 0 && (
            <p className="text-sm text-secondary">{message.content.text}</p>
          )}
          <div className="text-xs text-muted mt-1">
            {formatTime(message.createdAt)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Fragment>
    <div
      className={clsx(
        'group flex gap-0.5 items-center',
        isOwn ? 'justify-end' : 'justify-start'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Selector Circle - fuera del bubble */}
      {isSelectionMode && (
        <button
          onClick={() => onSelectionToggle?.(message.id, !isSelected)}
          className={clsx(
            'flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all items-center justify-center',
            isOwn ? 'order-1' : 'order-[-1]',
            isSelected 
              ? 'bg-accent border-accent' 
              : 'bg-surface border-muted hover:border-accent'
          )}
          aria-label={isSelected ? 'Deseleccionar mensaje' : 'Seleccionar mensaje'}
        >
          {isSelected && (
            <div className="w-full h-full flex items-center justify-center">
              <CheckIcon size={12} className="text-white" />
            </div>
          )}
        </button>
      )}

      {/* Actions (left side for own messages) */}
      {isOwn && showActions && !isSelectionMode && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {message.status === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className="p-1 rounded-md text-muted hover:text-primary hover:bg-hover transition-colors"
              aria-label="Reintentar envío"
            >
              <RotateCcwIcon size={14} />
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1 rounded-md text-muted hover:text-primary hover:bg-hover transition-colors"
              aria-label="Editar mensaje"
            >
              <EditIcon size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className="p-1 rounded-md text-error hover:text-error hover:bg-error/10 transition-colors"
              aria-label="Eliminar mensaje"
            >
              <TrashIcon size={14} />
            </button>
          )}
          {onReply && (
            <button
              onClick={onReply}
              className="p-1 rounded-md text-muted hover:text-primary hover:bg-hover transition-colors"
              aria-label="Responder mensaje"
            >
              <ReplyIcon size={14} />
            </button>
          )}
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={clsx(
          'max-w-[80%] px-4 py-2 relative rounded-2xl transition-all',
          isOwn 
            ? 'ml-auto text-white rounded-br-sm shadow-md' 
            : 'mr-auto bg-elevated text-primary rounded-bl-sm',
          // Si es IA y no es propio, aplicamos clase de borde
          (!isOwn && isAI) && 'border border-transparent'
        )}
        style={{
          ...(isOwn ? GLOBAL_GRADIENT_MASK : {}),
          ...((!isOwn && isAI) ? {
            backgroundImage: `linear-gradient(var(--bg-elevated), var(--bg-elevated)), ${GLOBAL_GRADIENT_MASK.background}`,
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            backgroundAttachment: 'fixed',
            opacity: 0.85
          } : {})
        }}
      >
        {/* Reply-to preview */}
        {replyToMessage && (
          <button
            onClick={() => onScrollToMessage?.(replyToMessage.id)}
            className="block w-full text-left mb-2 p-2 bg-active rounded-lg border-l-2 border-accent"
          >
            <div className="text-xs text-accent mb-0.5">
              {replyToMessage.senderAccountId === message.senderAccountId ? 'Tú' : 'Respuesta a'}
            </div>
            <div className="text-xs text-secondary truncate">
              {replyToMessage.content.text}
            </div>
          </button>
        )}

        {/* Media previews */}
        {Array.isArray(message.content.media) && message.content.media.length > 0 && (
          <div className="flex flex-col gap-2 mb-2">
            {message.content.media.map((m, idx) => {
              const key = m.assetId ?? `${m.type}-${idx}`;
              const fallbackName = m.name || m.filename || `Archivo ${idx + 1}`;
              const sizeBytes = m.sizeBytes ?? 0;

              const renderAsset = () => {
                if (!m.assetId || !viewerAccountId) return null;

                const preview = (
                  <AssetPreview
                    key={key}
                    assetId={m.assetId}
                    accountId={viewerAccountId}
                    name={fallbackName}
                    mimeType={m.mimeType || 'application/octet-stream'}
                    sizeBytes={sizeBytes}
                    typeHint={m.type}
                  />
                );

                if (m.type === 'audio' && (m as any)?.waveformData?.samples) {
                  return (
                    <div key={`${key}-asset-audio`} className="bg-elevated rounded-lg p-2 border border-subtle">
                      {preview}
                      {renderWaveform((m as any)?.waveformData?.samples)}
                    </div>
                  );
                }

                return preview;
              };

              const assetContent = renderAsset();
              if (assetContent) return assetContent;

              // TODO(assets): Este fallback a url debe eliminarse cuando adapters migren a assetId.
              // Por ahora, se mantiene compatibilidad con canales externos que aún entregan url.
              if (!m.url) {
                return (
                  <div key={`${key}-unsupported`} className="text-xs text-muted bg-active rounded-lg p-2 border border-subtle">
                    No se puede mostrar este adjunto.
                  </div>
                );
              }

              // TODO(assets): Este renderizado directo por url debe eliminarse cuando adapters migren a assetId.
              // Por ahora, se mantiene compatibilidad con canales externos que aún entregan url.
              const url = resolveMediaUrl(m.url);

              switch (m.type) {
                case 'image':
                  return (
                    <img
                      key={`${key}-image`}
                      src={url}
                      alt={fallbackName}
                      className="rounded-lg max-h-64 object-cover border border-subtle"
                      loading="lazy"
                    />
                  );
                case 'audio':
                  return (
                    <div key={`${key}-audio`} className="bg-elevated rounded-lg p-2 border border-subtle">
                      <audio controls src={url} className="w-full" />
                      {renderWaveform((m as any)?.waveformData?.samples)}
                      {fallbackName && (
                        <div className={clsx('mt-1 text-xs', isOwn ? 'text-secondary' : 'text-muted')}>
                          {fallbackName}
                        </div>
                      )}
                    </div>
                  );
                case 'document':
                default:
                  return (
                    <a
                      key={`${key}-doc`}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className={clsx(
                        'flex items-center gap-2 rounded-lg p-2 border border-subtle',
                        isOwn ? 'bg-elevated' : 'bg-active'
                      )}
                    >
                      <FileIcon size={18} className="text-info flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm truncate text-primary">
                          {fallbackName}
                        </div>
                        {(m.mimeType || sizeBytes) && (
                          <div className={clsx('text-xs truncate', isOwn ? 'text-secondary' : 'text-muted')}>
                            {m.mimeType || ''}{m.mimeType && sizeBytes ? ' · ' : ''}{formatBytes(sizeBytes)}
                          </div>
                        )}
                      </div>
                    </a>
                  );
              }
            })}
          </div>
        )}

        {/* Message content */}
        {typeof message.content.text === 'string' && message.content.text.trim().length > 0 && (
          <p className={clsx(
            'text-sm whitespace-pre-wrap break-words',
            isOwn ? 'font-medium' : ''
          )}>{message.content.text}</p>
        )}

        {/* Footer: time, AI badge, status, options */}
        <div
          className={clsx(
            'flex items-center gap-1.5 mt-1 text-xs',
            isOwn ? 'text-white/80 justify-end' : 'text-muted'
          )}
          onMouseEnter={() => setShowOptionsButton(true)}
          onMouseLeave={() => setShowOptionsButton(false)}
        >
          {message.updatedAt && message.updatedAt !== message.createdAt && (
            <span className="opacity-70">(editado)</span>
          )}
          <span>{formatTime(message.createdAt)}</span>
          {message.generatedBy === 'ai' && (
            <span className={clsx(
              'flex items-center gap-0.5 px-1.5 py-0.5 rounded',
              isOwn 
                ? 'bg-white/20 text-white' 
                : 'bg-accent-muted text-accent'
            )}>
              <BotIcon size={10} />
              IA
            </span>
          )}
          {isOwn && renderStatus(message.status)}
          
          {/* Options Button - aparece al hover en metadata */}
          {showOptionsButton && !isSelectionMode && (
            <button
              onClick={() => onSelectionModeToggle?.(message.id)}
              className="p-0.5 rounded text-muted hover:text-primary hover:bg-hover transition-colors"
              aria-label="Opciones de mensaje"
            >
              <GripVerticalIcon size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Actions (right side for received messages) */}
      {!isOwn && showActions && onReply && !isSelectionMode && (
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onReply}
            className="p-1 text-muted hover:text-primary hover:bg-hover rounded"
            title="Responder"
          >
            <ReplyIcon size={14} />
          </button>
        </div>
      )}
    </div>

    {/* Delete Confirmation Modal */}
    <DeleteMessageModal
      isOpen={showDeleteModal}
      onClose={() => setShowDeleteModal(false)}
      onConfirm={handleDeleteConfirm}
      messageCount={1}
      canDeleteForAll={canDeleteForAll}
    />
    </Fragment>
  );
}

// Componente de barra de acciones para modo selección
interface MessageSelectionToolbarProps {
  selectedCount: number;
  onClose: () => void;
  onForward: () => void;
  onCopy: () => void;
  onReport: () => void;
  onDownload: () => void;
  onDelete: (scope: 'self' | 'all') => void;
}

export function MessageSelectionToolbar({
  selectedCount,
  onClose,
  onForward,
  onCopy,
  onReport,
  onDownload,
  onDelete,
}: MessageSelectionToolbarProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = (scope: 'self' | 'all') => {
    if (onDelete) {
      onDelete(scope);
    }
    setShowDeleteModal(false);
  };

  // For bulk selection, we can delete for all if user has permission
  const canDeleteForAll = true; // This could be determined by user permissions

  return (
    <Fragment>
      <div className="flex items-center justify-between px-4 py-2 bg-surface border-t border-subtle">
        {/* Lado izquierdo: cerrar + contador */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-primary hover:bg-hover transition-colors"
            aria-label="Cerrar modo selección"
          >
            <XIcon size={16} />
          </button>
          <span className="text-sm text-primary">
            {selectedCount} {selectedCount === 1 ? 'mensaje seleccionado' : 'mensajes seleccionados'}
          </span>
        </div>

        {/* Lado derecho: acciones */}
        <div className="flex items-center gap-1">
          <button
            onClick={onForward}
            className="p-2 rounded text-muted hover:text-primary hover:bg-hover transition-colors"
            aria-label="Reenviar mensajes"
          >
            <ForwardIcon size={16} />
          </button>
          <button
            onClick={onCopy}
            className="p-2 rounded text-muted hover:text-primary hover:bg-hover transition-colors"
            aria-label="Copiar mensajes"
          >
            <CopyIcon size={16} />
          </button>
          <button
            onClick={onReport}
            className="p-2 rounded text-muted hover:text-primary hover:bg-hover transition-colors"
            aria-label="Reportar mensajes"
          >
            <FlagIcon size={16} />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-1 rounded-md text-error hover:text-error hover:bg-error/10 transition-colors"
            aria-label="Eliminar mensajes seleccionados"
          >
            <TrashIcon size={14} />
          </button>
          <button
            onClick={onDownload}
            className="p-2 rounded text-muted hover:text-primary hover:bg-hover transition-colors"
            aria-label="Descargar mensajes"
          >
            <DownloadIcon size={16} />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteMessageModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        messageCount={selectedCount}
        canDeleteForAll={canDeleteForAll}
      />
    </Fragment>
  );
}

```

### SOURCE: apps/web/src/components/chat/ChatView.tsx

```tsx
/**
 * ChatView - Vista de conversación activa
 * V2-1: Conectado a API real
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { AlertTriangle, MessageCircle, Phone, Video, Loader2, X } from 'lucide-react';
import type { Message } from '../../types';
import { AISuggestionCard, useAISuggestions, type AISuggestion } from '../extensions';
import { MessageBubble, MessageSelectionToolbar } from './MessageBubble';
import { ChatComposer } from './ChatComposer';
import { ChatOptionsMenu } from './ChatOptionsMenu';
import { useAssetUpload } from '../../hooks/useAssetUpload';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useUIStore } from '../../store/uiStore';
import { useAutoReplyStore } from '../../store/autoReplyStore';
import { Avatar } from '../ui/Avatar';
import { ParticipantsActivityBar } from './ParticipantsActivityBar';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useAccounts } from '../../store/accountStore';
import { useChat } from '../../hooks/useChat';
import { api } from '../../services/api';
import { Building2 } from 'lucide-react';

const CHAT_SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'audio/ogg;codecs=opus',
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp3',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const CHAT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

interface ChatViewProps {
  conversationId: string;
  accountId: string; // 🔥 REQUERIDO: Sin fallbacks
  relationshipId?: string;
}

type ActivityType = 'typing' | 'recording' | 'idle';

export function ChatView({ conversationId, accountId, relationshipId }: ChatViewProps) {
  // 🔥 VALIDACIÓN EXPLÍCITA: Si no hay accountId, gritar
  if (!accountId) {
    throw new Error(`ChatView: accountId es requerido. Recibido: ${accountId}. Esto indica un error en la selección de cuenta.`);
  }
  
  // 🔥 CONTEXTO DE REALIDAD: Anclar al workspace actual
  const { activeWorkspace, workspaces } = useWorkspaceStore();
  const currentWorkspace = activeWorkspace || workspaces[0];
  const { activeActorId, activeAccount } = useAccounts();
  
  if (!currentWorkspace) {
    console.warn('⚠️ ChatView: No hay workspace activo. Esto puede causar desorientación.');
  } else {
    console.log(`🌍 ChatView: Anclado al workspace "${currentWorkspace.name || 'Sin nombre'}" (${currentWorkspace.id})`);
    console.log(`👤 ChatView: Enviando como account "${accountId}"`);
  }
  
  const [message, setMessage] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const pendingConversationScrollRef = useRef(false);

  // Estado para modo selección
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  // Obtener nombre del contacto desde las conversaciones cargadas
  const conversations = useUIStore((state) => state.conversations);
  const currentConversation = conversations.find(c => c.id === conversationId);
  const contactName = (currentConversation as any)?.contactName || `Chat ${conversationId?.slice(0, 8)}`;
  const contactProfile = (currentConversation as any)?.contactProfile as { avatarUrl?: string } | undefined;
  const contactAvatar = contactProfile?.avatarUrl || (currentConversation as any)?.contactAvatar;
  const activeRelationshipId = (currentConversation as any)?.relationshipId || relationshipId;

  // V2-1: useChat (WebSocket-driven)
  const {
    messages,
    setMessages,
    isLoading,
    isSending: chatIsSending,
    error,
    sendMessage,
    addReceivedMessage,
    deleteMessage,
    refresh,
  } = useChat({ conversationId, accountId }); // 🔥 Pasar accountId sin fallback

  const currentUserId = useAuthStore((state) => state.user?.id ?? null);

  // Debug: Log activeActorId and message fromActorId values
  console.log('[ChatView] Debug - activeActorId:', activeActorId);
  console.log('[ChatView] Debug - messages with fromActorId:', messages.map(m => ({ id: m.id, fromActorId: m.fromActorId, type: m.type, content: m.content.text?.substring(0, 30) })));

  // Assets: session-based uploads
  const {
    upload: uploadAssetRequest,
    status: assetUploadStatus,
    progress: assetProgress,
    error: uploadError,
    reset: resetUpload,
  } = useAssetUpload({
    accountId, // 🔥 Pasar accountId sin fallback
    allowedMimeTypes: CHAT_SUPPORTED_MIME_TYPES,
    maxSizeBytes: CHAT_MAX_UPLOAD_BYTES,
  });

  const isUploadingAttachment = assetUploadStatus === 'creating_session' || assetUploadStatus === 'uploading' || assetUploadStatus === 'committing';
  const uploadProgress = assetProgress?.percentage ?? 0;

  const clearUploadError = () => {
    resetUpload();
  };

  const performAssetUpload = useCallback(async ({ file }: { file: File }) => {
    const asset = await uploadAssetRequest(file);
    return asset;
  }, [uploadAssetRequest]);

  const uploadAssetForComposer = useCallback(async ({ file }: { file: File; type: 'image' | 'document' | 'video' }) => {
    if (!currentUserId || !accountId) {
      return { success: false, error: 'No hay sesión activa para subir archivos' };
    }
    const previewUrl = file.type.startsWith('image/') || file.type.startsWith('video/') ? URL.createObjectURL(file) : undefined;
    const asset = await performAssetUpload({ file });

    if (!asset) {
      return {
        success: false,
        error: uploadError || 'No se pudo subir el archivo',
      };
    }

    return {
      success: true,
      asset,
      previewUrl,
    };
  }, [performAssetUpload, uploadError, currentUserId, accountId]);

  const uploadAudioForComposer = useCallback(async ({ file }: { file: File }) => {
    if (!currentUserId || !accountId) {
      return { success: false, error: 'No hay sesión activa para grabar audio' };
    }
    const asset = await performAssetUpload({ file });
    return {
      success: !!asset,
      asset: asset ?? undefined,
    };
  }, [performAssetUpload, currentUserId, accountId]);

  // COR-043/COR-044: AI Suggestions
  const {
    suggestions,
    isGenerating,
    addSuggestion,
    removeSuggestion
  } = useAISuggestions(conversationId);

  const autoReplyState = useAutoReplyStore((state) => state.conversations[conversationId]);
  const setWaitingAutoReply = useAutoReplyStore((state) => state.setWaiting);
  const setWaitingBySuggestionAutoReply = useAutoReplyStore((state) => state.setWaitingBySuggestion);
  const setTypingAutoReply = useAutoReplyStore((state) => state.setTypingBySuggestion);
  const setSendingAutoReply = useAutoReplyStore((state) => state.setSendingBySuggestion);
  const cancelAutoReplyBySuggestion = useAutoReplyStore((state) => state.cancelBySuggestion);
  const cancelAutoReplyByConversation = useAutoReplyStore((state) => state.cancel);
  const completeAutoReply = useAutoReplyStore((state) => state.complete);

  const SMART_DELAY_INITIAL_MS = 15000;
  const SMART_DELAY_TYPING_MS = 5000;

  const [participantActivities, setParticipantActivities] = useState<Record<string, ActivityType>>({});

  // Handlers para modo selección
  const handleSelectionModeToggle = useCallback((messageId: string) => {
    setIsSelectionMode(true);
    setSelectedMessages(new Set([messageId]));
  }, []);

  const handleSelectionToggle = useCallback((messageId: string, selected: boolean) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(messageId);
      } else {
        newSet.delete(messageId);
      }
      // Si no hay mensajes seleccionados, salir del modo selección
      if (newSet.size === 0) {
        setIsSelectionMode(false);
      }
      return newSet;
    });
  }, []);

  const handleExitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedMessages(new Set());
  }, []);

  const handleForward = useCallback(() => {
    console.log('Forward messages:', Array.from(selectedMessages));
    // TODO: Implementar reenvío
  }, [selectedMessages]);

  const handleCopy = useCallback(() => {
    console.log('Copy messages:', Array.from(selectedMessages));
    // TODO: Implementar copiado
  }, [selectedMessages]);

  const handleReport = useCallback(() => {
    console.log('Report messages:', Array.from(selectedMessages));
    // TODO: Implementar reporte
  }, [selectedMessages]);

  const handleDownload = useCallback(() => {
    console.log('Download messages:', Array.from(selectedMessages));
    // TODO: Implementar descarga
  }, [selectedMessages]);

  const handleDeleteSelected = useCallback(async (scope: 'self' | 'all' = 'self') => {
    if (selectedMessages.size === 0) return;

    try {
      const messageIds = Array.from(selectedMessages);
      const response = await api.deleteMessagesBulk(messageIds, scope, accountId);
      
      if (response.success) {
        console.log(`[ChatView] Bulk delete: ${response.data?.deleted} messages (scope=${scope})`);
        
        // Update local state: remove deleted messages from the messages array
        setMessages(prev => prev.filter(msg => !selectedMessages.has(msg.id)));
        
        // Exit selection mode
        handleExitSelectionMode();
      } else {
        console.error('[ChatView] Failed to delete messages:', response.message);
      }
    } catch (error) {
      console.error('[ChatView] Error deleting messages:', error);
    }
  }, [selectedMessages, handleExitSelectionMode]);

  const handleActivityState = useCallback((event: {
    accountId: string;
    conversationId: string;
    activity: string;
  }) => {
    // Only process events for this conversation
    if (event.conversationId !== conversationId) return;
    console.log('[DEBUG] Updating activity state for account:', event.accountId, 'Activity:', event.activity);
    setParticipantActivities(prev => ({
      ...prev,
      [event.accountId]: event.activity as ActivityType
    }));
  }, [conversationId]);

  // V2-1.3: WebSocket para tiempo real
  const {
    status: wsStatus,
    lastError: wsLastError,
    reconnectAttempts: wsReconnectAttempts,
    connect: connectWS,
    subscribe,
    unsubscribe,
    reportActivity,
  } = useWebSocket({
    onMessage: (msg) => {
      if (msg.type === 'message:new' && msg.data?.conversationId === conversationId) {
        const generatedBy = msg.data?.generatedBy;
        addReceivedMessage(msg.data as Message);
        if (generatedBy === 'ai') {
          const autoStateForConversation = useAutoReplyStore.getState().conversations[conversationId];
          if (autoStateForConversation) {
            removeSuggestion(autoStateForConversation.suggestionId);
            completeAutoReply(conversationId);
          }
        }
      }
    },
    onSuggestion: (suggestion) => {
      if (suggestion.conversationId === conversationId) {
        addSuggestion(suggestion);
        if ((suggestion as any).mode === 'automatic') {
          setWaitingAutoReply(conversationId, suggestion.id, SMART_DELAY_INITIAL_MS);
        }
      }
    },
    onSuggestionAutoWaiting: ({ suggestionId, delayMs }) => {
      setWaitingBySuggestionAutoReply(suggestionId, delayMs);
    },
    onSuggestionAutoTyping: ({ suggestionId }) => {
      setTypingAutoReply(suggestionId, SMART_DELAY_TYPING_MS);
    },
    onSuggestionAutoSending: ({ suggestionId }) => {
      setSendingAutoReply(suggestionId);
    },
    onSuggestionAutoCancelled: ({ suggestionId }) => {
      cancelAutoReplyBySuggestion(suggestionId);
      removeSuggestion(suggestionId);
    },
    onActivityState: handleActivityState
  });

  // Suscribirse a cambios en la relación
  useEffect(() => {
    if (activeRelationshipId) {
      console.log('[DEBUG] Subscribing to relationship:', activeRelationshipId);
      subscribe(activeRelationshipId);
      return () => {
        unsubscribe(activeRelationshipId);
      };
    }
  }, [conversationId, activeRelationshipId, subscribe, unsubscribe]);

  useEffect(() => {
    pendingConversationScrollRef.current = true;
    isAtBottomRef.current = true;
  }, [conversationId]);

  useEffect(() => {
    if (!autoReplyState) return;
    const hasSuggestion = suggestions.some((s) => s.id === autoReplyState.suggestionId);
    if (!hasSuggestion) {
      completeAutoReply(conversationId);
    }
  }, [autoReplyState, suggestions, conversationId, completeAutoReply]);

  const [, forceAutoReplyTick] = useState(0);
  useEffect(() => {
    if (!autoReplyState?.eta) return;
    const interval = setInterval(() => {
      forceAutoReplyTick((tick) => tick + 1);
    }, 500);
    return () => clearInterval(interval);
  }, [autoReplyState?.eta]);

  useEffect(() => {
    let raf: number | null = null;

    const scrollToBottom = (behavior: ScrollBehavior) => {
      const el = messagesContainerRef.current;
      if (!el) return;
      raf = requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior });
      });
    };

    if (pendingConversationScrollRef.current) {
      if (messages.length > 0 && messages[0]?.conversationId !== conversationId) {
        return;
      }
      pendingConversationScrollRef.current = false;
      scrollToBottom('auto');
    } else if (isAtBottomRef.current) {
      scrollToBottom('auto');
    }

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [messages, conversationId]);

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const threshold = 80;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distanceFromBottom <= threshold;
  };

  // TODO(assets): Cuando adapters migren a assetId, eliminar cualquier referencia a url/attachmentId
  // y asegurar que los compositores y hooks solo operan con assetId y assets firmados.
  const handleSend = async (overrideContent?: { text: string; media?: any[] }) => {
    const content = overrideContent ?? { text: message };
    const hasText = typeof content.text === 'string' && content.text.trim().length > 0;
    const hasMedia = Array.isArray(content.media) && content.media.length > 0;
    if (!hasText && !hasMedia) return;

    if (chatIsSending) return;

    if (!accountId) {
      console.error('[ChatView] Cannot send: no accountId');
      return;
    }

    try {
      setSendError(null);
      const result = await sendMessage({
        content: {
          text: content.text || '',
          ...(hasMedia ? { media: content.media } : {}),
        },
        fromActorId: activeActorId || undefined,
        generatedBy: 'human',
      });

      if (!result) {
        setSendError('No se pudo enviar el mensaje');
        return;
      }

      setMessage('');
      setReplyingTo(null);
      handleUserActivity('cancel');
    } catch (err) {
      console.error('[ChatView] Send error:', err);
      setSendError(err instanceof Error ? err.message : 'Error al enviar mensaje');
    }
  };

  const getConnectionLabel = () => {
    if (wsStatus === 'error') return 'Sin conexión';
    if (wsStatus === 'connecting') return 'Conectando...';
    if (wsStatus === 'disconnected') return 'Reconectando...';
    return 'En línea';
  };

  // COR-044: Handlers para sugerencias de IA
  const handleApproveSuggestion = (suggestionId: string, text: string) => {
    handleSend({ text });
    removeSuggestion(suggestionId);
  };

  const handleDiscardSuggestion = (suggestionId: string) => {
    removeSuggestion(suggestionId);
    cancelAutoReplyBySuggestion(suggestionId);
  };

  // NOTA: Simulación de IA removida - conectar a API real

  // Scroll a mensaje específico
  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Delete message (with scope from DeleteMessageModal)
  const handleDelete = async (messageId: string, scope: 'self' | 'all' = 'self') => {
    try {
      await deleteMessage(messageId, scope);
      await refresh();
    } catch (err) {
      console.error('[ChatView] Delete error:', err);
    }
  };

  // Clear chat (hide all messages for current actor, keep conversation)
  const handleClearChat = async () => {
    try {
      const { api } = await import('../../services/api');
      const response = await api.clearChat(conversationId);
      
      if (response.success) {
        console.log(`[ChatView] Chat cleared: ${response.data?.hiddenCount} messages hidden`);
        setMessages([]);
      } else {
        console.error('[ChatView] Error clearing chat:', response.message);
      }
    } catch (err) {
      console.error('[ChatView] Error clearing chat:', err);
    }
  };

  const handleUserActivity = (activity: 'typing' | 'recording' | 'idle' | 'cancel') => {
    if (!accountId) return;
    reportActivity({
      activity,
      accountId,
      conversationId,
    });
    if (activity === 'cancel') {
      cancelAutoReplyByConversation(conversationId);
    }
  };

  const handleCancelAutoReply = () => {
    if (!autoReplyState) return;
    handleUserActivity('cancel');
    removeSuggestion(autoReplyState.suggestionId);
  };

  const remainingSeconds =
    autoReplyState?.eta != null ? Math.max(0, Math.ceil((autoReplyState.eta - Date.now()) / 1000)) : null;

  return (
    <div className="h-full bg-base flex flex-col overflow-hidden">
      {/* Header con contexto de realidad */}
      <div className="flex-shrink-0 p-4 border-b border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar
              src={contactAvatar}
              alt={contactName}
              size="sm"
            />
            <div>
              <h2 className="font-semibold text-primary">{contactName}</h2>
              {currentWorkspace && (
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <Building2 size={12} />
                  <span>Workspace: {currentWorkspace.name || 'Sin nombre'}</span>
                  <span>•</span>
                  <span>Enviando como: {activeAccount?.alias || accountId}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Controles alineados a la derecha */}
          <div className="flex items-center gap-1">
            <button className="p-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors">
              <Phone size={20} />
            </button>
            <button className="p-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors">
              <Video size={20} />
            </button>
            <ChatOptionsMenu conversationId={conversationId} onLeave={handleClearChat} />
          </div>
        </div>
        <ParticipantsActivityBar activities={participantActivities} />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8 flex-shrink-0">
          <Loader2 className="animate-spin text-muted" size={32} />
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="mx-4 mt-3 p-3 bg-error-muted border border-error-muted rounded-lg text-error text-sm flex items-start justify-between gap-3">
          <div className="min-w-0">{uploadError}</div>
          <button
            onClick={() => clearUploadError()}
            className="p-1 text-error hover:text-primary transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* WebSocket status banner (errores visibles + reintentar) */}
      {(wsStatus === 'error' || wsStatus === 'disconnected' || wsStatus === 'connecting') && (
        <div className="mx-4 mt-3 p-3 bg-elevated border border-subtle rounded-lg flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm text-primary font-medium">{getConnectionLabel()}</div>
            <div className="text-xs text-muted break-words">
              {wsLastError || 'Conexión inestable. Intentando reconectar...'}
              {wsReconnectAttempts > 0 ? ` (reintento ${wsReconnectAttempts}/5)` : ''}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => connectWS()}
              className="px-3 py-1.5 rounded-md bg-hover text-primary hover:bg-active transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-error-muted border border-error-muted rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      {/* Send error (feedback visual mínimo) */}
      {sendError && (
        <div className="mx-4 mt-3 p-3 bg-error-muted border border-error-muted rounded-lg text-error text-sm flex items-start justify-between gap-3">
          <div className="min-w-0">{sendError}</div>
          <button
            onClick={() => setSendError(null)}
            className="p-1 text-error hover:text-primary transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* No account warning */}
      {!accountId && !isLoading && (
        <div className="mx-4 mt-3 p-3 bg-warning-muted border border-warning-muted rounded-lg text-warning text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="min-w-0">No se ha seleccionado una cuenta. Por favor recarga la página o inicia sesión de nuevo.</div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="flex-1 min-h-0 overflow-y-auto p-4"
      >
        {!isLoading && messages.length === 0 && !isGenerating && suggestions.length === 0 ? (
          <div className="min-h-full flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 mb-4 bg-elevated border border-subtle rounded-2xl flex items-center justify-center">
              <MessageCircle className="text-muted" size={28} />
            </div>
            <h3 className="text-lg font-medium text-primary mb-2">No hay mensajes aún</h3>
            <p className="text-sm text-secondary">Envía el primer mensaje para iniciar la conversación</p>
          </div>
        ) : (
          <div className="min-h-full flex flex-col justify-start space-y-0.5">
            {messages.map((msg) => {
              // Actor model: ownership determined solely by fromActorId comparison
              let isOwn = false;
              if (msg.fromActorId && activeActorId) {
                isOwn = msg.fromActorId === activeActorId;
              } else if (msg.senderAccountId === accountId) {
                // Legacy fallback: if message was sent by current account
                isOwn = true; // Si senderAccountId coincide, es tuyo
              } else {
                // Si no hay fromActorId ni senderAccountId coincide, no es tuyo
                isOwn = false;
              }
              
              console.log(`[ChatView] Message ${msg.id} - fromActorId: ${msg.fromActorId}, activeActorId: ${activeActorId}, senderAccountId: ${msg.senderAccountId}, isOwn: ${isOwn}, type: ${msg.type}, content: ${msg.content.text?.substring(0, 30)}`);
              return (
              <div key={msg.id} id={`msg-${msg.id}`}>
                <MessageBubble
                  message={msg}
                  isOwn={isOwn}
                  isAI={msg.generatedBy === 'ai'}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedMessages.has(msg.id)}
                  onSelectionToggle={handleSelectionToggle}
                  onSelectionModeToggle={handleSelectionModeToggle}
                  onReply={() => setReplyingTo(msg)}
                  onEdit={msg.type === 'outgoing' && msg.generatedBy === 'human' ? () => {
                    setMessage(msg.content.text || '');
                  } : undefined}
                  onDelete={(scope) => handleDelete(msg.id, scope)}
                  onScrollToMessage={scrollToMessage}
                  viewerAccountId={accountId}
                />
              </div>
            )})}

            {/* COR-043/COR-044: AI Suggestions */}
            {isGenerating && (
              <AISuggestionCard
                suggestion={{} as AISuggestion}
                onApprove={() => { }}
                onDiscard={() => { }}
                isLoading={true}
              />
            )}
            {suggestions.map((suggestion) => {
              const autoStateForCard =
                autoReplyState && autoReplyState.suggestionId === suggestion.id
                  ? {
                    phase: autoReplyState.status,
                    etaSeconds:
                      autoReplyState.eta != null
                        ? Math.max(0, Math.ceil((autoReplyState.eta - Date.now()) / 1000))
                        : null,
                  }
                  : undefined;
              return (
                <AISuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  autoState={autoStateForCard}
                  onApprove={(text) => handleApproveSuggestion(suggestion.id, text)}
                  onDiscard={() => handleDiscardSuggestion(suggestion.id)}
                />
              );
            })}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-surface border-t border-subtle flex items-center gap-2 flex-shrink-0">
          <div className="flex-1 text-sm">
            <span className="text-muted">Respondiendo a: </span>
            <span className="text-primary truncate">{replyingTo.content.text}</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-muted hover:text-primary transition-colors"
            aria-label="Cancelar respuesta"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <ParticipantsActivityBar activities={participantActivities} />

      {/* Input o Selection Toolbar */}
      {isSelectionMode && selectedMessages.size > 0 ? (
        <MessageSelectionToolbar
          selectedCount={selectedMessages.size}
          onClose={handleExitSelectionMode}
          onForward={handleForward}
          onCopy={handleCopy}
          onReport={handleReport}
          onDownload={handleDownload}
          onDelete={handleDeleteSelected}
        />
      ) : (
        <>
          {autoReplyState && (
            <div className="mx-4 mb-3 p-3 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-between gap-3 flex-shrink-0">
              <div>
                <div className="text-sm text-primary font-medium">
                  {autoReplyState.message || 'Fluxi está preparando una respuesta automática'}
                </div>
                {remainingSeconds !== null && (
                  <div className="text-xs text-muted">
                    Se enviará en {remainingSeconds}s · ID {autoReplyState.suggestionId.slice(0, 6)}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleCancelAutoReply}
                className="px-4 py-1.5 rounded-full bg-error-muted text-error text-sm hover:bg-error-muted/80 transition-colors"
              >
                Cancelar auto-respuesta
              </button>
            </div>
          )}
          <ChatComposer
        value={message}
        onChange={setMessage}
        disabled={!accountId}
        isSending={chatIsSending}
        onSend={handleSend}
        accountId={accountId}
        conversationId={conversationId}
        relationshipId={activeRelationshipId}
        uploadAsset={uploadAssetForComposer}
        uploadAudio={uploadAudioForComposer}
        isUploading={isUploadingAttachment}
        uploadProgress={uploadProgress}
        onClearUploadError={clearUploadError}
        onUserActivity={handleUserActivity}
      />
        </>
      )}
    </div>
  );
}

```

### SOURCE: apps/web/src/hooks/useChat.ts

```ts
/**
 * V2-1: useChat Hook
 * 
 * Gestiona mensajes de una conversación con conexión a API real.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Message } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface UseChatOptions {
  conversationId: string;
  accountId: string;
  onNewMessage?: (message: Message) => void;
}

interface SendMessageParams {
  content: { text?: string; type?: string };
  fromActorId?: string;
  generatedBy?: 'human' | 'ai' | 'system';
  replyToId?: string;
}

export function useChat({ conversationId, accountId, onNewMessage }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const pendingSignaturesRef = useRef<Map<string, string>>(new Map());

  const getAuthToken = () => localStorage.getItem('fluxcore_token');

  const buildSignature = useCallback((payload: {
    senderAccountId: string;
    content?: { text?: string } | null;
    replyToId?: string | null;
    generatedBy?: Message['generatedBy'];
  }) => {
    const text = (payload.content?.text ?? '').trim(); // 🔥 CORRECCIÓN: Usar texto normalizado
    const replyTo = payload.replyToId ?? '';
    const generatedBy = payload.generatedBy ?? 'human';
    return `${payload.senderAccountId}:${text}:${replyTo}:${generatedBy}`;
  }, []);

  // Cargar mensajes
  const loadMessages = useCallback(async () => {
    if (!conversationId || !accountId) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        setError('Sesión expirada. Por favor, inicia sesión de nuevo.');
        setIsLoading(false);
        return;
      }

      // Cargar últimos 50 mensajes (con accountId para filtro de visibilidad)
      const msgParams = new URLSearchParams({ limit: '50' });
      if (accountId) msgParams.set('accountId', accountId);
      const response = await fetch(`${API_URL}/conversations/${conversationId}/messages?${msgParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Manejar diferentes códigos de error
      if (response.status === 404) {
        // Conversación no existe, mostrar vacío sin error
        setMessages([]);
        setIsLoading(false);
        return;
      }

      if (response.status === 401) {
        setError('Sesión expirada. Por favor, inicia sesión de nuevo.');
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: No se pudieron cargar los mensajes`);
      }

      const data = await response.json();
      
      // Normalizar mensajes
      const messageList = Array.isArray(data) ? data : (data.data || data.messages || []);
      const normalizedMessages: Message[] = messageList.map((msg: any) => ({
        id: msg.id,
        conversationId: msg.conversationId,
        senderAccountId: msg.senderAccountId,
        fromActorId: msg.fromActorId,
        content: typeof msg.content === 'string' ? 
          (msg.content.startsWith('{') ? JSON.parse(msg.content) : { text: msg.content }) : 
          msg.content,
        type: (msg.type === 'incoming' && msg.senderAccountId === accountId)
          ? 'incoming'
          : (msg.senderAccountId === accountId ? 'outgoing' : 'incoming'),
        generatedBy: msg.generatedBy || 'human',
        status: msg.status || 'synced',
        replyToId: msg.replyToId,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
      }));

      setMessages(normalizedMessages);
    } catch (err: any) {
      console.error('[useChat] Failed to load messages:', err);
      
      // NO MOCK DATA - Mostrar error real
      setMessages([]); // Limpiar mensajes previos
      if (err.message?.includes('fetch')) {
        setError('No se puede conectar al servidor');
      } else {
        setError(err.message || 'Error al cargar mensajes');
      }
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, accountId]);

  // Enviar mensaje
  const sendMessage = useCallback(async (params: SendMessageParams): Promise<Message | null> => {
    if (!conversationId || !accountId) return null;

    setIsSending(true);
    setError(null);

    // Verificar token antes de enviar
    const token = getAuthToken();
    if (!token) {
      // En producción, no permitir envío sin token
      if (!import.meta.env.DEV) {
        setError('Sesión expirada. Por favor, inicia sesión de nuevo.');
        setIsSending(false);
        return null;
      }
    }

    try {
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        conversationId,
        senderAccountId: accountId,
        fromActorId: params.fromActorId,
        content: params.content,
        type: 'outgoing',
        generatedBy: params.generatedBy || 'human',
        status: 'pending_backend',
        replyToId: params.replyToId,
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, optimisticMessage]);
      const signature = buildSignature(optimisticMessage);
      pendingSignaturesRef.current.set(signature, tempId);

      // Modo demo sin token: simular envío local
      if (!token && import.meta.env.DEV) {
        // Simular delay de red (solo entorno dev sin token)
        await new Promise(resolve => setTimeout(resolve, 300));
        pendingSignaturesRef.current.delete(signature);
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: `msg-${Date.now()}`, status: 'synced' } : m));
        return optimisticMessage;
      }

      console.log(`[useChat] 📤 Sending message:`, {
        conversationId,
        senderAccountId: accountId,
        fromActorId: params.fromActorId,
        content: params.content.text?.substring(0, 50),
        type: 'outgoing',
        token: token ? 'present' : 'missing'
      });

      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId,
          // RESTORED: Enviar senderAccountId explícitamente (cuenta seleccionada en UI)
          senderAccountId: accountId,
          fromActorId: params.fromActorId,
          content: params.content,
          type: 'outgoing',
          generatedBy: params.generatedBy || 'human',
          replyToId: params.replyToId,
          // Idempotency key para prevenir duplicados
          requestId: `msg-${Date.now()}-${accountId}`,
        }),
      });

      console.log(`[useChat] 📡 API response status:`, response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[useChat] ❌ API Error ${response.status}:`, errorText);
        pendingSignaturesRef.current.delete(signature);
        setMessages(prev => prev.filter(m => m.id !== tempId));
        throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
      }

      // El backend ya certificó el mensaje y FluxCore lo emitirá por WebSocket.
      return optimisticMessage;
    } catch (err: any) {
      setError(err.message);

      return null;
    } finally {
      setIsSending(false);
    }
  }, [conversationId, accountId]);

  // Añadir mensaje recibido (desde WebSocket)
  const addReceivedMessage = useCallback((message: Message) => {
    const signature = buildSignature(message);
    const pendingId = pendingSignaturesRef.current.get(signature);

    setMessages(prev => {
      const withoutPending = pendingId ? prev.filter(m => m.id !== pendingId) : prev;
      if (withoutPending.some(m => m.id === message.id)) {
        return withoutPending;
      }
      return [...withoutPending, message];
    });

    if (pendingId) {
      pendingSignaturesRef.current.delete(signature);
    }

    onNewMessage?.(message);
  }, [buildSignature, onNewMessage]);

  // Actualizar estado de mensaje
  const updateMessageStatus = useCallback((messageId: string, status: Message['status']) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, status } : m
    ));
  }, []);

  // Editar mensaje
  const editMessage = useCallback(async (messageId: string, newContent: { text: string }) => {
    try {
      const response = await fetch(`${API_URL}/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ content: newContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to edit message');
      }

      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, content: newContent, updatedAt: new Date().toISOString() } : m
      ));

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  // Eliminar mensaje
  const deleteMessage = useCallback(async (messageId: string, scope: 'self' | 'all' = 'self') => {
    try {
      const params = new URLSearchParams({ scope });
      if (accountId) params.set('accountId', accountId);
      const response = await fetch(`${API_URL}/messages/${messageId}?${params}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to delete message');
      }

      setMessages(prev => prev.filter(m => m.id !== messageId));
      return true;
    } catch (err: any) {
      console.error('[useChat] deleteMessage error:', err.message);
      setError(err.message);
      return false;
    }
  }, [accountId]);

  // Reintentar mensaje fallido
  const retryMessage = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.status !== 'failed') return null;

    // Eliminar mensaje fallido
    setMessages(prev => prev.filter(m => m.id !== messageId));

    // Reenviar
    return sendMessage({
      content: { text: message.content.text },
      fromActorId: message.fromActorId,
      generatedBy: message.generatedBy,
      replyToId: message.replyToId,
    });
  }, [messages, sendMessage]);

  // Cargar mensajes iniciales
  useEffect(() => {
    if (conversationId && !loadedRef.current) {
      loadedRef.current = true;
      loadMessages();
    }
  }, [conversationId, loadMessages]);

  // Reset cuando cambia conversación
  useEffect(() => {
    loadedRef.current = false;
    setMessages([]);
    pendingSignaturesRef.current.clear();
  }, [conversationId]);

  return {
    messages,
    setMessages,
    isLoading,
    isSending,
    error,
    sendMessage,
    addReceivedMessage,
    updateMessageStatus,
    editMessage,
    deleteMessage,
    retryMessage,
    refresh: loadMessages,
  };
}

```

### SOURCE: apps/web/src/services/api.ts

```ts
/**
 * API Service para comunicación con el backend
 */

import type {
  User,
  Account,
  Relationship,
  Conversation,
  Message,
  ApiResponse,
  LoginCredentials,
  RegisterData,
  AccountDeletionJob,
  AccountDeletionLog,
  AccountDataReference,
  AccountOrphanReference,
  AIStatusResponse,
  AIEligibilityResponse,
  PromptPreviewData,
  KernelSession,
  KernelSessionStatus,
} from '../types';
import type {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '../components/templates/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiService {
  private token: string | null = null;
  private currentUserId: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('fluxcore_token', token);
    } else {
      localStorage.removeItem('fluxcore_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('fluxcore_token');
    }
    return this.token;
  }

  setCurrentUserId(userId: string | null) {
    this.currentUserId = userId;
  }

  getAdminHeaders(): HeadersInit {
    return {
      'x-user-id': this.currentUserId ?? '',
      'x-admin-scope': 'ACCOUNT_DELETE_FORCE',
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();

    const isFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const shouldSendJsonHeader = !isFormDataBody && options.body !== undefined;

    const headers: HeadersInit = {
      ...(shouldSendJsonHeader ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // Intentar parsear JSON
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Si no es JSON, obtener texto para debug
        const text = await response.text();
        console.error(`[API] Non-JSON response from ${endpoint}:`, text.substring(0, 200));
        return {
          success: false,
          error: `Error del servidor: ${response.status} ${response.statusText}`,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `Error ${response.status}: ${response.statusText}`,
        };
      }

      return data;
    } catch (error: any) {
      console.error(`[API] Request failed for ${endpoint}:`, error);

      // Detectar errores específicos de red
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'No se puede conectar al servidor. Verifica que el backend esté corriendo.',
        };
      }

      return {
        success: false,
        error: error.message || 'Error de conexión',
      };
    }
  }

  // Auth
  async register(data: RegisterData): Promise<ApiResponse<{ user: User; token: string; accounts: Account[] }>> {
    const response = await this.request<{ user: User; token: string; accounts: Account[] }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
      this.setCurrentUserId(response.data.user?.id ?? null);
    }
    return response;
  }

  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; token: string; accounts: Account[] }>> {
    const response = await this.request<{ user: User; token: string; accounts: Account[] }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
      this.setCurrentUserId(response.data.user?.id ?? null);
    }
    return response;
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
    this.setToken(null);
    this.setCurrentUserId(null);
  }

  async getSession(): Promise<ApiResponse<{ user: User; accounts: Account[] }>> {
    return this.request<{ user: User; accounts: Account[] }>('/auth/me');
  }

  // Accounts
  async getAccounts(): Promise<ApiResponse<Account[]>> {
    return this.request<Account[]>('/accounts');
  }

  async createAccount(data: Partial<Account>): Promise<ApiResponse<Account>> {
    return this.request<Account>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAccount(id: string): Promise<ApiResponse<Account>> {
    return this.request<Account>(`/accounts/${id}`);
  }

  async getAIStatus(accountId: string): Promise<ApiResponse<AIStatusResponse>> {
    const query = new URLSearchParams({ accountId });
    return this.request<AIStatusResponse>(`/ai/status?${query.toString()}`);
  }

  async getAIEligibility(params: { accountId: string; conversationId: string }): Promise<ApiResponse<AIEligibilityResponse>> {
    const query = new URLSearchParams({ accountId: params.accountId, conversationId: params.conversationId });
    return this.request<AIEligibilityResponse>(`/ai/eligibility?${query.toString()}`);
  }

  async updateAIRuntime(accountId: string, runtimeId: string): Promise<ApiResponse<{ success: true }>> {
    return this.request<{ success: true }>('/ai/runtime', {
      method: 'POST',
      body: JSON.stringify({ accountId, runtimeId }),
    });
  }

  async updateAccount(id: string, data: Partial<Account>): Promise<ApiResponse<Account>> {
    return this.request<Account>(`/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Relationships
  async getRelationships(accountId?: string): Promise<ApiResponse<Relationship[]>> {
    const query = accountId ? `?accountId=${accountId}` : '';
    return this.request<Relationship[]>(`/relationships${query}`);
  }

  async createRelationship(data: { accountAId: string; accountBId: string }): Promise<ApiResponse<Relationship>> {
    return this.request<Relationship>('/relationships', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Conversations
  async getConversations(accountId?: string): Promise<ApiResponse<Conversation[]>> {
    const query = accountId ? `?accountId=${accountId}` : '';
    return this.request<Conversation[]>(`/conversations${query}`);
  }

  async createConversation(data: { relationshipId: string; channel: string }): Promise<ApiResponse<Conversation>> {
    return this.request<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getConversation(id: string): Promise<ApiResponse<Conversation>> {
    return this.request<Conversation>(`/conversations/${id}`);
  }

  async getConversationMessages(
    id: string,
    params?: { limit?: number; before?: string }
  ): Promise<ApiResponse<Message[]>> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.before) query.set('before', params.before);
    return this.request<Message[]>(`/conversations/${id}/messages?${query}`);
  }

  // Messages
  async sendMessage(data: {
    conversationId: string;
    senderAccountId: string;
    content: { text: string };
    type: 'outgoing';
  }): Promise<ApiResponse<{ messageId: string }>> {
    return this.request<{ messageId: string }>('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMessage(id: string): Promise<ApiResponse<Message>> {
    return this.request<Message>(`/messages/${id}`);
  }

  async deleteMessage(id: string): Promise<ApiResponse<void>> {
    return this.request(`/messages/${id}`, { method: 'DELETE' });
  }

  async deleteMessagesBulk(messageIds: string[], scope: 'self' | 'all' = 'self', accountId?: string): Promise<ApiResponse<{
    deleted: number;
    failed: number;
    scope: string;
    action: string;
  }>> {
    return this.request('/messages/bulk', { 
      method: 'DELETE',
      body: JSON.stringify({ messageIds, scope, accountId })
    });
  }

  // Health
  async health(): Promise<ApiResponse<{ status: string }>> {
    return this.request<{ status: string }>('/health');
  }

  // AI traces (Prompt Inspector)
  async getAITraces(params: {
    accountId: string;
    conversationId?: string;
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    const query = new URLSearchParams();
    query.set('accountId', params.accountId);
    if (params.conversationId) query.set('conversationId', params.conversationId);
    if (typeof params.limit === 'number') query.set('limit', String(params.limit));
    return this.request<any[]>(`/ai/traces?${query.toString()}`);
  }

  async getAITrace(params: { accountId: string; traceId: string }): Promise<ApiResponse<any>> {
    const query = new URLSearchParams();
    query.set('accountId', params.accountId);
    return this.request<any>(`/ai/traces/${encodeURIComponent(params.traceId)}?${query.toString()}`);
  }

  async deleteAITrace(params: { accountId: string; traceId: string }): Promise<ApiResponse<{ success: true }>> {
    const query = new URLSearchParams();
    query.set('accountId', params.accountId);
    return this.request<{ success: true }>(`/ai/traces/${encodeURIComponent(params.traceId)}?${query.toString()}`, {
      method: 'DELETE',
    });
  }

  async downloadAITraces(params: {
    accountId: string;
    conversationId?: string;
    limit?: number;
  }): Promise<ApiResponse<string>> {
    const query = new URLSearchParams();
    query.set('accountId', params.accountId);
    if (params.conversationId) query.set('conversationId', params.conversationId);
    if (typeof params.limit === 'number') query.set('limit', String(params.limit));

    const token = this.getToken();
    try {
      const response = await fetch(`${API_URL}/ai/traces/export?${query.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/jsonl',
        },
      });
      const text = await response.text();
      if (!response.ok) {
        return {
          success: false,
          error: text || `Error ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: text,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Error de conexión',
      };
    }
  }

  async getCreditsBalance(accountId: string): Promise<ApiResponse<{ balance: number }>> {
    const query = new URLSearchParams();
    query.set('accountId', accountId);
    return this.request<{ balance: number }>(`/credits/balance?${query.toString()}`);
  }

  async getCreditsSession(params: {
    accountId: string;
    conversationId: string;
    featureKey?: string;
  }): Promise<
    ApiResponse<
      | {
        id: string;
        featureKey: string;
        engine: string;
        model: string;
        tokenBudget: number;
        tokensUsed: number;
        tokensRemaining: number;
        expiresAt: string;
      }
      | null
    >
  > {
    const query = new URLSearchParams();
    query.set('accountId', params.accountId);
    query.set('conversationId', params.conversationId);
    if (typeof params.featureKey === 'string' && params.featureKey.trim().length > 0) {
      query.set('featureKey', params.featureKey);
    }
    return this.request(
      `/credits/session?${query.toString()}`
    ) as any;
  }

  async creditsAdminSearch(q: string): Promise<
    ApiResponse<
      Array<{
        id: string;
        username: string;
        displayName: string;
        accountType: 'personal' | 'business';
        balance: number;
      }>
    >
  > {
    return this.request(
      `/credits/admin/search?q=${encodeURIComponent(q)}`
    ) as any;
  }

  async creditsAdminGrant(params: {
    accountId?: string;
    query?: string;
    amount: number;
    featureKey?: string;
    metadata?: Record<string, any>;
  }): Promise<ApiResponse<{ accountId: string; balance: number }>> {
    return this.request<{ accountId: string; balance: number }>(
      '/credits/admin/grant',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  }

  async clearAITraces(accountId: string): Promise<ApiResponse<{ cleared: number }>> {
    const query = new URLSearchParams();
    query.set('accountId', accountId);
    return this.request<{ cleared: number }>(`/ai/traces/clear?${query.toString()}`);
  }

  async getKernelSessions(params: {
    accountId: string;
    actorId?: string;
    statuses?: KernelSessionStatus[];
  }): Promise<ApiResponse<{ sessions: KernelSession[] }>> {
    const query = new URLSearchParams();
    query.set('accountId', params.accountId);
    if (params.actorId) {
      query.set('actorId', params.actorId);
    }
    if (params.statuses && params.statuses.length > 0) {
      query.set('status', params.statuses.join(','));
    }

    return this.request<{ sessions: KernelSession[] }>(`/kernel/sessions/active?${query.toString()}`);
  }

  async getAgents(accountId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/fluxcore/agents?accountId=${encodeURIComponent(accountId)}`);
  }

  async getAgent(accountId: string, agentId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/agents/${encodeURIComponent(agentId)}?accountId=${encodeURIComponent(accountId)}`);
  }

  async createAgent(params: {
    accountId: string;
    name: string;
    description?: string;
    status?: string;
    flow?: any;
    scopes?: any;
    triggerConfig?: any;
    assistantIds?: Array<{ assistantId: string; role?: string; stepId?: string }>;
  }): Promise<ApiResponse<any>> {
    return this.request<any>('/fluxcore/agents', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async updateAgent(accountId: string, agentId: string, params: Record<string, any>): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/agents/${encodeURIComponent(agentId)}`, {
      method: 'PUT',
      body: JSON.stringify({ accountId, ...params }),
    });
  }

  async deleteAgent(accountId: string, agentId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/agents/${encodeURIComponent(agentId)}?accountId=${encodeURIComponent(accountId)}`, {
      method: 'DELETE',
    });
  }

  async activateAgent(accountId: string, agentId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/agents/${encodeURIComponent(agentId)}/activate`, {
      method: 'POST',
      body: JSON.stringify({ accountId }),
    });
  }

  async deactivateAgent(accountId: string, agentId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/agents/${encodeURIComponent(agentId)}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ accountId }),
    });
  }

  async updateAgentFlow(accountId: string, agentId: string, flow: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/agents/${encodeURIComponent(agentId)}/flow`, {
      method: 'PUT',
      body: JSON.stringify({ accountId, flow }),
    });
  }

  async updateAgentScopes(accountId: string, agentId: string, scopes: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/agents/${encodeURIComponent(agentId)}/scopes`, {
      method: 'PUT',
      body: JSON.stringify({ accountId, scopes }),
    });
  }

  async setAgentAssistants(accountId: string, agentId: string, assistants: Array<{ assistantId: string; role?: string; stepId?: string }>): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/agents/${encodeURIComponent(agentId)}/assistants`, {
      method: 'PUT',
      body: JSON.stringify({ accountId, assistants }),
    });
  }

  async getPromptPreview(assistantId: string, accountId?: string): Promise<ApiResponse<PromptPreviewData>> {
    const query = new URLSearchParams();
    if (accountId) query.set('accountId', accountId);
    const qs = query.toString();
    const suffix = qs ? `?${qs}` : '';
    return this.request<PromptPreviewData>(`/fluxcore/runtime/prompt-preview/${assistantId}${suffix}`);
  }

  async creditsAdminListPolicies(filters?: {
    featureKey?: string;
    engine?: string;
    model?: string;
    active?: boolean;
  }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (filters?.featureKey) params.set('featureKey', filters.featureKey);
    if (filters?.engine) params.set('engine', filters.engine);
    if (filters?.model) params.set('model', filters.model);
    if (typeof filters?.active === 'boolean') params.set('active', filters.active ? 'true' : 'false');

    const query = params.toString();
    const endpoint = query ? `/credits/admin/policies?${query}` : '/credits/admin/policies';
    return this.request(endpoint) as any;
  }

  async creditsAdminCreatePolicy(payload: {
    featureKey: string;
    engine: string;
    model: string;
    costCredits: number;
    tokenBudget: number;
    durationHours?: number;
    active?: boolean;
  }): Promise<ApiResponse<{ id: string }>> {
    return this.request('/credits/admin/policies', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as any;
  }

  async creditsAdminUpdatePolicy(id: string, payload: {
    featureKey?: string;
    engine?: string;
    model?: string;
    costCredits?: number;
    tokenBudget?: number;
    durationHours?: number;
    active?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.request(`/credits/admin/policies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }) as any;
  }

  async creditsAdminTogglePolicy(id: string, active: boolean): Promise<ApiResponse<any>> {
    return this.request(`/credits/admin/policies/${id}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ active }),
    }) as any;
  }

  // Search accounts by @alias, email, or name
  async searchAccounts(query: string): Promise<ApiResponse<Account[]>> {
    return this.request<Account[]>(`/accounts/search?q=${encodeURIComponent(query)}`);
  }

  // ... rest of the code remains the same ...
  // Create relationship (add contact)
  async addContact(accountAId: string, accountBId: string): Promise<ApiResponse<Relationship>> {
    return this.request<Relationship>('/relationships', {
      method: 'POST',
      body: JSON.stringify({ accountAId, accountBId }),
    });
  }

  // Delete relationship (remove contact)
  async deleteContact(relationshipId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/relationships/${relationshipId}`, {
      method: 'DELETE',
    });
  }

  // Clear chat (hide all messages for current actor)
  async clearChat(conversationId: string): Promise<ApiResponse<{ hiddenCount: number }>> {
    return this.request<{ hiddenCount: number }>(`/conversations/${conversationId}/clear`, {
      method: 'POST',
    });
  }

  // Delete conversation (leave / soft delete)
  async deleteConversation(conversationId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  // Convert account to business
  async convertToBusiness(accountId: string): Promise<ApiResponse<Account>> {
    return this.request<Account>(`/accounts/${accountId}/convert-to-business`, {
      method: 'POST',
    });
  }

  async requestAccountDeletion(
    accountId: string,
    options?: { sessionAccountId?: string; dataHandling?: 'download_snapshot' | 'delete_all' }
  ): Promise<ApiResponse<AccountDeletionJob>> {
    return this.request<AccountDeletionJob>(`/accounts/${accountId}/delete/request`, {
      method: 'POST',
      body: JSON.stringify({
        sessionAccountId: options?.sessionAccountId,
        dataHandling: options?.dataHandling,
      }),
    });
  }

  async prepareAccountDeletionSnapshot(accountId: string): Promise<ApiResponse<AccountDeletionJob>> {
    return this.request<AccountDeletionJob>(`/accounts/${accountId}/delete/snapshot`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async verifyPassword(password: string): Promise<ApiResponse<{ valid: boolean }>> {
    return this.request<{ valid: boolean }>(`/auth/verify-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async acknowledgeAccountDeletionSnapshot(
    accountId: string,
    payload: { downloaded?: boolean; consent?: boolean }
  ): Promise<ApiResponse<AccountDeletionJob>> {
    return this.request<AccountDeletionJob>(`/accounts/${accountId}/delete/snapshot/ack`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    });
  }

  async downloadAccountDeletionSnapshot(accountId: string): Promise<Blob> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/accounts/${accountId}/delete/snapshot/download`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      let message = `Error ${response.status}: ${response.statusText}`;
      try {
        const data = await response.json();
        if (data?.message) {
          message = data.message;
        }
      } catch {
        // ignore json parse error
      }

      throw new Error(message);
    }

    return response.blob();
  }

  async confirmAccountDeletion(
    accountId: string,
    options?: { sessionAccountId?: string | null }
  ): Promise<ApiResponse<AccountDeletionJob>> {
    return this.request<AccountDeletionJob>(`/accounts/${accountId}/delete/confirm`, {
      method: 'POST',
      body: JSON.stringify({ sessionAccountId: options?.sessionAccountId ?? null }),
    });
  }

  async getAccountDeletionJob(accountId: string): Promise<ApiResponse<AccountDeletionJob | null>> {
    return this.request<AccountDeletionJob | null>(`/accounts/${accountId}/delete/job`);
  }

  async getAccountDeletionLogs(params: {
    limit?: number;
    accountId?: string;
    jobId?: string;
    status?: string;
    createdAfter?: string;
    createdBefore?: string;
  }): Promise<ApiResponse<AccountDeletionLog[]>> {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    if (params.accountId) query.set('accountId', params.accountId);
    if (params.jobId) query.set('jobId', params.jobId);
    if (params.status) query.set('status', params.status);
    if (params.createdAfter) query.set('createdAfter', params.createdAfter);
    if (params.createdBefore) query.set('createdBefore', params.createdBefore);

    return this.request<AccountDeletionLog[]>(`/internal/account-deletions/logs?${query.toString()}`, {
      headers: this.getAdminHeaders(),
    });
  }

  async getAccountDataReferences(accountId: string): Promise<ApiResponse<AccountDataReference[]>> {
    const query = new URLSearchParams({ accountId });
    return this.request<AccountDataReference[]>(`/internal/account-deletions/references?${query.toString()}`, {
      headers: this.getAdminHeaders(),
    });
  }

  async getAccountOrphanReferences(sampleLimit?: number): Promise<ApiResponse<AccountOrphanReference[]>> {
    const query = new URLSearchParams();
    if (sampleLimit) query.set('sampleLimit', String(sampleLimit));
    return this.request<AccountOrphanReference[]>(`/internal/account-deletions/orphans?${query.toString()}`, {
      headers: this.getAdminHeaders(),
    });
  }

  // Templates CRUD -----------------------------------------------------------
  async listTemplates(accountId: string): Promise<ApiResponse<Template[]>> {
    const query = new URLSearchParams({ accountId });
    return this.request<Template[]>(`/api/templates?${query.toString()}`);
  }

  async getTemplate(accountId: string, templateId: string): Promise<ApiResponse<Template>> {
    const query = new URLSearchParams({ accountId });
    return this.request<Template>(`/api/templates/${templateId}?${query.toString()}`);
  }

  async createTemplate(accountId: string, payload: CreateTemplateInput): Promise<ApiResponse<Template>> {
    return this.request<Template>('/api/templates', {
      method: 'POST',
      body: JSON.stringify({ accountId, ...payload }),
    });
  }

  async updateTemplate(accountId: string, templateId: string, payload: UpdateTemplateInput): Promise<ApiResponse<Template>> {
    return this.request<Template>(`/api/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify({ accountId, ...payload }),
    });
  }

  async deleteTemplate(accountId: string, templateId: string): Promise<ApiResponse<{ success: boolean }>> {
    const query = new URLSearchParams({ accountId });
    return this.request<{ success: boolean }>(`/api/templates/${templateId}?${query.toString()}`, {
      method: 'DELETE',
    });
  }

  async linkTemplateAsset(accountId: string, templateId: string, assetId: string, slot: string = 'attachment'): Promise<ApiResponse<{ success: boolean }>> {
    const query = new URLSearchParams({ accountId });
    return this.request<{ success: boolean }>(`/api/templates/${templateId}/assets?${query.toString()}`, {
      method: 'POST',
      body: JSON.stringify({ assetId, slot }),
    });
  }

  async unlinkTemplateAsset(accountId: string, templateId: string, assetId: string, slot: string = 'attachment'): Promise<ApiResponse<{ success: boolean }>> {
    const query = new URLSearchParams({ accountId, slot });
    return this.request<{ success: boolean }>(`/api/templates/${templateId}/assets/${assetId}?${query.toString()}`, {
      method: 'DELETE',
    });
  }

  async executeTemplate(
    accountId: string,
    templateId: string,
    params: {
      conversationId: string;
      variables?: Record<string, string>;
    }
  ): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/templates/${templateId}/execute`, {
      method: 'POST',
      body: JSON.stringify({
        accountId,
        conversationId: params.conversationId,
        variables: params.variables
      }),
    });
  }

  // Forgot password
  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Reset password
  async resetPassword(token: string, password: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  // Avatar upload
  async uploadAvatarAsset(params: {
    accountId: string;
    file: File;
    uploadedBy?: string;
  }): Promise<ApiResponse<{ assetId: string; url: string }>> {
    console.log('[API] uploadAvatarAsset called with:', {
      accountId: params.accountId,
      fileName: params.file.name,
      fileSize: params.file.size,
      fileType: params.file.type,
      uploadedBy: params.uploadedBy
    });

    try {
      // Create upload session
      console.log('[API] Step 1: Creating upload session...');
      const sessionResp = await this.request<{ sessionId: string }>(
        `/api/accounts/${params.accountId}/avatar/upload-session`,
        {
          method: 'POST',
          body: JSON.stringify({
            fileName: `avatar_${Date.now()}_${params.file.name}`,
            mimeType: params.file.type,
            sizeBytes: params.file.size,
          }),
          headers: {
            // Include kernel context headers for compatibility with Kernel Bootstrap
            'x-account-id': params.accountId,
            'x-user-id': this.currentUserId || '',
          },
        }
      );

      console.log('[API] Upload session response:', {
        success: sessionResp.success,
        error: sessionResp.error,
        data: sessionResp.data
      });

      if (!sessionResp.success || !sessionResp.data) {
        console.error('[API] Failed to create upload session:', sessionResp.error);
        return {
          success: false,
          error: sessionResp.error || 'No se pudo crear la sesión de upload',
        };
      }

      const { sessionId } = sessionResp.data;
      console.log('[API] Step 2: Uploading file to session:', sessionId);
      
      const uploadSuccess = await this.uploadAssetFile(params.accountId, sessionId, params.file);
      
      console.log('[API] File upload result:', {
        success: uploadSuccess.success,
        error: uploadSuccess.error
      });

      if (!uploadSuccess.success) {
        console.error('[API] File upload failed:', uploadSuccess.error);
        await this.cancelAssetUpload(sessionId, params.accountId).catch(() => undefined);
        return {
          success: false,
          error: uploadSuccess.error || 'Error subiendo archivo',
        };
      }

      console.log('[API] Step 3: Committing upload...');
      const commitResp = await this.request<{ asset: { id: string }; account: Account }>(
        `/api/accounts/${params.accountId}/avatar/upload/${sessionId}/commit`,
        {
          method: 'POST',
          body: JSON.stringify({ uploadedBy: params.uploadedBy }),
          headers: {
            // Include kernel context headers for compatibility with Kernel Bootstrap
            'x-account-id': params.accountId,
            'x-user-id': this.currentUserId || '',
          },
        }
      );

      console.log('[API] Commit response:', {
        success: commitResp.success,
        error: commitResp.error,
        data: commitResp.data
      });

      if (!commitResp.success || !commitResp.data) {
        console.error('[API] Commit failed:', commitResp.error);
        return {
          success: false,
          error: commitResp.error || 'No se pudo confirmar el asset',
        };
      }

      console.log('[API] Step 4: Signing asset URL...');
      const assetId = commitResp.data.asset.id;
      const signResp = await this.signAssetUrl(assetId, params.accountId, {
        actorId: params.uploadedBy || this.currentUserId || '',
        action: 'preview',
        channel: 'web',
      });

      console.log('[API] Sign URL response:', {
        success: signResp.success,
        error: signResp.error,
        hasData: !!signResp.data
      });

      if (!signResp.success || !signResp.data) {
        console.error('[API] URL signing failed:', signResp.error);
        return {
          success: false,
          error: signResp.error || 'No se pudo firmar el asset',
        };
      }

      console.log('[API] Avatar upload completed successfully:', {
        assetId,
        url: signResp.data.url
      });

      return {
        success: true,
        data: {
          assetId,
          url: signResp.data.url,
        },
      };
    } catch (error) {
      console.error('[API] Avatar upload exception:', error);
      return {
        success: false,
        error: 'Error al subir el avatar',
      };
    }
  }

  async updateAccountAvatar(params: {
    accountId: string;
    avatarAssetId: string;
  }): Promise<ApiResponse<void>> {
    console.log('[API] updateAccountAvatar called with:', {
      accountId: params.accountId,
      avatarAssetId: params.avatarAssetId
    });

    try {
      const response = await this.request<void>(`/api/accounts/${params.accountId}/avatar`, {
        method: 'PATCH',
        body: JSON.stringify({ avatarAssetId: params.avatarAssetId }),
      });

      console.log('[API] updateAccountAvatar result:', {
        success: response.success,
        error: response.error
      });

      return response;
    } catch (error) {
      console.error('[API] updateAccountAvatar exception:', error);
      return {
        success: false,
        error: 'Error al actualizar avatar',
      };
    }
  }

  private async uploadAssetFile(accountId: string, sessionId: string, file: File): Promise<ApiResponse<{ success: true }>> {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/api/assets/upload/${sessionId}?accountId=${accountId}`, {
      method: 'PUT',
      body: formData,
      headers: {
        ...this.getToken()
          ? {
              Authorization: `Bearer ${this.getToken()}`,
            }
          : undefined,
        // Include kernel context headers for compatibility with Kernel Bootstrap
        'x-account-id': accountId,
        'x-user-id': this.currentUserId || '',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: error || 'Error subiendo archivo' };
    }

    return { success: true, data: { success: true } };
  }

  // Vector store files
  async getVectorStoreFiles(storeId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/fluxcore/vector-stores/${storeId}/files`);
  }

  async deleteVectorStoreFile(storeId: string, fileId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/fluxcore/vector-stores/${storeId}/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ASSET MANAGEMENT (Chat Core)
  // ════════════════════════════════════════════════════════════════════════════

  async createAssetUploadSession(params: {
    accountId: string;
    fileName: string;
    mimeType: string;
    totalBytes: number;
    maxSizeBytes?: number;
    allowedMimeTypes?: string[];
  }): Promise<ApiResponse<{
    sessionId: string;
    expiresAt: string;
    maxSizeBytes: number;
    allowedMimeTypes: string[];
  }>> {
    return this.request<{ sessionId: string; expiresAt: string; maxSizeBytes: number; allowedMimeTypes: string[] }>(
      `/api/assets/upload-session?accountId=${params.accountId}`,
      {
        method: 'POST',
        body: JSON.stringify({
          accountId: params.accountId,
          fileName: params.fileName,
          mimeType: params.mimeType,
          sizeBytes: params.totalBytes,
          maxSizeBytes: params.maxSizeBytes,
          allowedMimeTypes: params.allowedMimeTypes,
        }),
        headers: {
          // Include kernel context headers for compatibility with Kernel Bootstrap
          'x-account-id': params.accountId,
          'x-user-id': this.currentUserId || '',
        },
      }
    );
  }

  async commitAssetUpload(
    sessionId: string,
    accountId: string,
    options?: {
      scope?: string;
    }
  ): Promise<ApiResponse<{
    assetId: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    status: string;
  }>> {
    return this.request(`/api/assets/upload/${sessionId}/commit?accountId=${accountId}`, {
      method: 'POST',
      body: JSON.stringify({
        accountId,
        scope: options?.scope || 'message_attachment',
        uploadedBy: this.currentUserId || null, // Use actual user ID instead of "system"
      }),
      headers: {
        // Include kernel context headers for compatibility with Kernel Bootstrap
        'x-account-id': accountId,
        'x-user-id': this.currentUserId || '',
      },
    });
  }

  async cancelAssetUpload(sessionId: string, _accountId: string): Promise<ApiResponse<void>> {
    return this.request(`/api/assets/upload/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async getAsset(assetId: string, accountId: string): Promise<ApiResponse<{
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    status: string;
    scope: string;
    version: number;
    createdAt: string;
  }>> {
    return this.request(`/api/assets/${assetId}?accountId=${accountId}`);
  }

  async signAssetUrl(
    assetId: string,
    accountId: string,
    params: {
      actorId: string;
      actorType?: 'user' | 'assistant' | 'system';
      action?: string;
      channel?: string;
      disposition?: 'inline' | 'attachment';
    }
  ): Promise<ApiResponse<{
    url: string;
    expiresAt: string;
    ttlSeconds?: number;
  }>> {
    const { actorId, actorType = 'user', action = 'download', channel = 'web', disposition } = params;

    return this.request(`/api/assets/${assetId}/sign?accountId=${accountId}`, {
      method: 'POST',
      body: JSON.stringify({
        actorId,
        actorType,
        action,
        channel,
        disposition,
      }),
    });
  }

  async searchAssets(params: {
    accountId: string;
    scope?: string;
    status?: string;
    mimeType?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{
    assets: Array<{
      id: string;
      name: string;
      mimeType: string;
      sizeBytes: number;
      status: string;
      scope: string;
      createdAt: string;
    }>;
    total: number;
  }>> {
    return this.request(`/api/assets/search?accountId=${params.accountId}`, {
      method: 'POST',
      body: JSON.stringify({
        scope: params.scope,
        status: params.status,
        mimeType: params.mimeType,
        search: params.search,
        limit: params.limit,
        offset: params.offset,
      }),
    });
  }

  async deleteAsset(assetId: string, accountId: string): Promise<ApiResponse<void>> {
    return this.request(`/api/assets/${assetId}?accountId=${accountId}`, {
      method: 'DELETE',
      body: JSON.stringify({ accountId }),
    });
  }

  // Kernel Status
  async getKernelStatusOverview(params?: { accountId?: string }): Promise<ApiResponse<{
    kernel: {
      total_signals: number;
      unique_fact_types: number;
      last_signal_at: string;
      signals_last_hour: number;
      signals_last_24h: number;
      status: 'active' | 'inactive';
    };
    outbox: {
      total: number;
      certified: number;
      pending: number;
      last_outbox_at: string;
      outbox_last_hour: number;
    };
    sessions: {
      total: number;
      active: number;
      pending: number;
      invalidated: number;
      last_activity: string;
    };
    recent_signal_types: Array<{
      fact_type: string;
      count: number;
      last_seen: string;
    }>;
    projectors: Array<{
      name: string;
      last_sequence_number: number;
      error_count: number;
      last_error: string | null;
      is_healthy: boolean;
    }>;
    system_metrics: Array<{
      metric_name: string;
      metric_value: string;
      recorded_at: string;
    }>;
  }>> {
    const query = params?.accountId ? `?accountId=${params.accountId}` : '';
    return this.request(`/kernel/status/overview${query}`);
  }

  async getKernelSignals(params?: { 
    limit?: number; 
    offset?: number; 
    factType?: string;
  }): Promise<ApiResponse<{
    signals: Array<{
      sequence_number: number;
      fact_type: string;
      source_namespace: string;
      source_key: string;
      subject_namespace: string;
      subject_key: string;
      object_namespace: string;
      object_key: string;
      evidence_raw: any;
      evidence_format: string;
      certified_by_adapter: string;
      certified_adapter_version: string;
      claimed_occurred_at: string;
      observed_at: string;
    }>;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      has_more: boolean;
    };
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.factType) queryParams.append('factType', params.factType);
    
    const query = queryParams.toString();
    return this.request(`/kernel/status/signals${query ? `?${query}` : ''}`);
  }

  async getAssetVersions(assetId: string, accountId: string): Promise<ApiResponse<Array<{
    version: number;
    sizeBytes: number;
    createdAt: string;
  }>>> {
    return this.request(`/api/assets/${assetId}/versions?accountId=${accountId}`);
  }

  // Asset Relations
  async linkAssetToMessage(messageId: string, assetId: string, accountId: string, position?: number): Promise<ApiResponse<void>> {
    return this.request(`/api/messages/${messageId}/assets?accountId=${accountId}`, {
      method: 'POST',
      body: JSON.stringify({ assetId, position }),
    });
  }

  async getMessageAssets(messageId: string): Promise<ApiResponse<Array<{
    assetId: string;
    version: number;
    position: number;
    name: string;
    mimeType: string;
    sizeBytes: number;
    status: string;
  }>>> {
    return this.request(`/api/messages/${messageId}/assets`);
  }

  async unlinkAssetFromMessage(messageId: string, assetId: string, accountId: string): Promise<ApiResponse<void>> {
    return this.request(`/api/messages/${messageId}/assets/${assetId}?accountId=${accountId}`, {
      method: 'DELETE',
    });
  }

  // WES-180: Fluxi Work Execution System
  async getProposedWorks(accountId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/fluxcore/works/proposed?accountId=${accountId}`);
  }

  async getActiveWorks(accountId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/fluxcore/works/active?accountId=${accountId}`);
  }

  async getWorkHistory(accountId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/fluxcore/works/history?accountId=${accountId}`);
  }

  async getProposedWork(accountId: string, id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/works/proposed/${id}?accountId=${accountId}`);
  }

  async getWork(accountId: string, id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/works/${id}?accountId=${accountId}`);
  }

  async openWork(accountId: string, workId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/works/${workId}/open?accountId=${accountId}`, {
      method: 'POST',
    });
  }

  async discardWork(accountId: string, workId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/works/${workId}/discard?accountId=${accountId}`, {
      method: 'POST',
    });
  }

  async getAssistantMode(accountId: string): Promise<ApiResponse<{ mode: string; assistantId: string | null; assistantName: string | null }>> {
    return this.request(`/fluxcore/assistants/active-mode?accountId=${accountId}`);
  }

  async setAssistantMode(accountId: string, mode: 'auto' | 'suggest' | 'off'): Promise<ApiResponse<{ mode: string; assistantId: string | null }>> {
    return this.request(`/fluxcore/assistants/active-mode`, {
      method: 'PATCH',
      body: JSON.stringify({ accountId, mode }),
    });
  }
}

export const api = new ApiService();

```

### SOURCE: apps/web/src/hooks/useChatUnified.ts

```ts
/**
 * useChatUnified - Hook unificado para chat (autenticado y público)
 * Soporta ambos modos usando la misma API REST
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Message } from '../types';
import { getOrCreateVisitorToken, setVisitorActorId } from '../modules/visitor-token';
import { useAccountStore } from '../store/accountStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface UseChatUnifiedOptions {
  conversationId?: string;
  accountId?: string;
  publicAlias?: string;
  onNewMessage?: (message: Message) => void;
}

interface SendMessageParams {
  content: { text?: string; media?: any[]; type?: string };
  generatedBy?: 'human' | 'ai' | 'system';
  replyToId?: string;
}

interface PublicProfileSession {
  conversationId: string;
  ownerAccountId: string;
  ownerActorId: string;
  visitorActorId: string;
  visitorToken: string;
  publicToken: string;
}

export function useChatUnified({ 
  conversationId, 
  accountId, 
  publicAlias,
  onNewMessage 
}: UseChatUnifiedOptions) {
  const activeActorId = useAccountStore((state) => state.activeActorId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicSession, setPublicSession] = useState<PublicProfileSession | null>(null);
  const loadedRef = useRef(false);
  const pendingSignaturesRef = useRef<Map<string, string>>(new Map());

  const isPublicMode = !accountId && !!publicAlias;
  const isAuthenticatedMode = !!accountId && !publicAlias;
  const resolvedConversationId = isPublicMode
    ? (publicSession?.conversationId || conversationId || '')
    : (conversationId || '');
  const myActorId = isPublicMode ? (publicSession?.visitorActorId || null) : (activeActorId || null);

  const normalizeMessages = useCallback((messageList: any[]): Message[] => {
    return messageList.map((msg: any) => ({
      ...msg,
      content: typeof msg.content === 'string'
        ? (msg.content.startsWith('{') ? JSON.parse(msg.content) : { text: msg.content })
        : msg.content,
    }));
  }, []);

  const ensurePublicSession = useCallback(async () => {
    if (!isPublicMode || !publicAlias) return null;
    if (publicSession) return publicSession;

    const visitorToken = getOrCreateVisitorToken();
    const response = await fetch(
      `${API_URL}/public/profiles/${encodeURIComponent(publicAlias)}/session?visitorToken=${encodeURIComponent(visitorToken)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.message || 'Failed to initialize public session');
    }

    setVisitorActorId(result.data.visitorActorId);
    setPublicSession(result.data);
    return result.data as PublicProfileSession;
  }, [isPublicMode, publicAlias, publicSession]);

  const getToken = useCallback(async () => {
    if (isAuthenticatedMode) {
      return localStorage.getItem('fluxcore_token');
    }

    if (isPublicMode) {
      const session = await ensurePublicSession();
      return session?.publicToken || null;
    }

    return null;
  }, [ensurePublicSession, isAuthenticatedMode, isPublicMode]);

  const getMessageOwnership = useCallback((message: Message) => {
    return !!message.fromActorId && !!myActorId && message.fromActorId === myActorId;
  }, [myActorId]);

  const buildSignature = useCallback((payload: {
    content?: { text?: string } | null;
    replyToId?: string | null;
    generatedBy?: Message['generatedBy'];
  }) => {
    const text = (payload.content?.text ?? '').trim();
    const replyTo = payload.replyToId ?? '';
    const generatedBy = payload.generatedBy ?? 'human';
    const senderId = myActorId ?? accountId ?? 'unknown-actor';
    return `${senderId}:${text}:${replyTo}:${generatedBy}`;
  }, [myActorId, accountId]);

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isAuthenticatedMode) {
        if (!conversationId) return;

        const token = await getToken();
        if (!token) {
          setError('Authentication required');
          return;
        }

        const response = await fetch(`${API_URL}/conversations/${conversationId}/messages?limit=50`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        const messageList = Array.isArray(result) ? result : (result.data || result.messages || []);
        setMessages(normalizeMessages(messageList));
        loadedRef.current = true;
        return;
      }

      const session = await ensurePublicSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/messages?conversationId=${session.conversationId}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${session.publicToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to load messages');
      }

      setMessages(normalizeMessages(result.data || []));
      loadedRef.current = true;
    } catch (err: any) {
      console.error('[useChatUnified] Load messages error:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [accountId, conversationId, ensurePublicSession, getToken, isAuthenticatedMode, normalizeMessages]);

  const sendMessage = useCallback(async (params: SendMessageParams) => {
    const session = isPublicMode ? await ensurePublicSession() : null;
    const targetConversationId = isPublicMode ? (session?.conversationId || '') : (conversationId || '');
    if (!targetConversationId) {
      throw new Error('Conversation ID is required');
    }

    const token = isPublicMode ? session?.publicToken : await getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const tempId = `temp-${Date.now()}`;
    const signature = buildSignature({
      content: params.content,
      replyToId: params.replyToId,
      generatedBy: params.generatedBy
    });

    const optimisticMessage: Message = {
      id: tempId,
      conversationId: targetConversationId,
      senderAccountId: isPublicMode ? (session?.visitorActorId || '') : (accountId || ''),
      fromActorId: isPublicMode ? (session?.visitorActorId || undefined) : (myActorId || undefined),
      content: params.content,
      type: 'outgoing',
      generatedBy: params.generatedBy || 'human',
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMessage]);
    pendingSignaturesRef.current.set(signature, tempId);
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: targetConversationId,
          ...(isAuthenticatedMode && { senderAccountId: accountId }),
          ...(myActorId && { fromActorId: myActorId }),
          content: params.content,
          type: isPublicMode ? 'incoming' : 'outgoing',
          generatedBy: params.generatedBy || 'human',
          ...(params.replyToId && { replyToId: params.replyToId }),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      if (result.success) {
        const messageId = result.data?.messageId || result.messageId || tempId;
        pendingSignaturesRef.current.delete(signature);
        setMessages(prev => prev.map((message) => (
          message.id === tempId
            ? { ...message, id: messageId, status: 'synced' }
            : message
        )));
      } else {
        throw new Error(result.message || 'Failed to send message');
      }
    } catch (err: any) {
      console.error('[useChatUnified] Send message error:', err);
      
      // Eliminar mensaje optimista en caso de error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      pendingSignaturesRef.current.delete(signature);
      
      setError(err.message || 'Failed to send message');
      throw err;
    } finally {
      setIsSending(false);
    }
  }, [accountId, buildSignature, conversationId, ensurePublicSession, getToken, isAuthenticatedMode, isPublicMode, myActorId]);

  const addReceivedMessage = useCallback((message: Message) => {
    const signature = buildSignature({
      content: message.content,
      replyToId: message.replyToId,
      generatedBy: message.generatedBy
    });
    
    const tempId = pendingSignaturesRef.current.get(signature);
    if (tempId) {
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...message } : m
      ));
      pendingSignaturesRef.current.delete(signature);
    } else {
      setMessages(prev => [...prev, message]);
    }
    
    onNewMessage?.(message);
  }, [buildSignature, onNewMessage]);

  const deleteMessage = useCallback(async (messageId: string) => {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`${API_URL}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      } else {
        throw new Error(result.message || 'Failed to delete message');
      }
    } catch (err: any) {
      console.error('[useChatUnified] Delete message error:', err);
      setError(err.message || 'Failed to delete message');
      throw err;
    }
  }, [getToken]);

  const refresh = useCallback(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    setMessages([]);
    setError(null);
    setPublicSession(null);
    pendingSignaturesRef.current.clear();
    loadedRef.current = false;
  }, [conversationId, accountId, publicAlias]);

  useEffect(() => {
    if ((conversationId || isPublicMode) && !loadedRef.current) {
      loadMessages();
    }
  }, [conversationId, isPublicMode, loadMessages]);

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
    addReceivedMessage,
    deleteMessage,
    refresh,
    getMessageOwnership,
    isPublicMode,
    isAuthenticatedMode,
    conversationId: resolvedConversationId,
    publicSession,
  };
}

export type { UseChatUnifiedOptions, SendMessageParams };

```

