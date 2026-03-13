# FluxCore — visión general estructural

## Rol del dominio

FluxCore es el dominio cognitivo y de gobernanza del sistema. Su función es decidir cómo debe responder el sistema a partir de señales certificadas, contexto de negocio, configuración de asistentes y runtimes registrados. FluxCore no entrega mensajes directamente al cliente ni persiste respuestas de IA en la tabla `messages`. En la arquitectura actual, produce decisiones y efectos mediados.

## Definición canónica validada

La definición histórica que hoy sí resiste validación es que FluxCore actúa como sistema operativo cognitivo: toma señales ya certificadas, resuelve contexto, invoca un runtime y devuelve acciones mediadas.

Dos invariantes canónicos que el código actual sí confirma:

- `PolicyContext` y `RuntimeConfig` son capas distintas
- el runtime decide y devuelve `ExecutionAction[]`; no debería ejecutar efectos directos por su cuenta

En la implementación actual, `flux-runtime-config.service.ts` resuelve runtimes efectivos como `asistentes-local`, `asistentes-openai` y `fluxi-runtime`, mientras `runtime-gateway.service.ts` se limita a registrarlos e invocarlos.

## Responsabilidades principales

- resolver `PolicyContext` y `RuntimeConfig` antes de invocar un runtime
- agrupar señales humanas en turnos mediante `fluxcore_cognition_queue`
- decidir cuándo una conversación está lista para procesamiento cognitivo
- invocar el runtime correcto según política y configuración activa
- traducir la salida del runtime a `ExecutionAction[]`
- ejecutar acciones mediadas, certificando respuestas de IA a través del Kernel
- proyectar identidad y otros modelos derivados desde el journal

## Componentes principales

### 1. Gobernanza y contexto

- `apps/api/src/services/flux-policy-context.service.ts`
  - resuelve `FluxPolicyContext` y `RuntimeConfig`
  - integra política de cuenta, asistente activo, templates autorizados, reglas de contacto y canal
  - usa datos de ChatCore y de configuración FluxCore

### 2. Turnos cognitivos

- `packages/db/src/schema/fluxcore-cognition-queue.ts`
  - cola de turnos pendientes de procesamiento cognitivo
- `apps/api/src/core/projections/chat-projector.ts`
  - observa señales humanas del Kernel y encola/actualiza turnos en `fluxcore_cognition_queue`
  - también observa `AI_RESPONSE_GENERATED` y devuelve esas respuestas al mundo ChatCore
- `apps/api/src/workers/cognition-worker.ts`
  - detecta turnos listos cuando vence la ventana de silencio
  - delega cada turno a `CognitiveDispatcher`

### 3. Decisión y ejecución

- `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`
  - resuelve contexto del turno
  - carga historial conversacional semántico
  - aplica el modo de automatización
  - invoca el runtime adecuado
  - entrega las acciones a `ActionExecutor`
- `apps/api/src/services/fluxcore/runtime-gateway.service.ts`
  - registro e invocación de runtimes
  - no decide qué runtime usar; solo ejecuta el que se le indica
- `apps/api/src/services/fluxcore/action-executor.service.ts`
  - ejecuta efectos mediados
  - para `send_message`, no escribe directo en ChatCore: certifica `AI_RESPONSE_GENERATED` vía `cognition-gateway.service.ts`
- `apps/api/src/services/fluxcore/cognition-gateway.service.ts`
  - reality adapter que certifica la salida cognitiva como señal del Kernel

### 4. Identidad proyectada

- `apps/api/src/services/fluxcore/identity-projector.service.ts`
  - projector log-driven que resuelve actores a partir del journal
  - maneja identidad autenticada y también identidad provisional del webchat
  - procesa el vínculo visitante → cuenta real como proyección de señales certificadas

### 5. Runtimes y capacidades

- `apps/api/src/services/fluxcore/runtimes/`
  - implementaciones concretas de runtime
- `apps/api/src/services/fluxcore/assistants.service.ts`
  - administración de asistentes y activación
- `apps/api/src/services/fluxcore/vector-store.service.ts`
  - integración con vector stores y contexto recuperado
- `apps/api/src/services/fluxcore/prompt-builder.service.ts`
  - construcción de instrucciones o entrada para runtimes

## Modelo de datos principal

### Tablas principales del dominio

- `packages/db/src/schema/fluxcore-cognition-queue.ts`
  - turnos pendientes de procesamiento
- `packages/db/src/schema/fluxcore-assistants.ts`
  - asistentes configurables por cuenta
- `packages/db/src/schema/account-runtime-config.ts`
  - configuración técnica por cuenta / runtime
- `packages/db/src/schema/fluxcore-account-policies.ts`
  - gobernanza de automatización y tiempos
- `packages/db/src/schema/ai-suggestions.ts`
  - sugerencias persistidas cuando el modo es `suggest`
- `packages/db/src/schema/fluxcore-action-audit.ts`
  - auditoría de acciones ejecutadas
- `packages/db/src/schema/fluxcore-actors.ts`, `fluxcore-addresses.ts`, `fluxcore-actor-identity-links.ts`
  - modelo de identidad proyectado dentro del subdominio FluxCore

## Interacción con Kernel

FluxCore depende del Kernel como capa soberana intermedia en dos direcciones:

- **Entrada**
  - no consume tráfico humano directo desde la UI
  - consume señales certificadas del journal a través de projectores
- **Salida**
  - no entrega respuestas directamente al chat
  - certifica `AI_RESPONSE_GENERATED` mediante `cognition-gateway.service.ts`
  - el Kernel registra esa señal y `ChatProjector` la proyecta al dominio ChatCore

## Interacción con ChatCore

FluxCore depende de ChatCore para el estado conversacional operativo, pero no lo controla directamente.

- usa conversaciones e historial de mensajes para construir contexto
- usa la relación y el canal conversacional para resolver política
- usa ChatCore como dominio de ejecución física del mensaje final

La relación actual puede resumirse así:

1. ChatCore persiste mensaje humano
2. ChatCore certifica observación al Kernel
3. `ChatProjector` encola turno cognitivo
4. `CognitionWorker` y `CognitiveDispatcher` deciden qué hacer
5. `ActionExecutor` certifica salida de IA en el Kernel
6. `ChatProjector` entrega la respuesta a ChatCore
7. ChatCore persiste y distribuye la respuesta

## Frontera del dominio

FluxCore sí hace:

- política, contexto y decisión cognitiva
- selección e invocación de runtimes
- producción de acciones mediadas
- proyecciones derivadas desde señales del Kernel

FluxCore no hace:

- persistir mensajes finales directamente en `messages`
- abrir sockets al cliente como dominio principal
- certificar hechos sin pasar por un gateway autorizado
- sustituir el modelo conversacional de ChatCore
