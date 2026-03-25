---
id: "openai-assistant-editor"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/editors/OpenAIAssistantEditor.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Entidad renderizada puramente vía OpenTab en PanelStore" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "IDE ligero de Prompt Engineering" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Debounced Auto-Save (2s), Token estimation HUD" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 OpenAIAssistantEditor (IDE de Prompt)

## 🎯 Propósito
Esquina inmersiva para redactar System Prompts largos para Asistentes de OpenAI. Transforma una tarea tediosa de rellenado de formulario dentro en una experiencia de "Desarrollo de Software", incluyendo vistas separadas de Code Lines (numeración visual) y un HUD informativo inferior de estadísticas en vivo del cuerpo del prompt.

## 📦 Estado y Datos
**Temporizador Debouncer:**
- Posee un mecanismo de "Guardado fantasma". Mantiene una vigia bajo la variable `autoSaveTimerRef`. Cada vez que escribes una letra, mata el contador pasándolo por `clearTimeout` hasta que tus manos dejen de presionar teclas por 2000 milisegundos. Automágicamente enviando el Prompt al API limitando llamadas PUT.

## 🔄 Flujos de Interacción
1. **Estadística Predictiva de Tokens:** Usa un efecto `useMemo` calculando toscamente `(chars / 4)` para darle un sentido figurativo de cuánto le va costar comercialmente en tokens el prompt que está tipeando al creador del asistente.
2. **Selector Bi-Modal:** Puedes alternar `viewMode` entre 'code' (que renderiza un `<textarea>` con monospaced string) o 'preview' (pásandolo a un parrafo de visualización cruda inyectándolo en `<pre>`).

## 💡 Ejemplo de Uso
```tsx
import { OpenAIAssistantEditor } from '../../components/editors/OpenAIAssistantEditor';

// Rendered via Global Tabs Context system, indirectly.
```
