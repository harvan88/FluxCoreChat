# ChatCore — visión general estructural

## Rol del dominio

ChatCore es el dominio responsable del mundo conversacional operativo del sistema. Su función es recibir mensajes desde HTTP o WebSocket, validar contexto conversacional, persistir mensajes y conversaciones, mantener el estado visible para los clientes y entregar eventos en tiempo real.

En la arquitectura actual, ChatCore no es el dominio que decide qué responder. Su responsabilidad es operar el mundo del chat. La decisión cognitiva pertenece a FluxCore y la certificación soberana de hechos pertenece al Kernel.

## Definición canónica validada

La definición histórica que hoy sí resiste validación es esta: ChatCore es el sistema de comunicación humano del producto, no la capa de decisión cognitiva.

Aplicando el test ontológico del sistema, ChatCore sigue siendo dueño de todo lo que existiría aunque la IA desapareciera:

- conversaciones
- mensajes
- participantes
- relaciones
- identidad operativa del chat
- assets y sus asociaciones operativas

El capítulo específico de `assets` se desarrolla en `chatcore-assets.md`, porque el código actual ya los trata como infraestructura de primera clase dentro de este dominio.

## Responsabilidades principales

- recibir mensajes humanos desde API y WebSocket
- persistir mensajes en `messages`
- crear, recuperar y convertir conversaciones en `conversations`
- mantener participantes conversacionales y contexto relacional
- emitir eventos `message:new` y actividad en tiempo real
- encolar certificación asíncrona de mensajes humanos hacia el Kernel mediante `chatcore_outbox`
- servir tanto chat autenticado como chat de perfil público / visitante

## Componentes principales

### 1. Entradas HTTP y WebSocket

- `apps/api/src/server.ts`
  - monta rutas HTTP y crea el servidor híbrido HTTP + WebSocket
  - resuelve autenticación de WebSocket, incluyendo `public_profile`
- `apps/api/src/routes/messages.routes.ts`
  - punto principal HTTP para enviar y leer mensajes
  - resuelve `senderAccountId`, `fromActorId`, `receiverAccountId` y delega a `messageCore`
- `apps/api/src/websocket/ws-handler.ts`
  - maneja suscripciones por `relationshipId`, `conversationId` y `visitorToken`
  - recibe mensajes por WebSocket, valida acceso y delega persistencia a `messageCore`
  - integra el camino de widget público con `chatCoreWebchatGateway`

### 2. Núcleo conversacional

- `apps/api/src/core/message-core.ts`
  - centro operativo de ChatCore
  - persiste mensajes usando `messageService`
  - actualiza conversación y última interacción
  - emite eventos a suscriptores de relación, conversación y visitante
  - encola certificación asíncrona de mensajes humanos en `chatcore_outbox`
- `apps/api/src/services/conversation.service.ts`
  - crea o recupera conversaciones
  - soporta conversaciones con `relationshipId` y conversaciones de visitante con `visitorToken`
  - convierte conversación anónima en conversación autenticada mediante `convertVisitorConversation`

### 3. Integración con identidad y modelo actoral

- `apps/api/src/utils/actor-resolver.ts`
  - resuelve cuenta ↔ actor para el modelo actual basado en `fromActorId`
- `apps/api/src/routes/messages.routes.ts`
  - usa `resolveActorId`, `resolveAccountId` y `resolveActorIds`
- `apps/api/src/websocket/ws-handler.ts`
  - resuelve actor antes de persistir mensajes enviados por usuario o por caminos de IA aprobada

### 4. Certificación hacia el Kernel

- `apps/api/src/services/chatcore-outbox.service.ts`
  - procesa `chatcore_outbox`
  - certifica mensajes humanos en el Kernel a través de `chatCoreGateway`
- `apps/api/src/services/fluxcore/chatcore-gateway.service.ts`
  - reality adapter para tráfico autenticado interno
- `apps/api/src/services/fluxcore/chatcore-webchat-gateway.service.ts`
  - reality adapter para tráfico webchat / visitante y vinculación de identidad visitante → cuenta

## Modelo de datos principal

### Tablas base de ChatCore

- `packages/db/src/schema/conversations.ts`
  - conversación operativa del chat
  - soporta `relationshipId`, `ownerAccountId`, `visitorToken`, `channel`, `conversationType`
- `packages/db/src/schema/messages.ts`
  - mensajes persistidos del chat
  - `senderAccountId` queda como compatibilidad operativa
  - `fromActorId` es la identidad canónica del emisor
- `packages/db/src/schema/chatcore-outbox.ts`
  - cola transaccional para certificar mensajes humanos en el Kernel
- `packages/db/src/schema/relationships.ts`
  - relación entre actores usada por conversaciones internas
- `packages/db/src/schema/actors.ts`
  - actor ontológico que puede representar cuenta, visitante, AI embebida o extensión

## Interacción con Kernel

ChatCore no certifica hechos por sí mismo. Cuando un humano envía un mensaje:

1. ChatCore lo persiste en `messages`
2. lo coloca en `chatcore_outbox`
3. `ChatCoreOutboxService` lo certifica usando `chatCoreGateway`
4. el Kernel registra la señal en `fluxcore_signals`
5. los projectores y FluxCore reaccionan a esa señal

Cuando ChatCore recibe una respuesta generada por IA, no la produce internamente. La recibe de vuelta a través del flujo Kernel → projector → `messageCore`.

## Interacción con FluxCore

La interacción actual es bidireccional pero mediada:

- **ChatCore → FluxCore**
  - un mensaje humano persistido y certificado termina generando una señal observada por `ChatProjector`
  - esa señal alimenta `fluxcore_cognition_queue`
- **FluxCore → ChatCore**
  - FluxCore certifica `AI_RESPONSE_GENERATED` vía `cognition-gateway.service.ts`
  - `ChatProjector` observa esa señal y entrega la respuesta a `messageCore.receive()`
  - ChatCore persiste y distribuye el mensaje a los clientes

## Frontera del dominio

ChatCore sí hace:

- persistencia conversacional
- transporte cliente-servidor
- subscriptions y broadcasting
- resolución operativa de conversaciones, participantes y ownership visible

ChatCore no hace:

- decidir política de automatización
- elegir runtime o modelo
- generar respuestas de IA por cuenta propia
- certificar soberanamente la realidad sin pasar por el Kernel
