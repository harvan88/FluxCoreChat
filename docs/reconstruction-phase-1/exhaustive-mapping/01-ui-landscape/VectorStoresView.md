---
id: "vector-stores-view"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/views/VectorStoresView.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Derivador principal dependiente de LocalVectorStoreDetail / OpenAIDetail" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Orquestador (El Manager de la UI) de Bases Vectoriales" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "EntitySelection Hook (URL vs Parametros), Decision UI Modals (Cloud vs Local)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🗄️ VectorStoresView

## 🎯 Propósito
Componente Router/Gestor "Camaleón". Ante el usuario dibuja una lista única de "Bases de conocimiento", pero cuando el usuario pica una, este componente actúa de despachador evaluando el `store.backend`. Si la DB está subida a los servidores de OpenAI, inyecta por el tubo de pintado a `OpenAIVectorStoreDetail`, si es local (`Chroma/PgVector`), inyecta `LocalVectorStoreDetail`.

## 📦 Estado y Datos
**Selector de Entidad Transparente (`useEntitySelection`):**
- Delega el terrible y asqueroso problema del "Refreshazo de Página". Asegurándose de que si abres la URL directa con "uuid" pegado, la app se detiene (loading: true), pide el UUID de vector Store exacto a Postgres y luego continúa su carga evitando blanqueos.

## 🔄 Flujos de Interacción
1. **Modal de Nacimiento (El Tipo de Backend):** Posee el estado flotante `showBackendModal`. Cuando el usuario intenta hacer una nueva base, estalla este popup oscureciendo el ambiente para forzarle la decisión moral: Local u OpenAI. Acto seguido le hace `createVectorStore` pasando dicho `backend` Flag en el enum.

## 💡 Ejemplo de Uso
```tsx
<VectorStoresView 
    accountId={companyId}
    onOpenTab={insertToTabStoreFn}
    vectorStoreId={optUrlIdSelected}
/>
```
