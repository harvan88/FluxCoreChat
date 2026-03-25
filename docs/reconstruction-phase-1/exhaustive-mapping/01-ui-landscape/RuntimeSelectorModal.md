---
id: "runtime-selector-modal"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/fluxcore/assistants/RuntimeSelectorModal.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Acoplamiento modal de un solo nivel (onSelect/onClose)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Selector Monolítico de Paradigma IA" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Fixed z-50 Backdrop, Click-Propagation detents" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 RuntimeSelectorModal

## 🎯 Propósito
Menú modal (Pop-up en pantalla completa oscurecida) empleado al momento cero de crear un nuevo "Agente". Fuerza al usuario a contestar la pregunta arquitectónica más importante del sistema FluxCore: ¿Será este perfil procesado internamente por el clúster (`local`) o será un gemelo sincronizado hacia el API de OpenAI (`openai`)? 
## 🧰 Props
- `onSelect` (function, Requerido): Despacha la decisión tomada, devolviendo el literal genérico `'local'` o `'openai'`.
- `onClose` (function, Requerido): Invoca el destructor o la ocultación global del estado Modal.

## 📦 Estado y Datos
100% Presentacional / Dumb. Carece enteramente de estado.

## 🔄 Flujos de Interacción
1. **Bloqueo Propagacional:** El fondo oscurecido atrapa `onClick={onClose}` para cerrar rápido picando afuera, pero la caja principal del menú se defiende mediante `onClick={(e) => e.stopPropagation()}` asegurando que no se cierre si fallaste clickeando los botones pero sí le diste a la caja del centro.

## 💡 Ejemplo de Uso
```tsx
{showRuntimeSelector && (
    <RuntimeSelectorModal
        onSelect={(res) => dispatchCreateBotWorkflow(res)}
        onClose={() => toggleSelector(false)}
    />
)}
```
