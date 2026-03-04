# SOLUCIÓN DEFINITIVA - Arquitectura Correcta

## Concepto Fundamental

```
Andrés escribe a Peluquería
↓
PELUQUERÍA recibe el mensaje (es el que responde)
PELUQUERÍA persiste la información
ChatCore certifica para PELUQUERÍA
↓
FluxCore solo sabe: "me llegó un mensaje"
FluxCore es AGNÓSTICO de quien escribió
```

## Cambios Aplicados

### 1. messages.routes.ts (líneas 33-62)
```typescript
// Resolver RECEPTOR desde la conversación
const conversation = await conversationService.getConversationById(conversationId);
if (conversation?.relationshipId) {
  const relationship = await relationshipService.getRelationshipById(conversation.relationshipId);
  if (relationship) {
    receiverAccountId = relationship.accountAId === senderAccountId
      ? relationship.accountBId
      : relationship.accountAId;
  }
}

// Certificar para quien RECIBE
await chatCoreGateway.certifyIngress({
  accountId: receiverAccountId,         // ✅ Patricia
  userId: user.id,                      // Harold
  meta: {
    humanSenderId: typedBody.senderAccountId, // ✅ Harold (contexto)
  }
});
```

### 2. ChatProjector (líneas 325-352)
```typescript
// accountId del signal = Patricia (receptor)
// targetAccountId = Harold (humanSenderId)

// Persistir mensaje HUMANO
await client.insert(messages).values({
  senderAccountId: targetAccountId, // ✅ Harold (quien ENVIÓ)
  conversationId: conversation.id,
  content: { text },
  type: 'incoming',
  generatedBy: 'human',
});

// Encolar cognición para RECEPTOR
INSERT INTO fluxcore_cognition_queue (
  account_id: accountId,        // ✅ Patricia (quien RESPONDE)
  target_account_id: targetAccountId, // Harold (a quien responder)
);
```

### 3. ActionExecutor (línea 190)
```typescript
// Ya no necesita inversión - accountId ya es correcto
await db.insert(messages).values({
  senderAccountId: context.accountId, // ✅ Patricia (IA responde)
  content: { text: action.content },
  generatedBy: 'ai',
});
```

## Flujo Completo

```
1. Harold envía "Hola" a Patricia desde UI
   POST /api/messages { senderAccountId: Harold }

2. messages.routes.ts:
   - Busca conversation → relationship
   - receiverAccountId = Patricia
   - certifyIngress({ accountId: Patricia, meta: { humanSenderId: Harold } })

3. Signal proyectado:
   - provenance: @fluxcore/internal#Patricia
   - evidence: { accountId: Patricia, meta: { humanSenderId: Harold } }

4. ChatProjector:
   - accountId = Patricia (del signal)
   - targetAccountId = Harold (de evidence.meta.humanSenderId)
   - Persiste mensaje: senderAccountId=Harold, conversationId=xxx
   - Encola: account_id=Patricia, target_account_id=Harold

5. CognitiveDispatcher:
   - Resuelve PolicyContext para Patricia
   - mode=auto ✅

6. ActionExecutor:
   - Persiste respuesta: senderAccountId=Patricia (context.accountId)

7. UI recibe:
   - Mensaje de Harold: "Hola"
   - Respuesta de Patricia: "Hola, soy..."
```

## Ventajas

1. **FluxCore agnóstico** - no conoce al sender
2. **Políticas correctas** - se buscan del receptor
3. **Sin inversiones** - todo fluye natural
4. **Escalable** - funciona para visitor, internal, cualquier canal
5. **Lógica obvia** - quien recibe, responde
