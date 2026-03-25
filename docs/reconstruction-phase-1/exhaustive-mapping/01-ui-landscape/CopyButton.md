---
id: "copy-button"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/ui/CopyButton.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Integración segura DOM Clipboard API" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Utilidad Crossover Atómica" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestión defensiva asíncrona Fail Fast" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 CopyButton

## 🎯 Propósito
Es el Botón Único Universal de Portapapeles (Copy to Clipboard) del Sistema UI de FluxCore (Canonical Component). No sabe qué está siendo copiado. Ofrece en su envoltorio todas las garantías estrictas visuales deseadas: Iconografía Lucide (Cambio entre Copy, Check Verde Confirmación o Triángulo Peligro), Retención por temporizador artificial, y escudos masivos previendo que el ambiente del Navegador restrinja por seguridad los iFrames sin permisos SSL.

## 📦 Estado y Datos
**Acople Subyacente (El Hook):**
- Lanza y envuelve la lógica cruda matemática consumiendo el Hook `useClipboard` de utilería Core. Absorbe `copy`, `isCopied`, `isError`.

## 🔄 Flujos de Interacción
1. **Barrera de Validaciones (Principio Fail-Fast):** A diferencia de clones previos, este elemento intercepta la prop `text` forzando validación nativa (`typeof text !== 'string'`). Si un programador despistado intenta encajarle Datos JSON o Null Crudos, emite una advertencia de consola, destruye el render regular y muestra obligatoriamente un triángulo rojo deshabilitado visual indicando error de tipo a la base del programador.
2. **Motor Visual Dictatorial (`getVisualState`):** Un conmutador de flujos CSS condicionales retorna el Diccionario de Estilos Tailwind (`className`, `icon`, `title` accessibility tags) priorizando los eventos catastróficos. IsError gana isCopied, IsCopied gana Idle. Reemplaza limpiamente SVG Iconos (Copy -> Check).
3. **Exposición Abierta a Telemetría (Logging):** Opcionalmente, permite acoplar Callbacks perimetrales (`onError`, `onSuccess`) para que los paneles dueños puedan enviar un ping de Análisis Posthog si la operación es completada correctamente o el usuario tiene su browser reestringido. Y soporta Modo `debug` emitiendo ruido Console.log profuso.

## 💡 Ejemplo de Uso
```tsx
import { CopyButton } from '../../components/ui/CopyButton';

// Copia Simple
<CopyButton text={user.uuid} />

// Copia Condicional Validada
<CopyButton 
   text={tokenSession || ""}
   disabled={!tokenSession}
   size="lg"
   onError={(e) => sendCrashToSentry(e)}
/>
```
