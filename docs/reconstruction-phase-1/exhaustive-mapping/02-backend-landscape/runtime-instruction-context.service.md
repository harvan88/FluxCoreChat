---
id: "runtime-instruction-context.service"
type: "core"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/fluxcore/runtime-instruction-context.service.ts"
---

# 🤖 runtime-instruction-context.service

## 🎯 Propósito
Este servicio es el responsable de textualizar los fragmentos de contexto que formarán el prompt del asistente. Transforma los datos estructurados (reglas de contacto, políticas de tono, instrucciones del asistente) en bloques de texto natural coherentes que el LLM puede procesar como directivas de atención.

## 🏗️ Arquitectura
El servicio proporciona métodos para construir secciones específicas del prompt:
- **`buildAuthorizedInstructionsSection`**: Formatea las instrucciones base del asistente.
- **`buildAttentionSection`**: Construye el bloque de "Directivas de Atención" que incluye el tono resuelto, el idioma, el uso de emojis y las reglas/preferencias específicas del contacto (Soberanía de Contexto).

## 🧱 Dependencias
- **Depende de:** `runtime-style.service.ts`.
- **Es usado por:** `asistentes-openai.runtime.ts`, `prompt-builder.service.ts`.

## 💡 Ejemplo de Uso
```typescript
import { runtimeInstructionContextService } from './services/fluxcore/runtime-instruction-context.service';

const attentionSection = runtimeInstructionContextService.buildAttentionSection({
  contactRules: policyContext.contactRules,
  title: 'Directivas de Atención',
  // ... prefixes
});
```
