---
id: "capability-argument-normalizer"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/capability-argument-normalizer.service.ts"
---

# 🤖 capability-argument-normalizer

## 🎯 Propósito
Este servicio se encarga de parsear y normalizar los argumentos que la IA envía en sus llamadas a herramientas. Su objetivo es convertir los datos crudos (muchas veces en string JSON) en objetos limpios y tipados que cumplen con los contratos de la plataforma FluxCore.

## 🏗️ Arquitectura
El servicio implementa una lógica defensiva que maneja:
- Formatos JSON de argumentos en string.
- Diferencias de nomenclatura entre runtimes (ej: traduce `template_id` a `templateId` para OpenAI).
- Implementación de fallbacks (ej: usa el `fallbackQuery` si el argumento `query` de RAG viene vacío).

## 🧱 Dependencias
- **Depende de:** Ninguna.
- **Es usado por:** `capability-openai-compat.service.ts`, `capability-local-runtime-tools.service.ts`.

## 💡 Ejemplo de Uso
```typescript
import { capabilityArgumentNormalizerService } from './services/capability-argument-normalizer.service';

const cleanArgs = capabilityArgumentNormalizerService.parseToolArguments('send_template', '{"template_id": "welcome_01"}');
// Devuelve: { templateId: "welcome_01", variables: undefined }
```
