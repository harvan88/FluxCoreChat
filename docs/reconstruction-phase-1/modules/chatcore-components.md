# ChatCore — componentes y flujo operativo actual

## Objetivo de este documento

Este documento baja un nivel respecto de `chatcore-overview.md`. No intenta describir todavía cada función interna, pero sí deja identificado el conjunto real de piezas que hoy implementan ChatCore y cómo se encadenan entre sí.

## 1. Superficies de entrada de ChatCore

### HTTP de mensajes

- `apps/api/src/routes/messages.routes.ts`
  - expone el envío y lectura de mensajes
  - resuelve autenticación normal y `public_profile`
  - deriva `senderAccountId`, `fromActorId`, `receiverAccountId` y metadatos
  - delega el procesamiento final a `messageCore.receive()`

### HTTP de conversaciones

- `apps/api/src/routes/conversations.routes.ts`
  - lista conversaciones por cuenta o por usuario
  - crea conversación a partir de `relationshipId`
  - obtiene historial paginado por cursor
  - expone `POST /conversations/convert-visitor` para convertir conversación anónima en autenticada

### HTTP de perfil público

- `apps/api/src/routes/public-profile.routes.ts`
  - expone `GET /public/profiles/:alias`
  - expone `GET /public/profiles/:alias/session`
  - en `/:alias/session` asegura actor de la cuenta, actor visitante, conversación `webchat` y token temporal `public_profile`
  - expone recuperación de historial de conversación visitante por alias + `visitorToken`

### WebSocket

- `apps/api/src/server.ts`
  - crea el servidor WebSocket y resuelve identidad desde JWT
- `apps/api/src/websocket/ws-handler.ts`
  - registra conexiones
  - procesa suscripciones por conversación, relación y visitante
  - recibe mensajes por WebSocket y los entrega a ChatCore / Kernel según el camino
  - contiene también caminos especiales como sugerencias y widget público

## 2. Núcleo operativo de mensajes

### `message-core.ts` como orquestador principal

- `apps/api/src/core/message-core.ts`

Responsabilidades observables:

- persiste mensajes a través de `messageService`
- asegura participantes de la conversación
- actualiza metadatos de la conversación (`lastMessageAt`, `lastMessageText`)
- emite notificaciones al bus y a WebSocket
- encola mensajes humanos para certificación posterior
- permite que mensajes generados por IA vuelvan al dominio de chat sin que FluxCore escriba directo en `messages`

### Persistencia concreta de mensajes

- `apps/api/src/services/message.service.ts`

Responsabilidades observables:

- inserta filas en `messages`
- persiste `fromActorId` cuando existe
- mantiene compatibilidad con `senderAccountId`
- enlaza assets asociados a `content.media`
- recupera mensajes por conversación usando paginación por cursor temporal

## 3. Capa conversacional

### Gestión de conversaciones

- `apps/api/src/services/conversation.service.ts`

Responsabilidades observables:

- `ensureConversation()` para conversaciones por relación o visitante
- `getConversationsByAccountId()` para bandeja conversacional de una cuenta
- `getConversationsByUserId()` como comportamiento agregado por usuario
- `convertVisitorConversation()` para unir conversación anónima con conversación autenticada al momento del login
- actualización de estado y metadatos de conversación

### Participantes de conversación

- `apps/api/src/services/conversation-participant.service.ts`

Responsabilidades observables:

- asegura participantes registrados cuando la conversación tiene `relationshipId`
- agrega visitante como participante `anonymous` en conversaciones con `visitorToken`
- agrega a la cuenta dueña como receptor en conversaciones webchat para que aparezcan en su bandeja
- expone consultas de participantes activos y receptor principal

Esto convierte a `conversation_participants` en una proyección operativa de visibilidad y entrega, no solo en una tabla auxiliar.

## 4. Identidad actoral dentro de ChatCore

### Resolución actor ↔ cuenta

- `apps/api/src/utils/actor-resolver.ts`

Responsabilidades observables:

- resolver `accountId -> actorId`
- resolver `actorId -> accountId`
- asegurar actor canónico de cuenta
- soportar identidad visitante y relaciones actorales

### Invariante actual de ownership

En el modelo actual de chat, la identidad canónica del emisor es `fromActorId`. Esto impacta directamente en:

- persistencia en `packages/db/src/schema/messages.ts`
- cálculo de ownership en frontend
- composición de participantes y relaciones
- correcta renderización de mensajes humanos y de IA

`senderAccountId` sigue existiendo, pero en la práctica funciona como dato operativo y de compatibilidad, no como criterio canónico de autoría visual.

## 5. Entrega en tiempo real

### Transporte y suscripciones

- `apps/api/src/websocket/ws-handler.ts`

Responsabilidades observables:

- manejar `subscribe` / `unsubscribe`
- mantener mapas de suscripción por conversación, relación y visitante
- emitir `message:new` a los observadores correctos
- soportar sesiones de perfil público mediante tokens temporales

### Difusión desde `message-core`

La entrega en tiempo real no sale directo desde las rutas. El patrón observable es:

1. una ruta o handler delega en `messageCore`
2. `messageCore` persiste y enriquece
3. `messageCore` dispara broadcast a suscripciones activas

Esto concentra la consistencia del dominio conversacional en un único punto.

## 6. Persistencia base de ChatCore

### Tablas principales

- `packages/db/src/schema/conversations.ts`
  - conversación operativa
  - soporta `relationshipId`, `ownerAccountId`, `visitorToken`, `channel`, `status`
- `packages/db/src/schema/messages.ts`
  - mensaje persistido
  - contiene `senderAccountId`, `fromActorId`, `toActorId`, `generatedBy`, `signalId`
- `packages/db/src/schema/conversation-participants.ts`
  - materializa participación y visibilidad por conversación
