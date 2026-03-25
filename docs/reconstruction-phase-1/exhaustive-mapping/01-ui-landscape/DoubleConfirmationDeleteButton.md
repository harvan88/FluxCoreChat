---
id: "double-confirmation-delete-button"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/ui/DoubleConfirmationDeleteButton.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Delegador de Callbacks PURO" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Botón de Destrucción de Entidades Protegido" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Efectos Parallax y Animaciones Inline Scale usando CLSX" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 DoubleConfirmationDeleteButton

## 🎯 Propósito
Aborda proactivamente la fatiga mental de lidiar con modales de advertencia masivos mediante una solución de interacción inline (en sitio). Evita borrados furtivos al exigir una validación manual en cadena de Dos Pasos: El primer Click revela un Check verde de Confirmación lateral, y el Segundo Click en ese Check despacha finalmente la orden destructiva. Útil para incrustar eliminadores compactos dentro de Filas de Tablas densas o Tarjetas agrupadas.
## 🧰 Props
- `onConfirm` (function, Requerido): Ejecutor principal que lanza la acción tras la segunda iteración.
- `className` (string, Opcional): Para alineación CSS o Flexbox extra.
- `size` (number, Opcional): Tamaño uniforme en píxeles para lucide-react.
- `disabled` (boolean, Opcional): Disyuntiva para inhabilitar el botón si no está autorizado.

## 📦 Estado y Datos
**Mecánicas Atómicas:**
- `isConfirming`: Control booleano marcando si la UI ha escalado.
- `containerRef`: Instancia al div general.

## 🔄 Flujos de Interacción
1. **Reseteos de Preservación de Vida (Click-Outside):** Genera un esqueleto pasivo uniendo al root `document.addEventListener('mousedown')` tan pronto como entramos al estado de confirmación. Si el usuario, aterrado por el daño que iba a hacer, presiona las afueras de los colindes DOM referenciados por la macro caja; se invierte la aserción y se aborta el estado. (Limpiando en el Unmount o desmontaje del effect).
2. **Propagación Absoluta (`e.stopPropagation()`):** En TODO click interno evita la ebullición del DOM. Si un desarrollador lo incrustó cruzado sobre una fila que al darle clic despliega al usuario, esta función protectora impide que abrir el Usuario y preseleccionar Borrar al Usuario ocurran simultáneamente.
3. **Fluidez Cinética y Posicionamiento:** El contenedor altera matemáticamente su ancho transitorio inline `width` (32px a 72px) para acomodar la expansión dinámica, mientras usa modificadores de Tailwind para desvanecer e invocar los íconos intercalados en CSS transitions (`scale-100 opacity-100`).

## 💡 Ejemplo de Uso
```tsx
import { DoubleConfirmationDeleteButton } from '../../components/ui/DoubleConfirmationDeleteButton';

<div className="flex actions">
   <DoubleConfirmationDeleteButton 
      size={18} 
      onConfirm={() => callAPIProvider('DELETE_ACCOUNT')} 
   />
</div>
```
