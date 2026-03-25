---
id: "select"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/ui/Select.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Uso general de inputs Dropdown" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Selector múltiple reactivo con buscador embed" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Manejo de estados múltiples vs simple" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🎨 Select (FC-409)

## 🎯 Propósito
Substituto del tag original `<select>` de HTML5 con superpoderes personalizados. El componente Select ofrece búsquedas in-viewport, soporte nativo de íconos inyectables por opción, y bifurca su estado operativo para manipular selecciones estáticas o Arrays completos (`multiple`).
## 🧰 Props
- `options` (SelectOption[], Requerido): Colección estructurada de items seleccionables.
- `value` / `values` (string | string[], Opcional): Contenedores agnósticos polimórficos de elección simple/matrix.
- `onChange` (function, Opcional): Propagador dual hacia arriba de los id/s seleccionados.
- `placeholder` (string, Opcional): Semántica pasiva.
- `label` / `helperText` / `error` (string, Opcional): Bloques descriptivo-visuales.
- `searchable`, `multiple`, `disabled`, `clearable`, `fullWidth` (boolean, Opcional): Banderas lógicas operacionales de customización.

## 📦 Estado y Datos
**Ref-Tethers & Search Queries:**
- Maneja un `useState` para el filtro de opciones rápidas `searchQuery` derivando un render filtrado dinámico `filteredOptions`.

## 🔄 Flujos de Interacción
1. **Atentados Fuera de Foco:** Con el poder del Hook Nativo `useEffect` rastreando el objeto document body, se cerciora de atrapar los eventos mouse down fuera del dropdown mediante el `containerRef` para liquidar cualquier dropdown volátil colgando sin permiso.

## 💡 Ejemplo de Uso
```tsx
import { Select } from '../../components/ui/Select';

<Select 
   options={[{label: 'Pública', value: '1'}, {label: 'Secreta', value: '2'}]}
   value={currentValue}
   onChange={handleSelection}
   searchable
/>
```
