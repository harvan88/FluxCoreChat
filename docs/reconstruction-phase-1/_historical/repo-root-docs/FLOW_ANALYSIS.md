# Análisis Completo del Flujo: Mensaje → Respuesta IA

## El Concepto Correcto (según el usuario)
1. **Quien escribe tiene ID + fuente (token si es visitante)**
2. **Alguien me escribió → qué canal, qué ID → Respondo a ese canal/UI**
3. **NUNCA A → A**
4. **Si está logeado = relación directa**

## Flujo Actual (AUDITADO)

### 1. Usuario Harold envía mensaje a Patricia desde UI

**POST /api/messages**
```
senderAccountId: Harold (3e94f74e)
conversationId: d01b81c6
```

### 2. ChatCoreGateway certifica (messages.routes.ts:28-39)
```typescript
accountId: typedBody.senderAccountId  // Harold
userId: user.id                        // Harold's userId
```

### 3. ChatProjector proyecta mensaje (chat-projector.ts:322-366)

**Resuelve targetAccountId:**
```typescript
// Línea 326-334
if (conversation.relationshipId) {
    const rel = await client.query.relationships.findFirst(...);
    targetAccountId = rel.accountAId === accountId ? rel.accountBId : rel.accountAId;
}
// accountId = Harold
// targetAccountId = Patricia ✅
```

**Persiste mensaje humano:**
```typescript
// Línea 338-348
INSERT INTO messages (
    senderAccountId: Harold ✅
    generatedBy: 'human'
)
```

**Encola cognición:**
```typescript
// Línea 355-366
INSERT INTO fluxcore_cognition_queue (
    account_id: Harold          ❓ ¿Es correcto?
    target_account_id: Patricia ❓ ¿Es correcto?
)
```

### 4. CognitionWorker procesa → CognitiveDispatcher (cognitive-dispatcher.service.ts:45-146)

**Recibe:**
```typescript
accountId: Harold  // De cognition_queue.account_id
```

**Resuelve PolicyContext:**
```typescript
// Línea 71-75
await fluxPolicyContextService.resolveContext(
    accountId,              // Harold
    conversation.relationshipId,
    channel
);
```

**Pasa a ActionExecutor:**
```typescript
// Línea 140-146
await actionExecutor.execute(actions, {
    accountId,  // Harold
    // ❌ NO pasa targetAccountId
});
```

### 5. ActionExecutor persiste respuesta IA (action-executor.service.ts:178-217)

**Recibe:**
```typescript
context.accountId: Harold  // ❌ Quien RECIBE, no quien ENVÍA
```

**Resuelve aiSenderAccountId:**
```typescript
// Línea 183-212
const [conversation] = await db.select(...)
const [relationship] = await db.select(...)

aiSenderAccountId = relationship.accountAId === context.accountId
    ? relationship.accountBId  // Patricia
    : relationship.accountAId;
```

**Persiste:**
```typescript
// Línea 215-218
INSERT INTO messages (
    senderAccountId: aiSenderAccountId  // Debería ser Patricia
)
```

## PROBLEMA IDENTIFICADO

### En cognition_queue:
```
account_id = Harold (quien ENVIÓ mensaje humano)
target_account_id = Patricia (a quien se envió)
```

### En ActionExecutor:
```
context.accountId = Harold
```

ActionExecutor hace:
```
Si relationship.accountAId === Harold → aiSenderAccountId = Patricia ✅
```

Esto DEBERÍA funcionar.

## HIPÓTESIS: ¿Por qué falla?

1. **PolicyContext se resuelve con `accountId=Harold`**
   - Esto busca las políticas de IA de Harold, NO de Patricia
   - Patricia es quien debe tener `mode=auto`
   
2. **Semántica invertida en cognition_queue**
   - `account_id` debería ser la cuenta que RESPONDE (Patricia)
   - `target_account_id` debería ser a quien responder (Harold)

## SOLUCIÓN PROPUESTA

### Opción 1: Invertir semántica en ChatProjector
```typescript
// ChatProjector línea 359
INSERT INTO fluxcore_cognition_queue (
    account_id: targetAccountId,      // Patricia (quien RESPONDE)
    target_account_id: accountId,     // Harold (a quien responder)
)
```

### Opción 2: Simplificar ActionExecutor
```typescript
// ActionExecutor recibe directamente quien debe responder
context: {
    responderAccountId: string,  // Patricia
    receiverAccountId: string,   // Harold
}
```

## VERIFICACIÓN NECESARIA

Revisar `fluxPolicyContextService.resolveContext` - ¿está buscando políticas de la cuenta correcta?
