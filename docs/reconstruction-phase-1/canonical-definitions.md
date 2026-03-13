# Definiciones canónicas recuperadas y validadas

## Objetivo de este documento

Este documento recupera definiciones canónicas importantes de la documentación histórica, pero solo conserva como válidas aquellas que hoy pueden sostenerse con el código y el esquema actuales.

## Método de recuperación

La regla usada en esta reconstrucción es simple:

- una definición histórica se conserva si el código actual la confirma
- una definición histórica se ajusta si el código actual la matiza
- una definición histórica se descarta si hoy contradice la implementación real

Fuentes conceptuales relevantes revisadas:

- `.windsurf/rules/canon-fluxcore.md`
- `docs/reconstruction-phase-1/_historical/fluxcore/FLUXCORE_CANON_FINAL_v8.3.md`
- `docs/reconstruction-phase-1/_historical/chatcore/ChatCore - Vision Document.md`
- `docs/reconstruction-phase-1/_historical/chatcore/Asset Infrastructure - Unified Design.md`
- `docs/reconstruction-phase-1/_historical/archive/HITO_COR004_ACTOR_MODEL.md`

Fuentes de validación técnica:

- `apps/api/src`
- `packages/db/src/schema`
- documentos activos en `docs/reconstruction-phase-1`

## 1. Los tres dominios canónicos

### ChatCore

**Definición canónica recuperada**

ChatCore es el sistema de comunicación del producto. Su responsabilidad es operar el mundo conversacional humano: cuentas, perfiles, conversaciones, mensajes, participantes, canales, assets, plantillas y entrega en tiempo real.

**Validación en código actual**

Se sostiene en:

- `accounts`, `conversations`, `messages`, `conversation_participants`, `relationships`, `actors`, `assets`
- `messages.routes.ts`, `conversations.routes.ts`, `public-profile.routes.ts`, `ws-handler.ts`
- `message-core.ts`, `conversation.service.ts`, `conversation-participant.service.ts`
- `assets.routes.ts`, `asset-registry.service.ts`, `asset-gateway.service.ts`, `asset-relations.service.ts`

**Conclusión vigente**

La definición canónica se sostiene. ChatCore sigue siendo un dominio completo por sí mismo, orientado a comunicación humana y multicanal, aunque hoy se encuentre enriquecido por Kernel y FluxCore.

### Kernel

**Definición canónica recuperada**

El Kernel es la frontera soberana que certifica observaciones, las registra en un journal inmutable y permite reconstruir el estado derivado del sistema mediante projectores.

**Validación en código actual**

Se sostiene en:

- `apps/api/src/core/kernel.ts`
- `packages/db/src/schema/fluxcore-signals.ts`
- `packages/db/src/schema/fluxcore-outbox.ts`
- `apps/api/src/core/kernel-dispatcher.ts`
- `apps/api/src/core/kernel/base.projector.ts`
- `apps/api/src/core/kernel/projector-runner.ts`

**Matiz importante**

El canon histórico habla de seis tipos físicos estrictos. La implementación actual mantiene la estructura soberana del Kernel, pero hoy acepta además tipos extendidos como `chatcore.message.received` y `AI_RESPONSE_GENERATED`. La soberanía del Kernel se sostiene; el conjunto exacto de `factType` es más amplio que en la versión conceptual más estricta.

### FluxCore

**Definición canónica recuperada**

FluxCore es el sistema operativo de cognición del producto. Su responsabilidad es tomar hechos ya certificados, reconstruir el contexto de decisión, invocar el runtime adecuado y producir acciones mediadas.

**Validación en código actual**

Se sostiene en:

- `chat-projector.ts`
- `cognition-worker.ts`
- `cognitive-dispatcher.service.ts`
- `flux-policy-context.service.ts`
- `flux-runtime-config.service.ts`
- `runtime-gateway.service.ts`
- `action-executor.service.ts`

**Conclusión vigente**

La definición canónica se sostiene con fuerza. FluxCore no es el chat ni el sistema de negocio del cliente: es la capa cognitiva y operativa que decide sobre el estado proyectado.

## 2. Test ontológico de propiedad

Una definición histórica importante que sí sigue siendo útil es este test:

> **¿Este dato existiría si no hubiera IA en el sistema?**

Si la respuesta es sí, hoy sigue siendo razonable ubicarlo en ChatCore.

Ejemplos validados:

- conversaciones
- mensajes
- perfiles de cuenta
- alias públicos
- plantillas
- assets
- relaciones
- participantes

Si la respuesta es no, hoy sigue siendo razonable ubicarlo en FluxCore.

Ejemplos validados:

