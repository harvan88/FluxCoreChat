---
id: "openai-assistant-config-view"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/views/OpenAIAssistantConfigView.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Conexión bidireccional a endpoints `/assistants` (OpenAI cloud variant)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor Visual Maestro de Asistentes Remotos" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Validador limites OAI (512 vs 256K chars), Ruteo de Vector Stores, Plugins vinculantes" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 OpenAIAssistantConfigView

## 🎯 Propósito
Interfaz especializada EXCLUSIVA para la familia de modelos gestionados de la plataforma de OpenAI (`backend='openai'`). Por diseño, aísla todos sus parámetros porque las configuraciones que tolera el "API de OpenAI Assistants v2" difieren salvajemente de un Local LLM (Llama3) o un simple Anthropic. Domina el CRUD de Tools conectadas y las bases RAG vectorizadas adyacentes a la memoria externa del modelo.

## 📦 Estado y Datos
**Guardia de Restricciones (API Limits):**
- Controla firmemente la entrada humana recortando `description.slice(0, 512)` y `instructions.slice(0, 256000)` para prevenir abortos por código `400 Bad Request` antes del Fetch al enviarle promts gigantes a OpenAI.

## 🔄 Flujos de Interacción
1. **Pestaña Expansiva Híbrida:** Dado que el `system prompt` de un AI rara vez cabe en una ventanita Input pequeña de la configuración, utiliza un hack `instructionsLocked`. Si oprimes expandir, engaña al Flex layout, levanta un `OpenAIAssistantEditor.md` en una PESTAÑA grande separada a través de `usePanelStore` y "Bloquea" el componente chiquito original protegiéndolo de que se pise la memoria reactiva.
2. **Mercado de Funciones:** Atrapa asíncronamente las colecciones de Herramientas permitiéndotelas adjuntar a nivel asistente para volverlo inteligente. Muta visualmente cuáles se incluyen pasando el ID del tool a un array local `selectedToolIds`.

## 💡 Ejemplo de Uso
```tsx
import { OpenAIAssistantConfigView } from '../../components/fluxcore/views/OpenAIAssistantConfigView';

<OpenAIAssistantConfigView assistantId={uuid} accountId={userAcc} />
```
