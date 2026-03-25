---
id: "flow-registry"
type: "runtime-infrastructure"
status: "stable"
criticality: "high"
location: "apps/api/src/services/agent-runtime/flow-registry.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FluxCore Agents, AgentAssistants, Drizzle DB" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Repositorio y Gestor de Agentes" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Agent CRUD, Flow/Scope updates, Assistant role mapping (Worker/Director), Agent activation lifecycle (Draft -> Active -> Archived), Multi-assistant composition" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Flow Registry

## 🎯 Propósito
El `FlowRegistry` es el inventario central de cerebros de FluxCore. Gestiona la persistencia y la composición de los Agentes, permitiendo definir no solo qué flujos ejecutan, sino qué asistentes humanos o de IA tienen permitidos usar para llevar a cabo sus tareas.

## 🚥 Composición de Equipos
A diferencia de un asistente simple, un Agente puede estar compuesto por múltiples asistentes:
-   **Mapeo de Roles**: Define funciones específicas (ej: un asistente es el "Traductor", otro es el "Analista").
-   **Step Linking**: Permite vincular un asistente específico a un paso concreto del flujo agéntico, asegurando que la herramienta correcta se use en el momento correcto.

## 🧬 Gestión de Ciclo de Vida
Implementa un sistema de estados robusto:
-   **Draft**: El agente está en diseño, no se puede disparar por eventos externos.
-   **Active**: El agente está "en vivo" y listo para responder a disparadores (triggers).
-   **Archived**: Versión histórica, no ejecutable pero preservada para auditoría.

## 🛡️ Integridad de Scopes
Cada vez que se crea o actualiza un agente, el registro asegura que se definan límites de seguridad (`AgentScopes`) por defecto. Si el usuario no especifica presupuestos de tokens o tiempo, el registro impone valores conservadores (ej: 5000 tokens / 30s) para proteger la infraestructura.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: flow-registry
import { flowRegistry } from 'apps/api/src/services/agent-runtime/flow-registry.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await flowRegistry.process(input);
```
