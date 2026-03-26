---
id: "capability-openai-compat"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/capability-openai-compat.service.ts"
---

# 🤖 capability-openai-compat

## 🎯 Propósito
Actúa como la capa de traducción y ejecución para que las capacidades de FluxCore sean compatibles con la API de Assistants de OpenAI. Se encarga de formatear los esquemas de herramientas y de parsear las salidas de ejecución al formato que OpenAI espera (`tool_outputs`).

## 🏗️ Arquitectura
El servicio adapta las capacidades canónicas (como `send_template`) para soportar variaciones legacy o específicas de OpenAI (ej: el mapeo de `templateId` a `template_id`). Delega la ejecución real al `CapabilityExecutionService`.

Garantiza que, aunque OpenAI "crea" que está ejecutando una herramienta, la lógica sea gobernada por la plataforma FluxCore, devolviendo una `ExecutionAction` cuando es necesario mediar efectos.

## 🧱 Dependencias
- **Depende de:** `capability-translation.service.ts`, `capability-execution.service.ts`, `capability-argument-normalizer.service.ts`.
- **Es usado por:** `openai-sync.service.ts`, `capability-openai-offer.service.ts`.

## 💡 Ejemplo de Uso
```typescript
import { capabilityOpenAICompatService } from './services/capability-openai-compat.service';

const tools = capabilityOpenAICompatService.listTools();
// Envía 'tools' a OpenAI Assistants
```
