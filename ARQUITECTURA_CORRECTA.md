# ARQUITECTURA CORRECTA - Lógica de Chat

## Concepto (Usuario)

```
Andrés escribe a Peluquería
↓
ES PELUQUERÍA quien recibe el mensaje
ES PELUQUERÍA quien persiste la información (es el que responde)
Se le entrega a ChatCore como "Peluquería recibió un mensaje"
↓
FluxCore solo sabe: "me llegó un mensaje, debo responder"
FluxCore es AGNÓSTICO de:
  - Quién escribió
  - Si existe o no en el sistema
  - Eso es propiedad de ChatCore
```

## Flujo Actual (INCORRECTO)

```
POST /api/messages
{
  senderAccountId: Harold,
  conversationId: xxx,
  content: "Hola"
}
↓
ChatCoreGateway.certifyIngress({
  accountId: Harold,  ❌ AQUÍ ESTÁ EL ERROR
  userId: Harold.userId
})
↓
Signal proyectado con:
  provenance: @fluxcore/internal#Harold
  evidence: { accountId: Harold }
↓
ChatProjector escucha:
  accountId = Harold (del signal.evidence)
  targetAccountId = Patricia (resuelto desde relationship)
↓
Encola cognition con:
  account_id = Harold ❌ (quien ENVIÓ)
  target_account_id = Patricia (quien RECIBE)
↓
FluxCore se despierta para Harold
PolicyContext de Harold → mode=off
NO RESPONDE
```

## Flujo Correcto (DEBE SER)

```
POST /api/messages
{
  senderAccountId: Harold,
  conversationId: xxx,
  content: "Hola"
}
↓
1. messages.routes.ts DEBE RESOLVER RECEPTOR
   - Buscar conversationId → relationshipId
   - Identificar: si Harold es accountA → receptor es accountB (Patricia)
↓
2. ChatCoreGateway.certifyIngress({
     accountId: Patricia,  ✅ RECEPTOR
     userId: Harold.userId,
     meta: { humanSenderId: Harold } // contexto
   })
↓
3. Signal proyectado con:
     provenance: @fluxcore/internal#Patricia
     evidence: { 
       accountId: Patricia,
       humanSenderId: Harold,
       content: "Hola"
     }
↓
4. ChatProjector escucha:
     accountId = Patricia (quien RECIBE)
     humanSenderId = Harold (quien envió - solo contexto)
↓
5. Persiste mensaje:
     senderAccountId = Harold (humano)
     receiverAccountId = Patricia (implícito en conversation)
↓
6. Encola cognition:
     account_id = Patricia (quien RESPONDE)
     target_account_id = Harold (a quien responder)
↓
7. FluxCore se despierta para Patricia
   PolicyContext de Patricia → mode=auto ✅
   IA RESPONDE desde Patricia hacia Harold
```

## Cambios Requeridos

### 1. messages.routes.ts
Resolver receptor ANTES de certifyIngress:
```typescript
const conversation = await conversationService.getById(conversationId);
const relationship = await relationshipService.getById(conversation.relationshipId);

const receiverAccountId = relationship.accountAId === senderAccountId
  ? relationship.accountBId
  : relationship.accountAId;

await chatCoreGateway.certifyIngress({
  accountId: receiverAccountId,  // ✅ Quien RECIBE
  userId: user.id,
  meta: {
    humanSenderId: senderAccountId,
    ...
  }
});
```

### 2. ChatProjector
No cambiar nada - accountId del signal YA será el correcto (receptor)

### 3. FluxCore
Completamente AGNÓSTICO:
- No conoce quién escribió
- Solo sabe: "me llegó un mensaje"
- Debe responder desde `accountId` (receptor)

## Ventajas

1. **Lógica de chat obvia** - quien recibe, responde
2. **FluxCore agnóstico** - no necesita saber nada del sender
3. **Sin inversiones** - account_id siempre es quien responde
4. **Políticas correctas** - se buscan del receptor, no del sender
5. **Escalable** - funciona para visitor, internal, cualquier flujo
