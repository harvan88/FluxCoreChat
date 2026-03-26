---
id: "capability-openai-offer"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/capability-openai-offer.service.ts"
---

# 🤖 capability-openai-offer

## 🎯 Propósito
Es el servicio de oferta específico para el runtime de OpenAI. Filtra y selecciona las herramientas que se enviarán a través de la API de Assistants de OpenAI basándose en el estado de autorización del asistente.

## 🏗️ Arquitectura
Recibe un contexto de oferta (`OpenAILegacyOfferContext`) que indica si el asistente tiene habilitada la base de conocimiento o el envío de plantillas. Delegar la obtención de esquemas compatibles al `capabilityOpenAICompatService` y `capabilityTranslationService`.

## 🧱 Dependencias
- **Depende de:** `capability-openai-compat.service.ts`, `capability-translation.service.ts`.
- **Es usado por:** `asistentes-openai.runtime.ts`.

## 💡 Ejemplo de Uso
```typescript
import { capabilityOpenAIOfferService } from './services/capability-openai-offer.service';

const tools = capabilityOpenAIOfferService.listToolsForLegacyOffer({
  hasKnowledgeBase: true,
  hasTemplatesTool: true
});
```