- `packages/db/src/schema/relationships.ts`
  - relación entre actores usada por el chat interno
- `packages/db/src/schema/actors.ts`
  - actor de cuenta, visitante, builtin AI o extensión
- `packages/db/src/schema/chatcore-outbox.ts`
  - outbox transaccional para certificar mensajes humanos en el Kernel

## 7. Integración con Kernel

### Certificación asíncrona de mensajes humanos

- `apps/api/src/services/chatcore-outbox.service.ts`
- `apps/api/src/services/fluxcore/chatcore-gateway.service.ts`
- `apps/api/src/services/fluxcore/chatcore-webchat-gateway.service.ts`

Flujo observable:

1. ChatCore persiste mensaje humano
2. ChatCore lo encola en `chatcore_outbox`
3. `ChatCoreOutboxService` procesa pendientes
4. el gateway adecuado certifica una observación al Kernel

El gateway usado depende del origen:

- `chatcore-gateway` para tráfico autenticado interno
- `chatcore-webchat-gateway` para widget / visitante e identidad provisional

## 8. Integración con FluxCore

### Entrada al pipeline cognitivo

- `apps/api/src/core/projections/chat-projector.ts`

Aunque el projector vive del lado Kernel/FluxCore, para ChatCore es una pieza de frontera crítica porque:

- observa señales certificadas que nacieron en ChatCore
- encola turnos cognitivos derivados de mensajes humanos
- devuelve respuestas AI al dominio ChatCore usando `messageCore.receive()`

### Regla operativa importante

FluxCore no inserta filas en `messages` directamente. Toda respuesta generada por IA vuelve a ChatCore por una frontera mediada:

- FluxCore certifica una señal
- `ChatProjector` la observa
- `messageCore.receive()` persiste la respuesta

## 9. Caminos funcionales actuales de ChatCore

### Chat autenticado interno

- conversación basada en `relationshipId`
- participantes registrados
- envío por HTTP o WebSocket autenticado

### Chat de perfil público / visitante

- conversación basada en `visitorToken` + `ownerAccountId`
- actor visitante provisional
- sesión pública vía `GET /public/profiles/:alias/session`
- handoff a conversación autenticada mediante `convertVisitorConversation()`

### Entrega de respuestas IA

- respuesta llega certificada desde Kernel/FluxCore
- ChatCore la persiste como mensaje normal del chat
- el frontend la consume por el mismo canal que cualquier otro mensaje

## 10. Sistema de eliminación de mensajes

### Servicio de eliminación canónica

- `apps/api/src/services/message-deletion.service.ts`

Responsabilidades observables:

- `redactMessage(messageId, requesterActorId)` → sobrescribe contenido, marca `redactedAt/redactedBy`
- `hideMessageForActor(messageId, actorId)` → insert en `message_visibility`
- `hideAllMessagesForActor(conversationId, actorId)` → "Vaciar chat"
- `getMessagesWithVisibilityFilter(conversationId, viewerActorId, limit, cursor)` → filtra mensajes ocultos
- `isMessageVisibleForActor(messageId, actorId)` → consulta de visibilidad
- Ventana de 60 minutos para redacción, sin ventana para ocultar

### Integración con servicios de mensajes

- `apps/api/src/services/message.service.ts`

Responsabilidades observables:

- `deleteMessage(messageId, accountId, scope, requesterActorId)` → delega al modelo canónico
- `getMessagesByConversationId(conversationId, limit, cursor, viewerActorId)` → aplica filtro de visibilidad cuando `viewerActorId` presente
- Resuelve `actorId` desde `accountId` para operaciones de eliminación

### Rutas de eliminación

- `apps/api/src/routes/messages.routes.ts`

Endpoints implementados:

- `DELETE /messages/:id?scope=all|self` → eliminación individual con scope
- `DELETE /messages/bulk` → eliminación bulk con scope en body
- Validación de permisos: solo el sender puede redactar (`scope='all'`)
- Resuelve `requesterActorId` para operaciones de visibilidad

- `apps/api/src/routes/conversations.routes.ts`

Endpoints implementados:

- `POST /conversations/:id/clear` → oculta todos los mensajes para el actor actual
- `DELETE /conversations/:id` → abandona conversación (soft delete via `unsubscribedAt`)

### Componentes frontend de eliminación

- `apps/web/src/components/ui/DeleteMessageModal.tsx` → UI de selección de scope ('self'|'all')
- `apps/web/src/components/chat/MessageBubble.tsx` → chain de scope desde modal hasta backend
- `apps/web/src/components/chat/ChatView.tsx` → handlers `handleDelete()` y `handleDeleteSelected()`
- `apps/web/src/hooks/useChat.ts` → `deleteMessage(messageId, scope)` y paso de `accountId` para filtrado
- `apps/web/src/services/api.ts` → métodos `deleteMessage()`, `deleteMessagesBulk()`, `clearChat()`

## 11. Invariantes y observaciones relevantes

- ChatCore sí conoce conversaciones, mensajes, participantes, cuentas y visitantes.
- ChatCore no decide política de automatización.
- ChatCore no elige runtime.
- ChatCore no debe ser el origen soberano de hechos certificados.
- `fromActorId` es la referencia más importante para propiedad del mensaje.
- el chat de perfil público ya no depende solo del widget legacy: tiene sesión REST canónica y soporte WebSocket autenticado con `public_profile`.
- Los mensajes nunca se eliminan físicamente por acción de un actor: se redactan (para todos) o se ocultan (para uno).
- La visibilidad de mensajes se implementa mediante `message_visibility`, no mutando el mensaje original.
- El frontend debe pasar `accountId` al cargar mensajes para que el backend aplique el filtro de visibilidad correctamente.
