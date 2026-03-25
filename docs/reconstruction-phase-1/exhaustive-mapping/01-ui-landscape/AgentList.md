---
id: "agent-list"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/fluxcore/agents/AgentList.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Ninguna. Entidad pasiva de tabla de iteración." }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tabla de Registros de Agentes Activos" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Formato Responsive con Ocultamiento md/lg" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 AgentList

## 🎯 Propósito
Es simplemente una `<Table>` manual que hace un `map()` del arsenal de Agentes `AgentSummary[]` que una organización haya configurado. Expone la macro-data (Número de asistentes involucrados en ese flujo, cuándo corrió por última vez, tipo de ignición/trigger). 

## 📦 Estado y Datos
Delegadas. Solo consume props inmutables. 

## 🔄 Flujos de Interacción
1. **Rendimiento Visual Escondido:** Utiliza la técnica de ocultamiento mediante Breakpoints CSS de Tailwind (`hidden md:table-cell`). Significa que si sacas o empujas el Sidebar, o te haces el vivo haciéndolo pequeño de ancho, escupirá columnas irrelevantes como las Fechas para preservar la vida en la tarjeta "Nombre".
2. **Botón Flotante (`group-hover`):** Cuenta en HTML puro con una técnica UX de "Hover reveal" sobre la fila entera que hace brotar los micro iconos grises de las acciones del final (Compartir, Recargar, Eliminar).

## 💡 Ejemplo de Uso
```tsx
<AgentList 
  agents={allRowsArray} 
  onSelect={(agent) => router.navigate('/agents/' + agent.id)} 
/>
```
