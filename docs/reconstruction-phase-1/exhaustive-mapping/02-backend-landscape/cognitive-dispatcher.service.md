---
id: "cognitive-dispatcher-service"
type: "core"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FluxPolicyContextService, RuntimeGateway, ActionExecutor, AccountLabelService, Drizzle (conversations, messages, suggestions)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Router de Decisiones Cognitivas (Canon §4.9)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Context resolution (Policy + Runtime), Automation gate (Auto/Suggest/Off), Semantic history building, Typing keeping-alive, Suggestion persistence, Stop-propagation enforcement, Telemetría OpenTelemetry" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# CognitiveDispatcherService

## Propósito
`CognitiveDispatcherService` es el punto donde un turno listo para procesarse se convierte en una invocación soberana de runtime. Resuelve el contexto de negocio y técnico, arma el historial semántico, aplica los gates de automatización y entrega al `ActionExecutor` las acciones resultantes.

## Arquitectura
El método `dispatch(...)` realiza, en este orden, las siguientes tareas verificadas en código:

1. carga la conversación desde `conversations`
2. resuelve `PolicyContext`
3. resuelve `RuntimeSelection`
4. obtiene `RuntimeComposition` y `runtimeConfig` enriquecido
5. reconstruye hasta 50 mensajes semánticos desde `messages`
6. construye `RuntimeInput` usando `runtimeInputFactoryService`
7. invoca el runtime a través de `runtimeGateway`
8. entrega `ExecutionAction[]` a `actionExecutor.execute(...)`

## Gates de operación
El comportamiento depende del `PolicyContext.mode` y del estado de `RuntimeSelection`:

- **`off`**
  - cierra el turno con `actionExecutor.closeTurn(...)`
  - no invoca ningún runtime
- **`suggest`**
  - invoca el runtime
  - persiste la sugerencia en `aiSuggestions`
  - no ejecuta automáticamente las acciones resultantes
- **`auto`**
  - invoca el runtime
  - ejecuta las acciones mediante `ActionExecutor`

Si `runtimeSelection.state === 'inactive'`, el dispatcher también cierra el turno sin invocar IA.

## Observabilidad implementada
Antes de invocar `runtimeGateway.invoke(...)`, el dispatcher hace wrapping con:

```ts
trackCognitiveStep('IA_RUNTIME_INVOCATION', attributes, input, async () => {
  return runtimeGateway.invoke(runtimeId, input, lastSignalSeq);
});
```

Eso captura el `RuntimeInput` efectivo y lo publica como `telemetry:distributed_trace`, lo que permite inspección live en `KernelConsole`.

Además, el dispatcher emite `telemetry:pipeline_step` en caminos exitosos de `suggest` y `auto`.

## Efectos auxiliares
- inicia un pulso de typing cada 3 segundos mientras el runtime está razonando
- intenta certificar un paso interno de contexto resuelto; si falla, registra el error sin bloquear el turno
- consulta `fluxcore_cognition_queue` para recuperar `targetAccountId` antes de ejecutar acciones

## Dependencias
- **Depende de:** `flux-policy-context.service.ts`, `runtime-selection.service.ts`, `runtime-composition.service.ts`, `runtime-input-factory.service.ts`, `runtime-gateway.service.ts`, `action-executor.service.ts`, `apps/api/src/telemetry/tracer.ts`.
- **Es usado por:** `cognition-worker.ts`.

## Riesgos o límites actuales
- La trazabilidad profunda del payload es live-first y depende del canal WebSocket.
- La validación TypeScript global del API hoy está contaminada por errores preexistentes en scripts auxiliares, por lo que este componente no puede considerarse validado mediante gate global de repo.

## Ejemplo de uso
```ts
import { cognitiveDispatcher } from './services/fluxcore/cognitive-dispatcher.service';

const result = await cognitiveDispatcher.dispatch({
  turnId: 1088,
  conversationId: '...',
  accountId: '...',
  lastSignalSeq: 1089,
});
```
