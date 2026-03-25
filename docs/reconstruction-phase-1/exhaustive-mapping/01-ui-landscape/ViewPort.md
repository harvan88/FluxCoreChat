---
id: "view-port"
type: "smart-component"
status: "stable"
criticality: "critical"
location: "apps/web/src/components/layout/ViewPort.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Absorbe el PanelStore entero y renderiza Flex-boxes divisibles infinitos" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Pared Maestra de Renderizado Split-Panels Multipestañas" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Asesino Cross-Account, Race conditions debouncer, DynamicContainer Forger" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🧠 ViewPort (TOTEM #11)

## 🎯 Propósito
Esquina sagrada y de alta sensibilidad. El `ViewPort` conforma estructuralmente el 90% visual de la aplicación: Alberga ese "océano gris" donde las sub-pantallas de la APP flotan y se dividen (Split Views como Visual Studio Code) en pestañas inmersivas. Él llama iterativamente los envoltorios (`DynamicContainer`) pasándoles su ancho métrico inyectado o abriendo un `WelcomeView` base si el océano está vacío.

## 📦 Estado y Datos
**Race Condition Busters:**
- Cuenta con armaduras locales Anti-Loops Reactivos. Al detectar variables UI Globales activarse (como un Trigger a "ABRIR UN CHAT NUEVO"), ancla `processingRef.current` para bloquear temporalmente que el motor levante Múltiples Solapas Iguales si los hooks se engatillan muy rápido, destruyendose este cerrojo artificial en `setTimeout 100ms`.

## 🔄 Flujos de Interacción
1. **Cross-Account Killer (Efecto Purga Escenográfica):** Ejecuta una sentencia vital. Si el usuario escoge la identidad "WORK_ACC_1" arriba y tenía tabs abiertos de la cuenta "PERSONAL", el Viewport purga brutalmente y ejecuta `closeTab()` en cascada sobre todas las pestañas huérfanas que delaten una procedencia ilegítima para evitar fugas y entrecruzado asincrónico.
2. **Motor Multi-Columna (Matriz):** Rige el estado madre `splitDirection` mutando iterativamente su caja Flex desde 'row' a 'col' redibujando en tiempo puro cómo se estiran los hijos (`flex: container.position.width ... : '1 1 0%'`) permitiendo los arrastres del mouse que expandirían el software.

## 💡 Ejemplo de Uso
```tsx
import { ViewPort } from '../../components/layout/ViewPort';

/* Injected straight in the Main layout, handling the main big screen chunk */
<ViewPort />
```
