---
id: "condition-evaluator"
type: "runtime-logic"
status: "stable"
criticality: "high"
location: "apps/api/src/services/agent-runtime/condition-evaluator.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Agent Engine, Context Bus" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Evaluador de Expresiones Sandboxed" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Template interpolation (mustaches), Boolean condition evaluation, Zero-eval parser (Security), Property dot-notation access, Logical/Comparison operator support" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Condition Evaluator

## 🎯 Propósito
El `ConditionEvaluator` es el motor lógico que permite el ramificado (branching) dinámico en los flujos de agentes. Permite evaluar expresiones como `{{ intent == 'comprar' }}` para decidir si un paso del flujo debe ejecutarse o saltarse basándose en el estado acumulado en el bus de contexto.

## 🚥 Seguridad por Diseño (Zero-Eval)
A diferencia de soluciones ingenuas que usan `eval()` o `new Function()`, este evaluador implementa un parser propio:
-   **Tokenización**: Rompe la cadena en literales, operadores e identificadores.
-   **Sandbox**: No tiene acceso a variables globales de Node.js ni a funciones externas. Solo puede ver los datos inyectados en el contexto.
-   **Inmutabilidad**: Solo realiza operaciones de lectura y comparación, garantizando que evaluar una condición nunca cambie el estado del sistema.

## 🧬 Capacidades de Expresión
Soporta una sintaxis inspirada en Jinja/Handlebars:
-   **Acceso a Propiedades**: Soporta anidamiento profundo (ej: `trigger.metadata.user_id`).
-   **Comparadores**: `==`, `!=`, `>`, `<`, `>=`, `<=`.
-   **Lógica**: `&&`, `||`, `!`.
-   **Tipos**: Maneja strings, números, booleanos, null y undefined de forma nativa.

## 🛡️ Interpolación de Templates
Además de booleanos, expone `resolveTemplate` para construir strings dinámicos. Esto se usa para inyectar resultados de pasos anteriores en los prompts de los pasos siguientes:
`"Hola {{ get-profile.name }}, ¿en qué puedo ayudarte?"`

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: condition-evaluator
import { conditionEvaluator } from 'apps/api/src/services/agent-runtime/condition-evaluator.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await conditionEvaluator.process(input);
```
