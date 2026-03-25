---
id: "action-executor-service"
type: "orchestration-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/fluxcore/action-executor.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "CognitionGateway, WorkEngineService, CoreEventBus, Drizzle (cognitionQueue, actionAudit)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Ejecutor de Efectos Mediados (Canon §4.4)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Action batch execution, Policy-based authorization validation, Reality certification via Gateway, WES state management (propose/advance), Audit logging of effects, Stop-propagation logic" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ ActionExecutorService

## 🎯 Propósito
El `ActionExecutor` es el puente entre el cerebro (IA) y el cuerpo (ChatCore). Siguiendo el **Canon §4.4**, traslada las intenciones cognitivas devueltas por los runtimes hacia operaciones tangibles en el sistema, asegurando que cada acción cumpla con las políticas de seguridad y deje una huella de auditoría.

## 🚥 Soberanía de Ejecución
Cada acción entregada por el LLM es validada contra el `PolicyContext` antes de ser ejecutada. Por ejemplo:
-   Si la IA intenta enviar una plantilla (`send_template`), el ejecutor verifica que el ID de la plantilla esté en la lista blanca autorizada de la cuenta.
-   Si la validación falla, la acción se marca como `rejected` en el log de auditoría y no llega nunca al destinatario.

## 🧬 Integración con WES (Fluxi)
Gestiona la transición de estados de trabajo complejos:
-   `propose_work`: Crea un hilo de trabajo pendiente.
-   `advance_work_state`: Actualiza slots (datos) de una tarea activa.
-   `request_slot`: Solicita confirmación semántica al usuario.
-   **Stop Propagation**: Si una acción activa un flujo de trabajo, el executor puede marcar la ejecución para detener futuras respuestas automáticas, evitando bucles infinitos de IA.

## 🛡️ Invariante de Certificación
Para el envío de mensajes (`send_message`), el servicio **nunca escribe directamente en la tabla de mensajes**. En su lugar, delega en el `CognitionGateway` para que el hecho sea certificado. Esto garantiza que ningún mensaje de IA exista en el sistema sin una señal de realidad que lo respalde.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { actionExecutorService } from 'apps/api/src/services/fluxcore/action-executor.service.ts';

// Ejemplo de invocación típica
const result = await actionExecutorService.execute(params);
```
