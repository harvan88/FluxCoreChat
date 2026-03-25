---
id: "file-uploader"
type: "ui-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/chat/FileUploader.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Control Ciego Total, usa children (Render Props)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Invader Envolvente Nativo de Inputs tipo Archivo" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Invocaciones Forzadas useRef sobre Tags Input Ocultos" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 FileUploader

## 🎯 Propósito
Es el componente arquitectónico de encubrimiento esencial para sortear la horrenda interfaz de usuario que traen los elementos `<input type="file">` nativos del Navegador Web. Es invisible, sin diseño propio, funcionando enteramente como un Patrón Funcional (Render Props) inyectando poder asíncrono sobre CUALQUIER diseño que otro desarrollador coloque dentro suyo, otorgándoles a estos "hijos ciegos" un método funcional para invocar selectores OS de archivos a voluntad.

## 📦 Estado y Datos
**Acoples Nativos Mutantes:**
- Mantiene referencia directa mutable DOM `useRef<HTMLInputElement>` apoderándose de un Nodo Inexistente temporal instanciado con `className="hidden"`.
- Interceptores Base: `accept` (Extensiones), `capture` (Móvil force cámara) y Booleano `disabled`.

## 🔄 Flujos de Interacción
1. **Encantamiento Arquitectónico y Cesión Vital (Render Props):** El bloque `<> {props.children({ open })}  </>` dicta magia pura de React. El componente obliga a su padre a declararse como una Función. Inyectándole de regalo hacia arriba un callback artificial (`open`).
2. **Gatillo Desencadenante Indirecto (`open = () =>`):** Cuando el niño externo diseña su Botón Bonito Redondeado, le adjunta su nuevo superpoder clickeable apuntando al CallBack Regalado. Cuando se presiona, y si sortea el candado `disabled`, acciona por orden forzosa `.click()` en el elemento fantasma HTML forzando a Windows/Mac a interrumpir con el selector.
3. **Extracción y Sanitización de Bloques Memorales:** Una vez seleccionado (`onChange`), chupa el `files?.[0]`, si no es indefinido levanta el payload al Callback `onFile`. Brutalmente seguido, ejecuta `e.target.value = ''` borrando el fantasma de la memoria, garantizando que el usuario puede elegir "La misma maldita foto dos veces" si quisiera sin atascarse por validación de cambios browser.

## 💡 Ejemplo de Uso
```tsx
import { FileUploader } from '../../components/chat/FileUploader';

<FileUploader 
   accept="application/pdf" 
   onFile={(f) => alert(`Enviando ${f.name}`)}
>
  {(api) => (
      {/* Botón Hermoso UI que no sabe que es un Input Real */}
      <button onClick={api.open} className="mi-btn-hermoso">
          Subir Recibo PDF
      </button>
  )}
</FileUploader>
```
