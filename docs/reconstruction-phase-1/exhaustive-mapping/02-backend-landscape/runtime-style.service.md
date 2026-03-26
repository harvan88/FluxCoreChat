---
id: "runtime-style.service"
type: "core"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/fluxcore/runtime-style.service.ts"
---

# 🤖 runtime-style.service

## 🎯 Propósito
Centraliza la lógica de resolución del estilo de respuesta de la IA (tono, idioma, uso de emojis). Este servicio asegura que, independientemente del runtime (Local u OpenAI), la personalidad del asistente se resuelva de forma coherente basándose en la configuración persistida (`RuntimeConfig`).

## 🏗️ Arquitectura
Es un servicio funcional puro que toma la configuración del runtime y devuelve un objeto de estilo resuelto (`ResolvedRuntimeStyle`) con valores por defecto (es, neutral, no-emojis) si no están definidos.

## 🧱 Dependencias
- **Depende de:** `@fluxcore/db` (RuntimeConfig types).
- **Es usado por:** `asistentes-openai.runtime.ts`, `prompt-builder.service.ts`.

## 💡 Ejemplo de Uso
```typescript
import { runtimeStyleService } from './services/fluxcore/runtime-style.service';

const style = runtimeStyleService.resolve(config);
// style: { tone: 'neutral', language: 'es', useEmojis: false }
```