- selección e invocación de runtime
- configuración del asistente
- vector stores
- autorización de tools para runtimes
- modos cognitivos
- cola de cognición
- work definitions

## 3. PolicyContext y RuntimeConfig

**Definición canónica recuperada**

`PolicyContext` y `RuntimeConfig` no son lo mismo.

- `PolicyContext` gobierna cómo debe operar la IA
- `RuntimeConfig` especifica con qué implementación técnica opera

**Validación en código actual**

Se sostiene en la separación entre:

- `apps/api/src/services/flux-policy-context.service.ts`
- `apps/api/src/services/flux-runtime-config.service.ts`
- `packages/db/src/schema/fluxcore-account-policies.ts`
- `packages/db/src/schema/account-runtime-config.ts`
- `packages/db/src/schema/fluxcore-assistants.ts`

**Conclusión vigente**

Esta distinción es hoy una de las definiciones canónicas más importantes y sí está reflejada en la implementación actual.

## 4. El runtime como decisor soberano

**Definición canónica recuperada**

Un runtime recibe contexto completo, decide y devuelve acciones. No debería ser el lugar donde se consulta el chat ni donde se ejecutan efectos directamente.

**Validación en código actual**

Se sostiene en:

- `apps/api/src/core/fluxcore-types.ts`
- `apps/api/src/services/fluxcore/runtime-gateway.service.ts`
- `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`
- `apps/api/src/services/fluxcore/action-executor.service.ts`

Contrato observable:

- `RuntimeInput` contiene `policyContext`, `runtimeConfig` y `conversationHistory`
- `RuntimeAdapter.handleMessage()` devuelve `ExecutionAction[]`
- `ActionExecutor` media los efectos

**Runtimes vigentes observables**

A nivel de implementación actual, el sistema resuelve hoy al menos estos IDs de runtime:

- `asistentes-local`
- `asistentes-openai`
- `fluxi-runtime`

Además siguen apareciendo huellas legacy en configuración e historia del proyecto, como:

- `@fluxcore/fluxcore`
- `@fluxcore/wes`

Para la documentación activa, deben considerarse históricos o transicionales salvo cuando el código actual todavía los use como compatibilidad.

## 5. El turno como unidad de decisión cognitiva

**Definición canónica recuperada**

La unidad de ingesta soberana es la señal. La unidad de decisión cognitiva es el turno conversacional.

**Validación en código actual**

Se sostiene en:

- `packages/db/src/schema/fluxcore-cognition-queue.ts`
- `apps/api/src/core/projections/chat-projector.ts`
- `apps/api/src/workers/cognition-worker.ts`

La cognición actual no corre por cada señal aislada. Agrupa una ventana conversacional y decide a nivel de turno.

## 6. El projector como derivador atómico

**Definición canónica recuperada**

Un projector no es lógica de UI ni un worker genérico. Es una pieza que lee el journal, materializa estado derivado y avanza su cursor en la misma transacción.

**Validación en código actual**

Se sostiene en:

- `apps/api/src/core/kernel/base.projector.ts`
- `packages/db/src/schema/fluxcore-projector-cursors.ts`
- `packages/db/src/schema/fluxcore-projector-errors.ts`

Projectores confirmados en el sistema actual:

- `identityProjector`
- `chatProjector`
- `sessionProjector`

## 7. Actor como identidad canónica de intercambio

**Definición canónica recuperada**

Un actor es cualquier entidad que puede intervenir en el intercambio conversacional: cuenta, visitante, IA embebida o extensión.

**Validación en código actual**

Se sostiene en:

- `packages/db/src/schema/actors.ts`
- `packages/db/src/schema/messages.ts`
- `apps/api/src/utils/actor-resolver.ts`
- frontend que calcula ownership usando `fromActorId`

**Conclusión vigente**

La reconstrucción actual del chat debe asumir que `fromActorId` es la identidad canónica del emisor. `senderAccountId` queda como dato operativo o de compatibilidad.

## 8. Identidad provisional del visitante

**Definición canónica recuperada**

El visitante anónimo no es un caso secundario. Es una identidad provisional con continuidad conversacional, que luego puede vincularse a una cuenta real sin mutar la historia previa.

**Validación en código actual**

Se sostiene en:

- `public-profile.routes.ts`
- `conversations.routes.ts`
- `chatcore-webchat-gateway.service.ts`
- `identity-projector.service.ts`
- `actors.externalKey`, `tenantId`, `linkedAccountId`
- `conversations.visitorToken`

## 9. Asset como entidad de primera clase

**Definición canónica recuperada**

Un asset no es una URL incrustada en un mensaje. Es una entidad propia con identidad, storage, ciclo de vida y relaciones reutilizables.

