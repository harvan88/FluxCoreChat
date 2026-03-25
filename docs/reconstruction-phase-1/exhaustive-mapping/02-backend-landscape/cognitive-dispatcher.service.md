---
id: "cognitive-dispatcher-service"
type: "orchestration-service"
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

## 🎯 Propósito
El `CognitiveDispatcher` es el director de orquesta del ciclo de vida de un mensaje. Siguiendo el **Canon §4.9**, es responsable de recolectar toda la información necesaria (contexto de negocio, historial, reglas) y decidir qué runtime debe procesar el turno, gestionando la transición desde la intención hasta la ejecución.

## 🚥 Modos de Operación (The Gate)
El dispatcher aplica las restricciones del `PolicyContext` antes de cualquier llamada a la IA:
-   **AUTO**: Ejecuta el runtime y aplica las acciones inmediatamente.
-   **SUGGEST**: Ejecuta el runtime pero **guarda la respuesta como una sugerencia** (`aiSuggestions`) para que un humano la apruebe. Nunca envía el mensaje solo.
-   **OFF**: Cierra el turno sin realizar ninguna acción, ignorando el procesamiento de IA por completo.

## 🧬 Preparación de Contexto (Canon §4.5)
Garantiza que el input para la IA esté completo. Ensambla el `RuntimeInput` que incluye:
-   **Business Governance**: El `PolicyContext` resuelto.
-   **Technical Config**: El asistente activo y sus instrucciones.
-   **Semantic History**: Una lista de hasta 50 mensajes convertidos a formato `user/assistant`, filtrando ruido técnico y señales internas.

## 🛡️ Humanización (Typing Pulse)
Para mejorar la experiencia de usuario, el dispatcher inicia un `typingKeepAlive`. Este emite un pulso de escritura ("typing...") cada 3 segundos mientras la IA está razonando, y se detiene automáticamente una vez que el runtime devuelve una respuesta o falla, asegurando que el feedback visual en la UI sea coherente.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { cognitiveDispatcherService } from 'apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts';

// Ejemplo de invocación típica
const result = await cognitiveDispatcherService.execute(params);
```
