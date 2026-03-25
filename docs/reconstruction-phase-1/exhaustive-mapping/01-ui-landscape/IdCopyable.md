---
id: "id-copyable"
type: "smart-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/fluxcore/detail/IdCopyable.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Hereda hook de portapapeles useClipboard" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Píldora tipográfica encriptada con copiado rápido" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Mutación icónica de Feedback al interactuar" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 IdCopyable

## 🎯 Propósito
Componente atómico en la familia de ayudas de UI. Facilita la extracción de identidades largas (UUIDs y Hash de BD) ofreciendo un texto compacto con un icono que otorga feedback inmediato al clic. Extremadamente útil en paneles de detalle donde el usuario necesita capturar la clave primaria del recurso sin seleccionarla engorrosamente.
## 🧰 Props
- `id` (string, Requerido): La cadena original y real que el portapapeles atrapará.
- `prefix` (string, Opcional): Antecesor tipográfico meramente ilustrativo (ej: "Id: "). 
- `className` (string, Opcional): Extensión de márgenes tailwind inyectables.

## 📦 Estado y Datos
**Acople Limpio Interno:**
- Utiliza la abstracción `useClipboard` absorbiendo la función `copy()` y la bandera temporal `isCopied`.

## 🔄 Flujos de Interacción
1. **Animación de Adquisición:** Posee clases dependientes del cursor (`group-hover`). Si el usuario posa el ratón, disipa el ícono de las sábanas (Copy); si clica, lo reemplaza por un Check verde intenso (`opacity-100 text-accent`) forzando a la retina humana a confirmar el guardado en Ram sin emitir pesados Toast Alerts globales.

## 💡 Ejemplo de Uso
```tsx
import { IdCopyable } from '../../components/fluxcore/detail/IdCopyable';

<h2>Mi Asistente Llama <IdCopyable id={bot.id} prefix="UUID:" /></h2>
```