**Validación en código actual**

Se sostiene en:

- `packages/db/src/schema/assets.ts`
- `message-assets.ts`, `template-assets.ts`, `plan-assets.ts`
- `asset-upload-sessions.ts`
- `assets.routes.ts`
- `asset-registry.service.ts`
- `asset-gateway.service.ts`
- `asset-relations.service.ts`
- `message.service.ts` enlazando `content.media[].assetId` con `message_assets`

**Matiz importante**

La visión canónica de Asset está fuertemente sostenida por la infraestructura actual. Sin embargo, siguen existiendo huellas legacy de flujos anteriores de media. La documentación activa debe tratar como canónico el camino `assets + relaciones + assetId`, y como transicional cualquier flujo anterior que duplique esa responsabilidad.

## 10. Multi-tenant por cuentas, no por usuario

**Definición canónica recuperada**

El usuario sirve para autenticarse al sistema, pero el mundo operativo vive en cuentas. Una persona puede poseer varias cuentas y cada cuenta representa un mundo operacional distinto.

**Validación en código actual**

Se sostiene en:

- `packages/db/src/schema/accounts.ts`
- `accounts.ownerUserId`
- separación entre `user`, `account`, `actor`, `relationship`, `conversation`
- uso extendido de `accountId` como unidad operativa en rutas, servicios, assets, políticas y runtimes

## 11. Invariantes canónicos que hoy sí deben guiar la documentación

- **El sistema tiene tres dominios separados.**
- **El Kernel sigue siendo la capa soberana de certificación.**
- **Los projectores siguen siendo el mecanismo de materialización derivada.**
- **La unidad cognitiva actual es el turno.**
- **`fromActorId` es hoy la identidad canónica del emisor.**
- **ChatCore sigue siendo el mundo conversacional y humano.**
- **FluxCore sigue siendo la capa cognitiva y de ejecución mediada.**
- **Assets merece capítulo propio porque ya es una infraestructura real del sistema.**

## 12. Definiciones históricas que hoy deben reescribirse con cuidado

Estas ideas siguen siendo valiosas, pero no deben copiarse literalmente sin matiz:

- **"El Kernel solo acepta seis fact types"**
  - conceptualmente útil
  - técnicamente hoy no es exacto
- **"ChatCore no sabe que existe la IA"**
  - sigue siendo una frontera deseable y en gran parte observable en la forma de persistencia
  - pero el backend actual contiene puntos de integración y bordes compartidos que deben documentarse como tales
- **"Todo el chat ya está completamente unificado sobre assets"**
  - la dirección es correcta
  - pero todavía hay coexistencia de caminos legacy o transicionales en media/upload

## 13. Modelo canónico de eliminación de mensajes y conversaciones

### Principio fundamental

ChatCore es el custodio estructural de los mensajes. Los actores no son dueños de los mensajes: participan o se suscriben a la conversación donde el mensaje vive.

### Eliminación para todos (redacción)

Cuando un actor decide eliminar un mensaje para todos, el sistema no borra la fila ni marca un soft delete tradicional. En su lugar:

- el contenido original del mensaje se sobrescribe
- el mensaje pasa a contener un contenido equivalente a "Este mensaje fue eliminado"
- el campo `redactedAt` registra cuándo ocurrió la transformación
- el campo `redactedBy` registra quién la solicitó

**Ventana de tiempo**: La redacción solo está permitida dentro de los primeros 60 minutos después de enviado el mensaje.

**Endpoint**: `DELETE /messages/:id?scope=all`

Esto no es una edición normal del mensaje. Es una mutación estructural del mensaje en su raíz, donde el contenido original deja de existir en el sistema operativo de ChatCore.

La razón por la que no se borra la fila es para no romper referencias, respuestas o threads, y para evitar inconsistencias de sincronización entre clientes.

### Eliminación para un actor (ocultamiento)

Cuando un actor decide eliminar un mensaje solo para sí mismo:

- el mensaje original no se muta
- el mensaje sigue siendo visible para otros actores
- para ese actor específico, el mensaje deja de ser visible

**Sin ventana de tiempo**: Un actor puede ocultar cualquier mensaje en cualquier momento.

**Endpoint**: `DELETE /messages/:id?scope=self`

Esto se implementa mediante la tabla `message_visibility`, que registra qué actores han ocultado qué mensajes, sin mutar el mensaje original.

### "Vaciar chat" (limpiar conversación)

Cuando un actor decide "vaciar" una conversación:

- todos los mensajes de la conversación se ocultan para ese actor
- la conversación sigue existiendo y visible en la lista
- otros actores siguen viendo todos los mensajes normalmente

