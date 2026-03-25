---
id: "fluxcore-template-config"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/fluxcore/templates/FluxCoreTemplateConfig.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Componente Reactivo Puro" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Configurador Delegador IA para Plantillas" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Colección de Switchs y Textareas Colapsables" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 FluxCoreTemplateConfig

## 🎯 Propósito
Desempeña el rol de Panel Acordeón Secundario inyectado dentro del Editor de Plantillas/Respuestas Rápidas, especializado meramente en delegar el uso autómata de la misma a la Inteligencia Artificial. Facilita la toma de decisión (Toggle) y la agregación del prompt contextual ("Usa esta plantilla solo para saludar") que el motor evaluará.
## 🧰 Props
- `authorizeForAI` (boolean, Requerido): Define si la cabecera está activa o inactiva a nivel global para IA.
- `onAuthorizeChange` (function, Requerido): Altera la autorización principal.
- `allowAutomatedUse` (boolean, Requerido): Sub-interruptor de delegación de envíos.
- `onAllowAutomatedUseChange` (function, Requerido): Mutador para el sub-interruptor.
- `aiUsageInstructions` (string, Requerido): Texto libre alojado en el Textarea.
- `onInstructionsChange` (function, Requerido): Altera las instrucciones del Prompt inyectado en la Plantilla.

## 📦 Estado y Datos
**Mutabilidad Ascendente (Elevación Ciega):**
- Totalmente Desconectado. Sus tres ejes de poder (`authorized`, `allowedAutomated`, `instructions`) son forzados desde Cánopys superiores e inyectados por cascadas Event-Driven (`onChange`).

## 🔄 Flujos de Interacción
1. **Sección Plegable Defensiva (`CollapsibleSection`):** Emigra su cuerpo gráfico a una abstracción colapsable visual protegiendo Pantallas de Edición de saturaciones; indicándole a su padre si el menú ha sidohablitado (Mostrando candados verdes) con su prop `isCustomized`.

## 💡 Ejemplo de Uso
```tsx
import { FluxCoreTemplateConfig } from '../../components/fluxcore/templates/FluxCoreTemplateConfig';

<FluxCoreTemplateConfig 
  authorizeForAI={temp.aiEnabled}
  onAuthorizeChange={(val) => mut(temp, 'aiEnabled', val)}
  allowAutomatedUse={temp.autoDispatch}
  onAllowAutomatedUseChange={(val) => mut(temp, 'autoDispatch', val)}
  aiUsageInstructions={temp.aiInstructions}
  onInstructionsChange={(v) => mut(temp, 'aiInstructions', v)}
/>
```
