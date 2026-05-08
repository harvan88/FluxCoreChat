---
id: "table"
type: "ui-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/ui/Table.tsx"
---

# 📊 Table

## 🎯 Propósito
Sistema canónico de tablas (DataGrid) utilizado holísticamente en la plataforma. Proporciona una rejilla dinámica, agnóstica y altamente personalizable para mostrar conjuntos de datos complejos con soporte para ordenación, selección y diseño responsivo.

## 💡 Ejemplo de Uso
```tsx
<Table<User>
    columns={[
      { id: 'name', header: 'Nombre', accessor: row => row.name, sortable: true },
      { id: 'email', header: 'Email', accessor: row => row.email }
    ]}
    data={users}
    getRowKey={row => row.id}
    selectable={true}
    stickyHeader={true}
    showBorders={true}
    dense={false}
/>
```

## 🧩 Props
| Prop | Tipo | Default | Descripción |
| :--- | :--- | :--- | :--- |
| `columns` | `TableColumn<T>[]` | - | Definición de columnas y sus accessors. |
| `data` | `T[]` | - | Arreglo de datos a renderizar. |
| `getRowKey` | `(row: T) => string` | - | Función para obtener la key única de cada fila. |
| `selectable` | `boolean` | `false` | Habilita la columna de checkboxes para selección masiva. |
| `selectedIds` | `Set<string>` | - | IDs de las filas seleccionadas actualmente. |
| `onSelectionChange`| `(ids: Set<string>) => void` | - | Callback al cambiar la selección. |
| `onRowClick` | `(row: T) => void` | - | Callback al hacer clic en una fila. |
| `sortable` | `boolean` | `true` | Habilita el motor de ordenación in-memory. |
| `stickyHeader` | `boolean` | `false` | Mantiene la cabecera fija al hacer scroll. |
| `showBorders` | `boolean` | `true` | Muestra líneas divisorias entre filas y en la cabecera. |
| `dense` | `boolean` | `false` | Reduce el padding de las celdas para visualizaciones compactas. |

## 🔄 Flujos de Interacción
1. **Ordenación In-Memory**: El componente gestiona internamente el estado de ordenación, aplicando algoritmos nativos de comparación sobre los datos proporcionados para evitar latencia de red en listas cortas/medianas.
2. **Selección Masiva**: Proporciona un checkbox maestro en la cabecera para seleccionar/deseleccionar todas las filas visibles, emitiendo un `Set` actualizado con los IDs.
3. **Sticky Header & Virtualization Support**: Al habilitar `stickyHeader`, la cabecera se posiciona mediante `sticky top-0`, ideal para contenedores con scroll interno.

## 🛡️ Notas Arquitectónicas
- **Sincronización Bauhaus**: Los bordes utilizan la clase `.border-subtle`, cuya opacidad ha sido refinada globalmente en `index.css` para garantizar que las líneas sean finas y no intrusivas.
- **Inversión de Control**: Mediante el uso de `accessor` en las columnas, el componente delega la lógica de renderizado de cada celda al consumidor, permitiendo inyectar componentes complejos (badges, botones, iconos) sin acoplamiento.