**Endpoint**: `POST /conversations/:id/clear`

**Implementación**: `hideAllMessagesForActor(conversationId, actorId)` inserta todos los mensajes de la conversación en `message_visibility` para ese actor.

### Suscripción a conversaciones

Las conversaciones no se eliminan físicamente cuando un actor las abandona. En su lugar:

- el actor se marca como `unsubscribedAt` en la tabla de participantes
- la conversación sigue existiendo para otros actores suscritos
- desde la perspectiva del actor, la conversación y los mensajes desaparecen

**Endpoint**: `DELETE /conversations/:id` (abandonar/soft delete)

Pero estructuralmente en ChatCore, la conversación y los mensajes siguen existiendo si otros actores continuán suscritos.

### Eliminación física de conversaciones

Una conversación solo puede eliminarse físicamente cuando ningún actor permanece suscrito. Cuando esto ocurre:

- el sistema puede ejecutar garbage collection
- la conversación y sus mensajes se eliminan físicamente
- esta eliminación física debe notificarse al Kernel

### Notificación al Kernel

Toda mutación estructural relevante debe notificarse al Kernel:

- sobrescritura del contenido de un mensaje (redacción)
- eliminación física de conversaciones por GC
- eliminación física de mensajes por cascada

La razón es que en meetgar.com pueden existir jobs, proyecciones, procesos cognitivos de FluxCore y tareas programadas que dependen de las señales del sistema. Si una entidad desaparece sin generar una señal certificada, esos procesos podrían quedar huérfanos o inconsistentes.

### Flujo completo de filtrado de visibilidad

**Paso 1: Frontend carga mensajes con accountId**
```
GET /conversations/:id/messages?accountId=X&limit=50
```

**Paso 2: Backend resuelve actor y aplica filtro**
```typescript
// conversations.routes.ts
const viewerActorId = await resolveActorId(accountId);
const messages = await messageService.getMessagesByConversationId(
  conversationId, 
  limit, 
  cursor, 
  viewerActorId // ← clave para filtrado
);
```

**Paso 3: Servicio aplica filtro de visibilidad**
```typescript
// message.service.ts
if (viewerActorId) {
  return await messageDeletionService.getMessagesWithVisibilityFilter(
    conversationId, 
    viewerActorId, 
    limit, 
    cursor
  );
}
```

**Paso 4: Exclusión de mensajes ocultos**
```sql
-- message_visibility filter
WHERE messages.conversation_id = $1
  AND messages.id NOT IN (
    SELECT message_id FROM message_visibility 
    WHERE actor_id = $2
  )
ORDER BY messages.created_at DESC
LIMIT $3
```

### Integración frontend-backend

**Chain de scope desde UI hasta backend:**
```
DeleteMessageModal (scope) 
  → MessageBubble.onDelete(scope)
  → ChatView.handleDelete(messageId, scope)
  → useChat.deleteMessage(messageId, scope)
  → DELETE /messages/:id?scope=scope
  → messageService.deleteMessage(messageId, accountId, scope, actorId)
  → messageDeletionService.deleteMessage(messageId, requesterActorId, scope)
```

**Bulk deletion con scope:**
```
MessageSelectionToolbar (scope)
  → ChatView.handleDeleteSelected(scope)
  → api.deleteMessagesBulk(messageIds, scope)
  → DELETE /messages/bulk (body: { messageIds, scope })
```

### Validación actual

Se sostiene completamente en:

- `packages/db/src/schema/messages.ts` — campos `redactedAt`, `redactedBy`
- `packages/db/src/schema/message-visibility.ts` — visibilidad por actor
- `packages/db/src/schema/conversation-participants.ts` — suscripción a conversaciones
- `apps/api/src/services/message-deletion.service.ts` — servicio completo de eliminación
- `apps/api/src/services/message.service.ts` — integración con filtro de visibilidad
- `apps/api/src/routes/messages.routes.ts` — endpoints DELETE con scope
- `apps/api/src/routes/conversations.routes.ts` — endpoints DELETE y POST /clear
- `apps/web/src/hooks/useChat.ts` — paso de accountId para filtrado
- `apps/web/src/components/ui/DeleteMessageModal.tsx` — UI de selección de scope
- `apps/web/src/components/chat/MessageBubble.tsx` — chain de scope
- `apps/web/src/components/chat/ChatView.tsx` — handlers con scope

## 14. Uso recomendado de este documento

Este archivo debe funcionar como ancla conceptual de la carpeta activa. Los otros documentos de `reconstruction-phase-1` deben apoyarse en estas definiciones cuando describan componentes, flujos y responsabilidades.
