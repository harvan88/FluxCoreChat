---
id: "context-bus"
type: "runtime-infrastructure"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/agent-runtime/context-bus.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Agent Engine, Condition Evaluator, Telemetry" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Memoria de Corto Plazo de la Ejecución" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Immutable append-only writes, Step-keyed output storage, Token usage accumulation, Wall-clock time tracking, Resolution context building (for evaluator), Debug snapshotting" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Context Bus

## 🎯 Propósito
El `ContextBus` es la memoria compartida de una ejecución de flujo agéntico. Su función es recolectar los outputs de cada agente que interviene en un proceso y ponerlos a disposición de los agentes posteriores, permitiendo interacciones complejas y multi-paso.

## 🚥 Inmutabilidad y Orden
El bus es estrictamente **append-only**:
1.  Cada paso escribe su resultado bajo una llave única (`stepId`).
2.  Si un paso intenta sobreescribir un ID existente, el bus lanza un error fatal.
3.  Esta restricción previene efectos secundarios impredecibles y garantiza que el historial de la ejecución sea trazable y reproducible.

## 🧬 Acumulación de Costes y Tiempo
No solo guarda datos, actúa como auditor de la ejecución:
-   **Token Usage**: Suma los tokens de prompt y completion de cada llamada a LLM, permitiendo aplicar límites de presupuesto en tiempo real vía `ScopeEnforcer`.
-   **Elapsed Time**: Registra la duración exacta de cada paso, facilitando la detección de cuellos de botella en la cadena cognitiva.

## 🛡️ Perspectiva de Resolución
El bus provee el método `toResolutionContext()`, que aplana los datos para el `ConditionEvaluator`. Crea un objeto que contiene:
-   `trigger`: Los datos que iniciaron el flujo.
-   `context`: Metadatos globales (accountId, agentId).
-   `[stepId]`: El output directo de cada agente previo indexado por su nombre de paso.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: context-bus
import { contextBus } from 'apps/api/src/services/agent-runtime/context-bus.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await contextBus.process(input);
```
