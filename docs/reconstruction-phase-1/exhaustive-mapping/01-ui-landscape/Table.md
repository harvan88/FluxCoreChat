---
id: "table"
type: "ui-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/ui/Table.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Completamente agnóstico, puro Typescript Generics T" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Rejilla Dinámica de Listados Masivos (Data Grid Base)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Sorting Lineal in-memory, Selección de Checkboxes masiva" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Table

## 🎯 Propósito
Sistema canónico de tablas (DataGrid) utilizado holísticamente en la plataforma (Asistentes, Documentos, Usuarios, Logging, Trace Views). Creada con genéricos strictos de Typescript `<T = any>` forzando a que las "Columnas" estructuren el mapa visual desde fuera definiendo qué variable debe sacar de un payload mediante un callback `accessor`.

## 📦 Estado y Datos
**Ordenado In-House (In-memory sorting):**
- Mantiene aislados los estados locales `sortColumn` y `sortDirection`. Recorre el array padre `data` aplicando una lógica cruda de sorting javascript nativo `((a, b) => aVal > bVal ? 1 : -1)` para evitar delegarle el dolorosos sorting al backend si la capa de datos es corta.

## 🔄 Flujos de Interacción
1. **Multi-Selección Re-activa (`selectable`):** Si es inyectado el booleano `selectable`, el componente inyecta una columna *fantasma* inicial llena de checkboxes. Mantiene cálculos Set() para inyectar/detraer del arreglo visual el Row y emitir `onSelectionChange`.
2. **Clicqueable Rango Entero:** Contiene directivas que interceptan `onClick` en sub-celdas via `e.stopPropagation()` permitiendo que puedas apretar o un check individual, o pinchar el Row al centro viajando a "Ver detalle" simultáneamente sin colisión de eventos DOM.

## 💡 Ejemplo de Uso
```tsx
<Table
    columns={[
      { id: 'name', header: 'Nombre', accessor: row => <span className="bold">{row.name}</span>, sortable: true },
      { id: 'size', header: 'Tamaño', accessor: row => row.size }
    ]}
    data={filesFetchedList}
    getRowKey={row => row.id}
    selectable={true}
/>
```
