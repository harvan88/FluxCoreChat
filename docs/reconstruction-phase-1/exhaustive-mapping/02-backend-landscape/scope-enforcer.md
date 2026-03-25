---
id: "scope-enforcer"
type: "runtime-security"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/agent-runtime/scope-enforcer.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Agent Engine, Context Bus" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Restricciones Contenidas (Safe-Execution)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Model whitelist enforcement, Real-time token budget tracking, Execution time deadline monitoring, Tool permission validation, Sub-agent recursion prevention" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Scope Enforcer

## 🎯 Propósito
El `ScopeEnforcer` es el policía del runtime. Su misión es asegurar que ningún agente, ya sea por error o por diseño malicioso, consuma más recursos de los autorizados. Actúa como una capa de "Sandboxing" administrativo para las ejecuciones de IA.

## 🚥 Los 5 Pilares de Control
1.  **Modelos Autorizados**: Evita el uso de modelos ultra-caros (como GPT-4-Turbo) si el agente solo tiene permiso para modelos ligeros.
2.  **Presupuesto de Tokens**: Monitoriza el consumo acumulado en el `ContextBus`. Si un flujo se vuelve "loco" y empieza a generar texto masivo, el enforcer lo detiene en seco.
3.  **Límite de Tiempo (Deadline)**: Garantiza que ninguna ejecución bloquee recursos del servidor más allá del tiempo pactado (ej: 30 segundos). Pasado el tiempo, el flujo se aborta con error de timeout.
4.  **Herramientas Permitidas**: Valida que el agente solo llame a herramientas (tools) que están en su lista blanca. Fundamental para prevenir fugas de datos.
5.  **Recursión de Sub-Agentes**: Controla si un agente puede o no disparar otros agentes, evitando bucles infinitos de coste.

## 🧬 Supervisión Pre y Post Paso
A diferencia de un firewall simple, el enforcer actúa antes y después de cada acción:
-   **Pre-Step**: ¿Tengo tiempo suficiente para empezar esta tarea?
-   **Post-Step**: Ahora que sé cuántos tokens gasté, ¿me queda saldo para el siguiente paso?

## 🛡️ Transparencia de Infracción
Cuando se violan los límites, el enforcer no solo detiene la ejecución, sino que devuelve una `ScopeViolation` detallada con métricas precisas (ej: "Gastaste 5100 tokens de un límite de 5000"), lo que permite al desarrollador ajustar los parámetros del agente con base científica.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: scope-enforcer
import { scopeEnforcer } from 'apps/api/src/services/agent-runtime/scope-enforcer.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await scopeEnforcer.process(input);
```
