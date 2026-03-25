---
id: "policies-view"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/fluxcore/views/PoliciesView.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Consumidor API `/assistants` (Control C-Level Timing/Tone)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Administrador de Permisologías y Temperamentos IA" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Superposición Proxy en TimingConfig vs ModelConfig, Raw JSON Expander" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🧠 PoliciesView (Canon v8.3)

## 🎯 Propósito
(La Habitación de Control Sensitiva). Provee al creador un slider y configurador macro de la "Personalidad de Comportamiento del Engine". Determina cuándo una IA contesta (`Auto`, `Sugerencias Supervisadas` o `Apagado`), su temperamento lingüístico global y métricas tan específicas como la obligatoriedad artificial de meter "Timeouts (delays)" antes de contestar simulando dáctilo-humanidad. 

## 📦 Estado y Datos
**Fusión Dimensional (Drafting state):**
- Realiza una trampa elaborada en su memoria: Extrae `tone` y `language` (que por arquitectura a veces se guardan ocultos en `modelConfig`) y los clona a la fuerza unificándolos visualmente de manera temporal dentro del objeto de react `timingDraft`. Cuando decides presionar Guardar, realiza la cirugía destructiva (`delete updatedTimingConfig.tone`) y los avienta inyectándolos limpios de regreso a su objeto de DB original (`modelConfig`). 

## 🔄 Flujos de Interacción
1. **Inspector Forense de Trama (JSON Contexts):** Habilitó botones inferiores para dev-debugging llamados "Ver JSON raw", disparando llamados extra puros `fetch(/api/ai/policy-context)` exponiendo en crudo los objetos literales que el WSS Engine traga internamente.
2. **Fader Simbiótico UI:** Emplea interpolaciones de delay en rangos inyectando Sliders HTML nativos `type="range"` para no cargar librerías ajenas. Modificando iterativamente sin delays.

## 💡 Ejemplo de Uso
```tsx
import { PoliciesView } from '../../components/fluxcore/views/PoliciesView';

/* Usually inside the Settings Panel */
<PoliciesView accountId={selectedAccountId} />
```
