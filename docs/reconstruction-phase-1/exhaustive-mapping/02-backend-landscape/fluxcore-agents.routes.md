---
id: "fluxcore-agents-routes"
type: "api-routes"
status: "stable"
criticality: "high"
location: "apps/api/src/routes/fluxcore-agents.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FlowRegistryService, AuthMiddleware" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API del Motor de Agentes (Fase 3)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Agent CRUD, Flow definition updates, Scope management, Activation/Deactivation lifecycle, Multi-assistant assignment to single Agent flow" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ FluxCore Agents Routes

## 🎯 Propósito
Las `FluxCore Agents Routes` gestionan los "Agentes de Alto Nivel", que a diferencia de los Asistentes simples, poseen lógica de flujo (graphs) y pueden orquestar a múltiples sub-asistentes para tareas complejas. Es la API de gestión para la arquitectura agéntica de Fase 3.

## 🚥 Gestión de Flujos (Flows)
A través del endpoint `/:id/flow`, los administradores pueden definir la lógica de decisión del agente (nodos, condiciones, transiciones). El sistema valida que el flujo sea un grafo válido y persistente antes de permitir su ejecución.

## 🧬 Scopes y Límites
Permite configurar los `scopes` del agente:
-   **Token Budgets**: Límites de gasto por ejecución.
-   **Timeouts**: Tiempo máximo de razonamiento.
-   **Model Scopes**: Restricción de qué modelos tiene permitido "llamar" el agente durante su flujo.

## 🛡️ Activación y Orquestación
-   **Ciclo de Vida**: Los agentes pueden estar en modo draft o activos. Solo los agentes activos participan en el procesamiento del `Real-Time Pipeline`.
-   **Multi-Assistant**: Permite mapear qué asistentes de FluxCore cumplen roles específicos dentro del flujo del agente (ej: un asistente para ventas, otro para soporte técnico, coordinados por un único Agente Principal).

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './fluxcore-agents.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/fluxcore/agents', router);
```
