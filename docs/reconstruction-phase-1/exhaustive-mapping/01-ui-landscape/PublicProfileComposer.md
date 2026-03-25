---
id: "public-profile-composer"
type: "ui-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/public-profile/components/blocks/PublicProfileComposer.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Suelo inyectado dentro de perfiles visitantes" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Entrada de Composición Anónima de Texto" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Intercepción Nativa de Enter Key, Evidencia Visual Animada" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⌨️ PublicProfileComposer

## 🎯 Propósito
Cajetín simple para componer strings de texto orientado a usuarios que visitan perfiles públicos (los visitantes anónimos / the external users). A diferencia del Composer privado multi-archivo, este es restrictivo: Solo Texto Plano. Sin capacidad nativa insertada para arrastrar archivos multimedia, pdfs o grabar audio. 
## 🧰 Props
- `value` (string, Requerido): La amalgama de texto crudo pre-envío.
- `onChange` (function, Requerido): Traspasa cada golpe de tecla hacia arriba.
- `onSend` (function, Requerido): Función ejecutora final que despacha la promesa.
- `disabled` (boolean, Requerido): Restituye la mutabilidad a 0 cuando caduca la sesión u ocurren fatalidades.
- `isSending` (boolean, Requerido): Gira el Icono de Envío indicando encolamiento local y desactiva dobles pulsaciones.
- `placeholder` (string, Opcional): Texto gris fantasma guía.

## 📦 Estado y Datos
Es de Naturaleza Puramente Tonta (Dumb Component). Pide el Value inyectado y devuelve llamadas a `onChange` y `onSend()`.

## 🔄 Flujos de Interacción
1. **Pointer Event Fix:** En dispositivos touch, `onPointerDown` se dispara en cascada y aveces pierde enfoque. Tiene `e.preventDefault();` sobre el Pointer para disparar el envio asíncrono sin de-focus el mobile virtual keyboard.
2. **Dopamina de UX Visual:** Añade clases `clsx("animate-bounce")` al ícono del botoncito (Lucide `MoveUp`) de "Enviar" solo cuando la canastilla tiene texto tecleado. Creando urgencia/satisfacción visual de "Ya puedes oprimirme".

## 💡 Ejemplo de Uso
```tsx
import { PublicProfileComposer } from './PublicProfileComposer';

<PublicProfileComposer
    value={strVal}
    onChange={setStrVal}
    onSend={someUpload}
    disabled={false}
    isSending={false}
/>
```
