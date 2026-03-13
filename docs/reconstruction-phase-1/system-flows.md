# Flujos transversales del sistema actual

## Objetivo de este documento

Este documento resume los flujos end-to-end más relevantes observados en el código actual. Sirve como puente entre la documentación por dominios.

## 1. Mensaje humano autenticado → respuesta AI

### Paso 1: entrada en ChatCore

El mensaje entra por:

- `apps/api/src/routes/messages.routes.ts`, o
- `apps/api/src/websocket/ws-handler.ts`

Allí se resuelven identidad, conversación, `senderAccountId` y `fromActorId`.

### Paso 2: persistencia conversacional

- `apps/api/src/core/message-core.ts`
- `apps/api/src/services/message.service.ts`

ChatCore persiste el mensaje en `messages`, actualiza la conversación y notifica a suscriptores.

### Paso 3: certificación soberana

- `apps/api/src/services/chatcore-outbox.service.ts`
- `apps/api/src/services/fluxcore/chatcore-gateway.service.ts`

El mensaje humano se certifica como señal en el Kernel.

### Paso 4: proyección hacia cognición

- `apps/api/src/core/projections/chat-projector.ts`

El projector observa la señal y actualiza `fluxcore_cognition_queue` para esa conversación.

### Paso 5: decisión cognitiva

- `apps/api/src/workers/cognition-worker.ts`
- `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`
- `apps/api/src/services/flux-policy-context.service.ts`
- `apps/api/src/services/fluxcore/runtime-gateway.service.ts`

FluxCore resuelve política, runtime e historial; luego invoca el runtime activo.

### Paso 6: ejecución mediada

- `apps/api/src/services/fluxcore/action-executor.service.ts`
- `apps/api/src/services/fluxcore/cognition-gateway.service.ts`

La respuesta AI se convierte en una señal `AI_RESPONSE_GENERATED` certificada en el Kernel.

### Paso 7: regreso a ChatCore

- `apps/api/src/core/projections/chat-projector.ts`
- `apps/api/src/core/message-core.ts`

`ChatProjector` observa la señal de salida y usa `messageCore.receive()` para persistir y distribuir la respuesta.

## 2. Visitante anónimo en perfil público

### Paso 1: bootstrap de sesión pública

- `apps/api/src/routes/public-profile.routes.ts`

`GET /public/profiles/:alias/session`:

- resuelve la cuenta dueña del perfil
- asegura actor de cuenta
- asegura actor visitante por `visitorToken`
- asegura conversación `webchat`
- emite token temporal `public_profile`

### Paso 2: envío del mensaje visitante

- `apps/api/src/routes/messages.routes.ts` o `apps/api/src/websocket/ws-handler.ts`

El mensaje queda asociado a la conversación del visitante y a su `visitorActorId`.

### Paso 3: certificación al Kernel

- `apps/api/src/services/fluxcore/chatcore-webchat-gateway.service.ts`

La observación se certifica usando identidad provisional (`visitorToken`).

### Paso 4: proyección de identidad

- `apps/api/src/services/fluxcore/identity-projector.service.ts`

Si es la primera señal del visitante, se crea un actor provisional derivado.

### Paso 5: pipeline cognitivo y respuesta

El resto del camino es equivalente al chat autenticado:

- Kernel
- `ChatProjector`
- `CognitionWorker`
- runtime
- `AI_RESPONSE_GENERATED`
- regreso a ChatCore

## 3. Conversión visitante → autenticado

### Paso 1: login del visitante

- `apps/api/src/routes/conversations.routes.ts`

`POST /conversations/convert-visitor`:

- valida que la cuenta visitante pertenezca al usuario autenticado
- asegura relación entre visitante y propietario del perfil
- convierte o fusiona la conversación visitante hacia una conversación basada en `relationshipId`

### Paso 2: certificación del vínculo de identidad

- `apps/api/src/services/fluxcore/chatcore-webchat-gateway.service.ts`

