# ROOT CAUSE + SOLUCIÓN DEFINITIVA

## El Problema Real

**Semántica invertida en `fluxcore_cognition_queue`**

### ANTES (INCORRECTO):
```
Harold envía mensaje a Patricia
↓
ChatProjector encola:
  account_id = Harold (quien ENVIÓ)
  target_account_id = Patricia (a quien se envió)
↓
CognitiveDispatcher resuelve PolicyContext con account_id = Harold
↓
PolicyContext de Harold = mode=off ❌
↓
NO RESPONDE
```

### DESPUÉS (CORRECTO):
```
Harold envía mensaje a Patricia
↓
ChatProjector encola:
  account_id = Patricia (quien RESPONDE - tiene la IA)
  target_account_id = Harold (a quien responder)
↓
CognitiveDispatcher resuelve PolicyContext con account_id = Patricia
↓
PolicyContext de Patricia = mode=auto ✅
↓
IA RESPONDE DESDE Patricia
```

## Cambios Aplicados

### 1. ChatProjector (chat-projector.ts:361)
```typescript
// ANTES
VALUES (${conversation.id}, ${accountId}, ${targetAccountId}, ...)
                             ↑ Harold    ↑ Patricia

// DESPUÉS
VALUES (${conversation.id}, ${targetAccountId}, ${accountId}, ...)
                             ↑ Patricia        ↑ Harold
```

### 2. ActionExecutor (action-executor.service.ts:190)
```typescript
// ANTES: Resolvía aiSenderAccountId invirtiendo relationship
// DESPUÉS: Usa directamente context.accountId
senderAccountId: context.accountId // Patricia (correcto desde cognition_queue)
```

### 3. CognitiveDispatcher (cognitive-dispatcher.service.ts:141-145)
```typescript
// Agregado: Pasar targetAccountId a ActionExecutor
const [queueEntry] = await db.select({ targetAccountId: fluxcoreCognitionQueue.targetAccountId })
    .from(fluxcoreCognitionQueue)
    .where(eq(fluxcoreCognitionQueue.id, turnId))
    .limit(1);

await actionExecutor.execute(actions, {
    targetAccountId: queueEntry?.targetAccountId, // Harold
    ...
});
```

## Concepto Simplificado (como debe ser)

1. **Usuario escribe** → tiene ID + canal
2. **Sistema identifica** → a quién le escribieron (Patricia)
3. **Sistema busca políticas** → de Patricia (mode=auto)
4. **IA responde** → DESDE Patricia, HACIA Harold
5. **NUNCA** → A responde como A

## Políticas Actualizadas

```sql
Patricia: mode=auto ✅
Harold: mode=auto ✅ (actualizado también)
```

## Verificación

Enviar mensaje desde UI:
- Harold → Patricia
- Esperar respuesta
- Auditar: `sender_account_id` debe ser Patricia (5c59a05b)
