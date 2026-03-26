---
id: "capability-deps-factory"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/capability-deps-factory.service.ts"
---

# 🤖 capability-deps-factory

## 🎯 Propósito
Provee el adaptador concreto que conecta los contratos abstractos de ejecución de capacidades con los servicios reales del núcleo de FluxCore (`retrievalService` y `aiTemplateService`). Es el punto de inyección de dependencias para el sistema de capabilities.

## 🏗️ Arquitectura
Implementa la interfaz `CapabilityExecutionDeps`. Centraliza:
- La resolución de `vectorStoreIds` para consultas de conocimiento.
- El mapeo de plantillas autorizadas a formatos de lista.
- El puente de ejecución para el envío directo de plantillas cuando es requerido fuera de comandos mediados.

## 🧱 Dependencias
- **Depende de:** `retrieval.service.ts`, `ai-template.service.ts`, `capability-execution.service.ts`.
- **Es usado por:** `capability-openai-compat.service.ts`, `capability-local-runtime-tools.service.ts`.

## 💡 Ejemplo de Uso
```typescript
import { createCapabilityDeps } from './services/capability-deps-factory.service';

const deps = createCapabilityDeps({ enableTemplateSend: true });
const service = createCapabilityExecutionService(deps);
```
