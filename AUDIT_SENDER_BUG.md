# Audit: sender_account_id Bug - IA responde con cuenta incorrecta

## Fecha: 2026-02-22 14:17

## Problema
**IA responde con `sender_account_id=Harold` en lugar de `sender_account_id=Patricia`**

## Relationship Verificada
```sql
-- Conversation: d01b81c6-4bed-4269-908c-f0564c27181c
account_a: harvan_mkokevb2 (3e94f74e-e6a0-4794-bd66-16081ee3b02d)
account_b: patriciachamorro (5c59a05b-4b94-4f78-ab14-9a5fdabe2d31)
```

## Cognition Queue Verificada
```sql
-- Turn ID 234
account_id: 3e94f74e (Harold - quien RECIBE)
target_account_id: 5c59a05b (Patricia - quien debería ENVIAR como IA)
```

## Código Modificado

### ActionExecutor líneas 183-212
```typescript
// context.accountId = quien RECIBE (Harold)
// aiSenderAccountId = quien ENVÍA (Patricia)
let aiSenderAccountId: string | undefined;

const [conversation] = await db.select({ relationshipId: conversations.relationshipId })
    .from(conversations)
    .where(eq(conversations.id, action.conversationId))
    .limit(1);

if (conversation?.relationshipId) {
    const [relationship] = await db.select({ 
        accountAId: relationships.accountAId, 
        accountBId: relationships.accountBId 
    })
    .from(relationships)
    .where(eq(relationships.id, conversation.relationshipId))
    .limit(1);

    if (relationship) {
        // AI envía DESDE la otra cuenta de la relación
        aiSenderAccountId = relationship.accountAId === context.accountId
            ? relationship.accountBId  // Patricia
            : relationship.accountAId;
    }
}

senderAccountId: aiSenderAccountId // ✅ Debería ser Patricia
```

## Test Ejecutado
1. Insertado mensaje manual de Harold
2. Insertado turn en cognition_queue con target_account_id=Patricia
3. Esperado 12 segundos para procesamiento
4. **RESULTADO: NO se generó respuesta de IA**

## Último Mensaje IA Encontrado
```
sender_account_id: 3e94f74e (Harold) ❌ INCORRECTO
generated_by: ai
created_at: 2026-02-22 14:00:38
```

## Hipótesis
El código está correcto PERO CognitionWorker no está procesando la cola.

## Diagnóstico Final

### Docker Container fluxcore-api
```
STATUS: Exited (1) - NO CORRIENDO
ERROR: ENOENT reading "/app/node_modules/@fluxcore/db"
```

### Servidor Local (bun)
```
STATUS: CORRIENDO
PID: 8680 (iniciado 11:16:28)
PORT: 3000 LISTENING
```

### Código Hot Reload
Server iniciado ANTES del fix → hot reload debería haber aplicado cambios

### Código Corregido
✅ `action-executor.service.ts` líneas 183-217
✅ `chat-projector.ts` línea 328 (sintaxis findFirst)

### Para Verificar Fix
1. Iniciar servidor: `bun run dev` en terminal
2. Enviar mensaje REAL desde UI (no SQL manual)
3. Auditar DB: `SELECT sender_account_id, username FROM messages WHERE generated_by='ai' ORDER BY created_at DESC LIMIT 1`
4. **ESPERADO:** `sender_account_id = patriciachamorro (5c59a05b)`
5. **NO:** `sender_account_id = harvan_mkokevb2 (3e94f74e)`
