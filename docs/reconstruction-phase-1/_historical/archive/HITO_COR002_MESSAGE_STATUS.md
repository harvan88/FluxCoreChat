# Hito COR-002: Status en Messages

> **Estado**: ✅ Completado  
> **Fecha**: 2025-12-06  
> **Prioridad**: Crítica (habilita offline-first)

## Resumen

Añade campo `status` a la tabla `messages` para trackear el estado de sincronización/entrega de cada mensaje.

---

## Problema Identificado

**Antes de COR-002:**
- Los mensajes no tenían estado de sincronización
- No había forma de implementar offline-first
- No se podían trackear mensajes enviados/entregados/vistos

**Resultado:** Imposible implementar funcionalidades offline-first y read receipts.

---

## Solución Implementada

### Valores de Status

| Status | Descripción |
|--------|-------------|
| `local_only` | Solo existe localmente (offline) |
| `pending_backend` | Pendiente de sincronizar con servidor |
| `synced` | Sincronizado con backend (default) |
| `sent` | Enviado al destinatario (adapters externos) |
| `delivered` | Entregado al destinatario |
| `seen` | Visto por el destinatario |

### Flujo de Estados

```
[Usuario crea mensaje offline]
        ↓
   local_only
        ↓
[Conexión disponible]
        ↓
 pending_backend
        ↓
[Servidor confirma]
        ↓
     synced
        ↓
[Adapter envía]
        ↓
      sent
        ↓
[Destinatario recibe]
        ↓
   delivered
        ↓
[Destinatario lee]
        ↓
      seen
```

---

## Cambios en Código

### Schema: `packages/db/src/schema/messages.ts`

```typescript
// Campo añadido:
status: varchar('status', { length: 20 }).default('synced').notNull()

// Tipo exportado:
export type MessageStatus = 
  | 'local_only'
  | 'pending_backend'
  | 'synced'
  | 'sent'
  | 'delivered'
  | 'seen';
```

### Servicio: `apps/api/src/services/message.service.ts`

```typescript
// Métodos añadidos:
updateStatus(messageId, status)     // Actualizar status individual
getMessagesByStatus(convId, status) // Filtrar por status
getPendingMessages(convId?)         // Obtener pendientes de sync
markAsSeen(conversationId)          // Marcar como vistos
```

### Migración: `packages/db/migrations/007_message_status.sql`

```sql
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'synced';

CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_status ON messages(conversation_id, status);
```

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `packages/db/src/schema/messages.ts` | Campo `status` + tipo `MessageStatus` |
| `apps/api/src/services/message.service.ts` | Métodos para manejo de status |

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `packages/db/migrations/007_message_status.sql` | Migración SQL |
| `packages/db/src/run-migration-007.ts` | Script para ejecutar migración |
| `apps/api/src/__tests__/message-status.test.ts` | Tests de integración |
| `docs/HITO_COR002_MESSAGE_STATUS.md` | Esta documentación |

---

## Tests

### Ejecutar Tests

```bash
# Requiere servidor corriendo
bun run src/test-chat.ts
```

### Cobertura

| Test | Descripción |
|------|-------------|
| `should create message with default status "synced"` | Verifica valor por defecto |
| `should return messages with status field` | Verifica campo en respuesta |
| `should verify database column exists` | Verifica migración |

---

## Instrucciones para Pruebas Manuales

### Prerrequisitos

1. PostgreSQL corriendo con base de datos `fluxcore`
2. Migración 007 ejecutada
3. Servidor API corriendo

### Pasos de Verificación

#### 1. Ejecutar migración (si no está ejecutada)

```powershell
$env:DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/fluxcore'
bun run packages/db/src/run-migration-007.ts
```

#### 2. Iniciar servidor

```powershell
$env:DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/fluxcore'
bun run src/index.ts
```

(desde `apps/api`)

#### 3. Crear mensaje y verificar status

```bash
# Registrar usuario (obtener token)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","username":"testuser"}'

# Crear cuenta, relación, conversación...

# Enviar mensaje
curl -X POST http://localhost:3000/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId":"<id>",
    "senderAccountId":"<id>",
    "content":{"text":"Test","type":"text"},
    "type":"outgoing"
  }'

# Obtener mensajes y verificar status
curl http://localhost:3000/conversations/<id>/messages \
  -H "Authorization: Bearer <token>"
```

#### 4. Verificar respuesta

Los mensajes deben incluir:

```json
{
  "id": "...",
  "content": {...},
  "status": "synced",  // ← Campo nuevo
  ...
}
```

#### 5. Verificar en base de datos

```sql
SELECT id, content, status FROM messages ORDER BY created_at DESC LIMIT 5;
```

Debería mostrar `status = 'synced'` para todos los mensajes.

---

## Checklist de Validación

- [x] Campo `status` añadido al schema
- [x] Tipo `MessageStatus` exportado
- [x] Migración SQL creada
- [x] Migración ejecutada exitosamente
- [x] Índices creados para performance
- [x] Servicio actualizado con métodos de status
- [x] Tests de integración creados
- [x] Tests existentes siguen pasando (8/8)
- [x] Build compila correctamente
- [x] Documentación completa

---

## Próximos Pasos

Con COR-002 completado, ahora es posible:

1. **Implementar C3 (Offline-First)** - Usar status para sincronización
2. **Read Receipts** - Trackear delivered/seen
3. **Retry Queue** - Reintentar mensajes pending_backend

**Siguiente prioridad:** COR-004 (Actor Model) o C3 (Offline-First).

---

**Última actualización**: 2025-12-06
