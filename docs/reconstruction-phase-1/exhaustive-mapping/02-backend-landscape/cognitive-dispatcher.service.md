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
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Context resolution (Policy + Runtime), Automation gate (Auto/Suggest/Off), Semantic history building, Typing keeping-alive, Suggestion persistence, Stop-propagation enforcement" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ CognitiveDispatcherService

## 🎯 Propósito (v8.3 Canon §4.9)
El `CognitiveDispatcher` es el director de orquesta del ciclo de vida de un mensaje. Siguiendo el **Canon §4.9**, es responsable de recolectar toda la información necesaria (contexto de negocio, historial, reglas) y decidir qué runtime debe procesar el turno, gestionando la transición desde la intención hasta la ejecución de acciones mediadas.

## 🚥 Modos de Operación (The Gate)
El dispatcher aplica las restricciones del `PolicyContext` antes de cualquier llamada a la IA:
-   **AUTO**: Ejecuta el runtime y aplica las acciones mediadas inmediatamente a través del `ActionExecutor`.
-   **SUGGEST**: Ejecuta el runtime pero **guarda la respuesta como una sugerencia** (`aiSuggestions`) para revisión humana.
-   **OFF**: Cierra el turno sin realizar ninguna acción, ignorando el razonamiento de IA por completo.

## 🧬 Preparación de Contexto (Canon §4.5)
Garantiza que el input para la IA esté blindado ante drift configuracional. Delega en `RuntimeInputFactoryService` para ensamblar el `RuntimeInput` que incluye:
-   **Business Governance**: El `PolicyContext` resuelto (Soberanía de Negocio).
-   **Technical Config**: El asistente activo (`RuntimeConfig`) y sus instrucciones.
-   **Semantic History**: Una lista de hasta 50 mensajes purificados para el LLM.
-   **Action Mediation Services**: El sistema de herramientas autorizado (`RuntimeServices`).

## 🛡️ Humanización y Flujo
- **Typing Pulse:** Inicia un pulso de escritura ("typing...") cada 3 segundos mientras la IA razona.
- **Action Execution:** Pasa las acciones resultantes al `ActionExecutor` (Canon §4.8) para garantizar que los efectos secundarios sean mediados por la plataforma.

## 🧱 Dependencias
- **Depende de:** `flux-policy-context.service.ts`, `runtime-selection.service.ts`, `runtime-composition.service.ts`, `runtime-input-factory.service.ts`, `runtime-gateway.service.ts`, `action-executor.service.ts`.
- **Es usado por:** `cognition-worker.ts`.

## 💡 Ejemplo de Uso
```typescript
import { cognitiveDispatcher } from './services/fluxcore/cognitive-dispatcher.service';

const result = await cognitiveDispatcher.dispatch({
  turnId: 1088,
  conversationId: '...',
  accountId: '...'
});
```
