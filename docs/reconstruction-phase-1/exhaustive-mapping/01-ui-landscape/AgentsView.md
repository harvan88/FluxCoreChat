---
id: "agents-view"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/views/AgentsView.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Llama fetch GET `/api/agents/:accountId`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Orquestador List View para el Ecosistema Agent Engine (Fase 3)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Instanciación delegada a `CollectionView`, Apertura de Pestañas IDE Tabs" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🧠 AgentsView

## 🎯 Propósito
Es el componente Padre Principal cuando seleccionas en tu "Totem" la sección "Agentes FluxCore". Se encarga de escupir todo el arsenal trayendo los datos desde red (`api.getAgents`), transformarlos usando los Helpers de Celdas (Table Accessors) y meterlo todo dentro del poderoso Standard de Grillas `CollectionView`.

## 📦 Estado y Datos
- **Control de Inyecciones (`agents`, `loading`, `error`):** Realiza la carga estricta una sola vez con UseCallback y despacha Promesas en Montaje `useEffect`. 

## 🔄 Flujos de Interacción
1. **Apertura Estilo IDE (`handleOpenAgent`):** Cuando clicas violentamente un Agente en la fila, no invoca `router.push('/url')`. Reclama el prop `onOpenTab`, le inserta una identidad mágica `extension:fluxcore:agent:{account}:{agentId}` y le ordena al FluxCore crear en el "Panel Superior" y anclar una sub-ventana que guardará esa apertura para siempre hasta que pulses la `x`.
2. **Generación Instantánea Automática:** El botón de crear no levanta modal de Wizard ni de Título. Enseña cómo funciona la app "Headless". Pega Crudo al Backend tirando nombre fantasma "Agente XYZ", carga el ID nuevo en RAM e invoca la `Apertura Estilo IDE` para dejarte el editor crudo en la cara.

## 💡 Ejemplo de Uso
```tsx
const openTab = usePanelStore(s => s.openTab);

return <AgentsView accountId={currentOrg.id} onOpenTab={openTab} />;
```
