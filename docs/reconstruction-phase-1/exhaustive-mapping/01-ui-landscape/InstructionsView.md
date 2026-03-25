---
id: "instructions-view"
type: "smart-component"
status: "stable"
criticality: "custom"
location: "apps/web/src/components/fluxcore/views/InstructionsView.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Director Maestro Global que conjura useInstructions y useAutoSave" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Vista Padre de la Base de Prompts, Switch Master List/Edit" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Bucle Antiparadeo (Stable Local State) y Debouncers de Salvado Crítico" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 InstructionsView

## 🎯 Propósito
Es el Orquestador Absoluto y Padre arquitectural de toda la sección de "Instrucciones del Sistema". Determina activamente si el usuario mira la `InstructionList` (Tabla General) o si tiene la cámara en primera persona sobre `InstructionDetail` (Editor Complejo). Más allá de pintar la UI, es un monstruo de control de estado forjando el patrón "Stable Local State" para impedir de forma vital los parpadeos horrorosos en los `textarea` que ocurren cuando un React reacciona a un autoguardado de Backend saltando el cursor al lugar equivocado.

## 📦 Estado y Datos
**Estabulización Aguda Multihilo:**
- Acompaña estados locales (`localSelectedInstruction`) con Caches Reactivos Mutantes asíncronos (`currentInstructionRef.current`) para asegurar que el callback del Temporizador de guardado no ejecute clausuras oxidadas "Stale Closures" al pasar variables viejas.

## 🔄 Flujos de Interacción
1. **Danza del Guardado Silencioso (`useAutoSave`):** Detecta escrituras. Intercepta el tipeo clonando inmediatamente su string truncado (Maximizando el límite preventivo antispam backend) y disparando `autoSaveContent()`. Un motor Debouncer posterga la ráfaga al server; al impactar el server, intencionalmente esquiva actualizar el árbol visual reactivo (No hace refresh forzoso), asumiendo ganancia optimista de que lo local es idéntico a lo salvado para sostener los cursores estáticos parpadeantes del usuario intactos en la millonésima línea de código.
2. **Puente Ciego Abstracción Promptide (`promptPreviewState`):** Gobierna el estado dictador asincrónico para forzar aperturas modales de inspección. Manda el request HTTP, almacena el Payload, levanta la bandera `isOpen` y delega masivamente al componente hijo para que dibuje el Overlay.
3. **Múltiples Selectores (useEntitySelection):** Permite Deep Links. Si la página entra con el String Id en su Prop, fuerza la apertura automática bypassando la tabla y llamando el Detail con mutación atómica `setLocalSelectedInstruction()`.

## 💡 Ejemplo de Uso
```tsx
import { InstructionsView } from '../../components/fluxcore/views/InstructionsView';

<DynamicContainer>
   <InstructionsView accountId="12" instructionId={optionalPreLoadHash} />
</DynamicContainer>
```
