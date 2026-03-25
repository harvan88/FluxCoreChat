---
id: "error-state"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/core/components/ErrorState.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "UI Pura" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Fallback estético central Catastrófico de Error Boundaries o Fetchs Rotos" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Display Boxed Break-Words para tracebacks inmanejables" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 ErrorState

## 🎯 Propósito
(Complemento hermanado de EmptyState). Este es el Cajón Oficial Estético del Sistema para arrojar resultados calamitosos en la Cara Frontal del Cliente. Reemplaza las fallas ciegas vacías o las páginas blancas infinitas con Interacciones de recuperación elegantes y controladas. Habitualmente inyectado como barrera reactiva dentro de `try-catch` visuales de Componentes Padre de Alta Complejidad.
## 🧰 Props
- `title` (string, Opcional): Encabezado superior. Por defecto: "Error".
- `message` (string, Requerido): La explicación detallada o el volcado de la traza para el usuario.
- `onRetry` (function, Opcional): Evento atado al botón que habilita la reintensión de flujo.
- `retryLabel` (string, Opcional): Etiqueta textual del botón cíclico.
- `icon` (ReactNode, Opcional): Reemplazo visual a Iconografía default (AlertCircle).
- `className` (string, Opcional): Margen y Flexbox tailwind superior inyectado libre.

## 📦 Estado y Datos
**No Reactividad Interna:**
- Contiene variables obligatorias como Strings (`message`, `title`).
- Propagadores opcionales paramétricos: `retryLabel`, Función `onRetry` de salvación y Nodo `icon` para permutar del oficial AlertCircle.

## 🔄 Flujos de Interacción
1. **Rediseño Centrado e Interior Seguro (Boxed Container):** Contrario al `EmptyState` que es una niebla en el canvas. Este componente dibuja sus escombros rodeados de una tarjeta de alerta física rígida con su margen de fondo opaco (`max-w-md w-full bg-elevated border-subtle`), dándole extrema formalidad de Caja Negra a su advertencia indicando un cese sistémico abrupto de la máquina aledaña, no su final del lienzo.
2. **Salvavidas Tipográfico (`break-words`):** Las peticiones fallidas (Ej HTTP 500) habitualmente emiten Strings deformes sin espacios originando escapes de CSS en la pantalla masivos si no se protegen. Incluye barreras de quiebre CSS forzando roturas semánticas sobre URLs perdidas o Traces JSON que intenten desestabilizar el cajón envolvente de Error.
3. **Flota Salvavidas Táctica (Retry):** Si es inyectado desde propensión, pinta abajo simétricamente un botón nativo `<button>Reintentar</button>` vinculándolo herméticamente a la llamada cíclica recursiva del Padre que debe regenerar los puentes (`onRetry`).

## 💡 Ejemplo de Uso
```tsx
import { ErrorState } from '../../core/components/ErrorState';

if (chatLoadError) {
   return (
      <ErrorState 
         title="Colapso de Sincronía"
         message={chatLoadError.message}
         retryLabel="Probar reconexión Socket"
         onRetry={() => performManualSync()}
      />
   );
}
```