Se certifica `CONNECTION_EVENT_OBSERVED` vinculando `visitorToken` con cuenta real.

### Paso 3: proyección del vínculo

- `apps/api/src/services/fluxcore/identity-projector.service.ts`

El projector materializa el identity link sin mutar el journal previo.

## 4. Ownership y renderizado de mensajes

### Fuente canónica de ownership

El criterio visual real depende principalmente de `fromActorId`.

Archivos relevantes:

- backend: `apps/api/src/routes/messages.routes.ts`
- backend: `apps/api/src/utils/actor-resolver.ts`
- frontend: `apps/web/src/hooks/useChatUnified.ts`
- frontend: `apps/web/src/components/chat/ChatView.tsx`
- frontend: `apps/web/src/public-profile/PublicChatContainer.tsx`

### Regla observable

- el actor que observa la conversación se alinea a la derecha
- el interlocutor se alinea a la izquierda
- por eso `fromActorId` es más importante que `type` para ownership real

## 5. Flujo de eliminación de mensajes

### Paso 1: Inicio desde la UI

El usuario inicia la eliminación desde:

- `MessageBubble` → clic en ícono de eliminar
- `MessageSelectionToolbar` → selección múltiple + eliminar
- `ChatOptionsMenu` → "Vaciar chat"

### Paso 2: Selección de scope

`DeleteMessageModal` presenta opciones:

- "Eliminar para mí" → `scope = 'self'`
- "Eliminar para todos" → `scope = 'all'` (solo si es sender y < 60 min)

### Paso 3: Chain frontend-backend

```
DeleteMessageModal.onConfirm(scope)
  → MessageBubble.onDelete(scope)
  → ChatView.handleDelete(messageId, scope)
  → useChat.deleteMessage(messageId, scope)
  → DELETE /messages/:id?scope=scope
```

### Paso 4: Procesamiento backend

- `messages.routes.ts` valida permisos y resuelve `requesterActorId`
- `messageService.deleteMessage()` delega al modelo canónico
- `messageDeletionService.deleteMessage()` dispatch según scope:
  - `scope='all'` → `redactMessage()` (sobrescribe contenido)
  - `scope='self'` → `hideMessageForActor()` (insert en `message_visibility`)

### Paso 5: Actualización del estado local

Frontend filtra mensajes del estado React inmediatamente:

```typescript
setMessages(prev => prev.filter(m => m.id !== messageId));
```

### Paso 6: Persistencia del filtrado

Al recargar la página:

```
useChat.loadMessages()
  → GET /conversations/:id/messages?accountId=X
  → conversations.routes.ts resuelve viewerActorId
  → messageService.getMessagesByConversationId(..., viewerActorId)
  → messageDeletionService.getMessagesWithVisibilityFilter()
  → Excluye mensajes ocultos via NOT IN (SELECT message_id FROM message_visibility WHERE actor_id = X)
```

### Paso 7: "Vaciar chat" (flujo especial)

```
ChatOptionsMenu "Vaciar chat"
  → POST /conversations/:id/clear
  → hideAllMessagesForActor(conversationId, actorId)
  → Bulk insert en message_visibility para todos los mensajes
  → Frontend: setMessages([])
```

### Paso 8: Abandonar conversación

```
DELETE /conversations/:id
  → conversationService.deleteConversation()
  → UPDATE conversation_participants SET unsubscribedAt = NOW()
  → Conversación desaparece de getConversationsByAccountId() (filtro por unsubscribedAt IS NULL)
```

## 6. Lectura del sistema en una frase

El sistema actual puede resumirse así:

1. ChatCore captura y persiste el mundo conversacional
2. el Kernel certifica soberanamente lo observado
3. FluxCore decide a nivel cognitivo sobre turnos certificados
4. ChatCore vuelve a materializar la respuesta en el chat
5. ChatCore gestiona eliminación mediante redacción y visibilidad, nunca borrado físico
