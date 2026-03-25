---
id: "agent-engine"
type: "runtime-core"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/agent-runtime/engine.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "ContextBus, ScopeEnforcer, ConditionEvaluator, AgentExecutors" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Ejecución de Flujos (Graph Walker)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Sequential/Conditional step execution, Router-based dynamic branching, Step lookup & building queue, Wall-clock & Token safety limits, Full execution trace generation" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Agent Engine

## 🎯 Propósito
El `Agent Engine` es el procesador central que "camina" a través de un grafo de ejecución (`AgentFlow`). Transforma una definición estática de pasos en una secuencia de acciones coordinadas, manejando la lógica de decisión, la seguridad de recursos y la recolección de evidencias.

## 🚥 Arquitectura de Ejecución
Soporta tres patrones fundamentales de flujo:
1.  **Secuencial**: Los pasos se ejecutan uno tras otro según el orden definido.
2.  **Condicional**: Utiliza el `ConditionEvaluator` para saltar pasos basándose en datos previos (ej: si no hay stock, saltar paso de pago).
3.  **Ramificación Dinámica (Router)**: Permite que un agente especial decida cuál es el siguiente paso a ejecutar, modificando la cola de ejecución en tiempo real.

## 🧬 El Ciclo de Paso (Step Cycle)
Cada paso del flujo pasa por un riguroso ciclo de vida:
-   **Pre-Check**: El `ScopeEnforcer` valida si queda tiempo y presupuesto.
-   **Evaluación**: Se comprueba si la condición de ejecución se cumple.
-   **Despacho**: Se localiza el ejecutor correspondiente (LLM, RAG, Tool, etc.).
-   **Persistencia**: El output se inyecta en el `ContextBus`.
-   **Post-Check**: Se actualiza el consumo de tokens y se valida si se ha roto algún límite de seguridad.

## 🛡️ Observabilidad y Trazabilidad
El motor produce un objeto `FlowExecutionResult` extremadamente detallado que incluye un `StepTrace` por cada paso. Esto permite reconstruir la "línea de pensamiento" de la IA, viendo exactamente cuánto tardó cada herramienta y cuántos tokens consumió cada proveedor en una sola transacción.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: engine
import { engine } from 'apps/api/src/services/agent-runtime/engine.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await engine.process(input);
```
