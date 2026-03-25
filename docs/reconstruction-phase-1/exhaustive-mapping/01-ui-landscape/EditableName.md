---
id: "editable-name"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/fluxcore/detail/EditableName.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "No invoca a la red, retransmite a sus padres" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Mecanismo Unificado Core de Títulos In-Place" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Intercepta Teclados y Focus" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 EditableName

## 🎯 Propósito
Es el componente Micro-Interactivo oficial que permite que cualquier "Título Principal" dentro de FluxCore sea modificado por el usuario in-place (Edit-in-place), sin recurrir a Formularios ajenos o Modales de edición complejos. Usado frecuentemente por Headers Universales o paneles de renombrado de entidades y herramientas IA.
## 🧰 Props
- `value` (string, Requerido): Valor de la cadena actual a mostrar en el input.
- `onChange` (function, Requerido): Callback invocado con cada alteración (teclazo) del input.
- `onSave` (function, Requerido): Callback final al completar la edición (vía Enter o Blur).
- `placeholder` (string, Opcional): Texto guía cuando el input está vacío.
- `disabled` (boolean, Opcional): Bandera para bloquear la edición de manera ruda.

## 📦 Estado y Datos
**Proxy y Mutador de UI:**
- Instancia y retiene un apuntador de Puntero Directo `useRef<HTMLInputElement>` para invadir comportamientos Focus del Browser a demanda.
- Separa el Flujo Constante (`onChange`) del Flujo Finalizado (`onSave`). 

## 🔄 Flujos de Interacción
1. **Focus Cinemático Forzado:** Contiene un botón diminuto con Lápiz (Pencil Lucide). Cuando un usuario que prefiere clicks opera sobre este en lugar de directamente en el texto, el componente ejecuta `inputRef.current?.focus()`, induciendo el caret parpadeante en el recuadro adjunto.
2. **Atrapador de Teclado (Key Down):** Instala un sensor (`handleKeyDown`) escuchando rígidamente la tecla `Enter`. Cuando es detectada corta abruptamente el ciclo forzando el desenfoque artificial del elemento principal (`e.currentTarget.blur()`).
3. **Trigger de Guardado Post-Focus:** El evento destructivo real (Ese que llamará al Server) jamás ocurre tecleando letra tras letra, sino derivándose con estricta confianza al `onBlur`. Es aquí donde acopla un sanitizador para extraer ruidos finales (`value.trim()`) delegando a padre la salvada final de base de datos.

## 💡 Ejemplo de Uso
```tsx
import { EditableName } from '../../components/fluxcore/detail/EditableName';

<EditableName 
   value={databaseTitle}
   onChange={(val) => setDatabaseTitle(val)}
   onSave={(sanitizedVal) => callAPIUpdate(sanitizedVal)}
   placeholder="Mi Tienda Local"
/>
```
