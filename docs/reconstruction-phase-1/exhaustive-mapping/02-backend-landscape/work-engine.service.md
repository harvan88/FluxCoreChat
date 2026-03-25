---
id: "work-engine-service"
type: "orchestration-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/work-engine.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "WES Interpreter, MessageCore, MetricsService, Drizzle (works, slots, events, proposedWorks, semanticContexts)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Núcleo de Ejecución de Tareas (WES)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Work proposal (AI), Stateful work execution, Slot solving/ingestion, Semantic confirmation flow, Delta-based state updates, Optimistic concurrency control" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ WorkEngineService

## 🎯 Propósito
El `WorkEngineService` es el corazón del **Work Execution System (WES)**. Es la máquina de estados que permite a la IA colaborar con humanos en tareas estructuradas (ej: agendar una cita, completar un formulario) gestionando estados, capturando datos ("Slots") y orquestando transiciones lógicas.

## 🚥 Ciclo de Vida del Trabajo (Work)
1.  **Propuesta (ProposedWork)**: La IA identifica una intención y propone iniciar una tarea con datos candidatos.
2.  **Apertura**: Tras validación humana o automática, se instancia un `Work` con una versión específica de su definición.
3.  **Ingestión**: El motor procesa mensajes entrantes para extraer nuevos valores de slots (ingestión semántica).
4.  **Confirmación Semántica**: Si hay ambigüedad o datos críticos, el motor "pregunta" al usuario y espera una respuesta afirmativa no-LLM para proceder.

## 🧬 Control de Concurrencia (Deltas)
FluxCore utiliza un modelo de **Deltas** para modificar estados. Cada cambio (set de valor o transición de estado) se aplica de forma atómica mediante un número de revisión (`revision`). Si dos procesos intentan actualizar el mismo trabajo simultáneamente, el sistema detecta el conflicto de revisión y aborta la transacción, garantizando la integridad de los datos.

## 🛡️ Efectos Externos
Gestiona el "reclamo" (`claim`) y registro de efectos hacia herramientas externas, asegurando que las llamadas a APIs o herramientas se registren con llaves de idempotencia para evitar ejecuciones duplicadas de acciones críticas.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { workEngineService } from 'apps/api/src/services/work-engine.service.ts';

// Ejemplo de invocación típica
const result = await workEngineService.execute(params);
```
