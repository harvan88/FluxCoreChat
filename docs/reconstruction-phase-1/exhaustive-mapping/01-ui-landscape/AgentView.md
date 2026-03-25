---
id: "agent-view"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/views/AgentView.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Contenedor Lógico Smart que alimenta a AgentDetailView Dumb" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Wrapper Individual de Agentes Abiertos (IDE Tabs Endpoint)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Optimistic State Update para inputs locales (Blur actions), Despachos PUT/DELETE" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🧠 AgentView

## 🎯 Propósito
Es el Envoltorio (Wrapper) Inteligente del "Centro" o núcleo. Su responsabilidad es puramente de infraestructura: Atrapar el ID del Agente que manda el Sistema de Pestañas del Panel IDE, disparar la búsqueda `api.getAgent()` para encontrar su metadata y Flujo interno, y atajar dolorosamente todas las devoluciones Callback que le mande el "Componente Visual Crudo" (`AgentDetailView`).

## 📦 Estado y Datos
Traza profunda de Estado Único en una sola caja de memoria React `agent: any`. No disgrega `name`, `flow`, etc. Es el Full Payload DB. 

## 🔄 Flujos de Interacción
1. **Mentira Reactiva (Optimistic Update) en `handleUpdateField`:** Tan pronto como el humáno quite el Foco del Nombre (Suelte Blur), él escribe rápidamente `setAgent({ ...agent, [field]: value })` haciendote creer en nanosegundos que guardó al Backend mientras silenciosamente dispara en Background la promesa real `api.updateAgent()`. Si falla, arroja la excepción cruda a la pantalla Error.
2. **Acciones de Ciclo de Vida Crítico:** Maneja la artillería en la sombra de encendidos (Activate - para enganchar al engine principal de colas) y de Apagados (Deactivate) y Destrucción del mundo (`api.deleteAgent()`), cerrando violentamente su propia Pestaña Padre con `onClose()`.

## 💡 Ejemplo de Uso
```tsx
// Dentro del Switcher de Tab Content del Panel Central
if (viewType === 'agent') {
   return <AgentView accountId={auth.companyId} agentId={tab.context.agentId} onClose={closeThisTab} />
}
```
