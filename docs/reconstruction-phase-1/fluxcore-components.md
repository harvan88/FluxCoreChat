# FluxCore — componentes, decisión cognitiva y ejecución mediada

## Objetivo de este documento

Este documento describe la composición actual de FluxCore como dominio cognitivo. El foco está en contexto de política, formación de turnos, worker cognitivo, dispatcher, runtimes y ejecución mediada.

## 1. Entrada real de FluxCore

FluxCore no recibe directamente mensajes desde UI. Su entrada real proviene de estado derivado desde señales certificadas.

### Pieza de frontera: `ChatProjector`

- `apps/api/src/core/projections/chat-projector.ts`

Responsabilidades observables:

- observar mensajes humanos ya certificados en el Kernel
- extraer `conversationId`, `accountId`, `targetAccountId` y contenido relevante
- upsert de turnos en `fluxcore_cognition_queue`
- observar señales `AI_RESPONSE_GENERATED` y devolverlas a ChatCore

Esto convierte a `ChatProjector` en la pieza que conecta el journal soberano con el pipeline cognitivo.

## 2. Formación de turnos cognitivos

### Cola de turnos

- `packages/db/src/schema/fluxcore-cognition-queue.ts`

Responsabilidades observables:

- almacenar una unidad pendiente de decisión por conversación
- conservar la última señal relevante, ventana temporal y estado de procesamiento
- permitir que varias señales del mismo turno se compacten en una sola ejecución cognitiva

### Worker de turnos

- `apps/api/src/workers/cognition-worker.ts`

Responsabilidades observables:

- hacer polling de turnos vencidos o listos
- aplicar locking operacional y retries
- delegar el turno listo al `CognitiveDispatcher`
- registrar errores y reprogramar procesamiento cuando corresponde

## 3. Resolución de contexto de negocio y runtime

### `FluxPolicyContextService`

- `apps/api/src/services/flux-policy-context.service.ts`

Responsabilidades observables:

- resolver `FluxPolicyContext`
- resolver `RuntimeConfig`
- separar política de negocio de configuración técnica del runtime
- combinar datos de ChatCore y de tablas FluxCore
- considerar modo, delay, ventanas, templates autorizados, reglas del contacto y perfil autorizado del negocio

### Tablas de soporte para gobernanza

- `packages/db/src/schema/fluxcore-account-policies.ts`
  - modo `auto` / `suggest` / `off`
  - ventanas de turno y política fuera de horario
- `packages/db/src/schema/account-runtime-config.ts`
  - runtime activo por cuenta y configuración técnica general
- `packages/db/src/schema/fluxcore-assistants.ts`
  - asistentes configurables por cuenta
  - runtime, modelo, timing y scopes autorizados

## 4. Dispatcher cognitivo

### `cognitive-dispatcher.service.ts`

- `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`

Responsabilidades observables:

- tomar un turno listo desde el worker
- resolver `PolicyContext` y `RuntimeConfig`
- cargar historial conversacional desde ChatCore
- aplicar gates de automatización
- decidir si corresponde invocar runtime o producir otro resultado operativo
- pasar las acciones devueltas por el runtime al `ActionExecutor`

Este componente es el director del ciclo cognitivo, no el generador final de mensajes.

## 5. Registro e invocación de runtimes

### `RuntimeGatewayService`

- `apps/api/src/services/fluxcore/runtime-gateway.service.ts`

Responsabilidades observables:

- mantener un registro de runtimes disponibles
- invocar el runtime pedido por ID
- imponer timeout y manejo de errores alrededor de la invocación

### Configuración de asistentes

- `apps/api/src/services/fluxcore/assistants.service.ts`

Responsabilidades observables:

- asegurar existencia de un asistente activo por cuenta si no existe uno
- componer relaciones con instrucciones, vector stores y tools
- gestionar la activación operativa del asistente
- servir de capa de administración para la configuración que luego usa FluxCore en tiempo de decisión

## 6. Ejecución mediada de acciones

### `ActionExecutorService`

- `apps/api/src/services/fluxcore/action-executor.service.ts`

Responsabilidades observables:

- ejecutar `ExecutionAction[]`
- manejar acciones como `send_message`, sugerencias, templates o propuestas de trabajo
- certificar efectos hacia el Kernel en lugar de escribir directamente en ChatCore

### `CognitionGatewayService`

- `apps/api/src/services/fluxcore/cognition-gateway.service.ts`

Responsabilidades observables:

- certificar la salida cognitiva como señal `AI_RESPONSE_GENERATED`
- firmar y enviar esa señal al Kernel
- preservar la separación entre decisión cognitiva y entrega conversacional

Regla observable importante:

- FluxCore decide y certifica
- ChatCore persiste y entrega

## 7. Proyecciones propias dentro de FluxCore

### Identidad

- `apps/api/src/services/fluxcore/identity-projector.service.ts`

Responsabilidades observables:

- proyectar actores desde el journal
- manejar identidad provisional del webchat
- vincular visitante con cuenta real como hecho derivado

### Sesiones

- `apps/api/src/services/session-projector.service.ts`

Responsabilidades observables:

- mantener proyección de sesión a partir de eventos del journal
- ofrecer un estado derivado del ciclo de autenticación

Estas piezas muestran que FluxCore no es solo ejecución LLM: también contiene proyecciones estructurales necesarias para la cognición y la identidad operativa.

## 8. Persistencia principal de FluxCore

### Tablas cognitivas y de gobernanza

- `fluxcore_cognition_queue`
- `fluxcore_account_policies`
- `account_runtime_config`
- `fluxcore_assistants`
- tablas de relación de asistentes con instrucciones, vector stores y tools
- `ai_suggestions`
- `fluxcore_action_audit`

### Tablas de identidad y proyección

- `fluxcore_actors`
- `fluxcore_actor_identity_links`
- `fluxcore_addresses`
- `fluxcore_actor_address_links`
- `fluxcore_session_projection`

## 9. Relación de FluxCore con ChatCore y Kernel

### Dependencia respecto de ChatCore

FluxCore usa a ChatCore como fuente del mundo conversacional operativo:

- historial de mensajes
- datos de conversación
- canal de interacción
- información del negocio que existe aunque no hubiera IA

### Dependencia respecto del Kernel

FluxCore depende del Kernel como capa soberana:

- no consume directamente tráfico de UI
- no certifica por fuera de gateways autorizados
- no entrega respuestas sin pasar por una señal del journal

## 10. Invariantes observables del dominio

- la unidad de decisión es el turno, no la señal individual
- `PolicyContext` y `RuntimeConfig` están separados en la implementación actual
- el modo de automatización actúa como gate previo al runtime
- los runtimes no son la frontera de persistencia del chat
- las respuestas AI vuelven al sistema como hechos certificados, no como escritura directa en `messages`

## 11. Observaciones de arquitectura actual

### Caminos paralelos / legacy

El repositorio todavía muestra coexistencia entre:

- el pipeline actual `ChatProjector -> CognitionWorker -> CognitiveDispatcher -> RuntimeGateway -> ActionExecutor`
- caminos anteriores o complementarios como `message-dispatch.service.ts` y partes de `ws-handler.ts`

Para fines de documentación, el pipeline anterior debe considerarse existente y documentable, pero la ruta centrada en `CognitionWorker` es la columna vertebral más clara del modelo actual.

### Influencia del canon en el vocabulario del código

La separación entre:

- perfil de negocio en ChatCore
- política de operación en FluxCore
- configuración técnica del runtime

sí aparece reflejada en nombres de servicios, tablas y responsabilidades, aunque todavía existan huellas de etapas previas del sistema.
