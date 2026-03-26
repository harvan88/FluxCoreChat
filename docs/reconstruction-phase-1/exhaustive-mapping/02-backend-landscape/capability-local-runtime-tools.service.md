---
id: "capability-local-runtime-tools"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/capability-local-runtime-tools.service.ts"
---

# 🤖 capability-local-runtime-tools

## 🎯 Propósito
Es el adaptador de herramientas para el runtime local de asistentes. Provee la lógica para listar herramientas autorizadas y ejecutar las llamadas a funciones generadas por el modelo de IA local, asegurando paridad funcional con el runtime de OpenAI.

## 🏗️ Arquitectura
A diferencia del runtime de OpenAI (que es asíncrono y basado en polling), este servicio gestiona la ejecución inmediata o la generación de acciones declarativas para el runtime local. 

Maneja dos modos de respuesta:
1. **Inyección de Contexto:** Para `search_knowledge`, devuelve el texto del RAG directamente al prompt.
2. **Acciones de Plantilla:** Para `send_template`, genera un objeto `templateAction` que el runtime local traduce a una `ExecutionAction` para el `ActionExecutor`.

## 🧱 Dependencias
- **Depende de:** `capability-offer.service.ts`, `capability-execution.service.ts`, `capability-argument-normalizer.service.ts`.
- **Es usado por:** `asistentes-local.runtime.ts`.

## 💡 Ejemplo de Uso
```typescript
import { capabilityLocalRuntimeToolsService } from './services/capability-local-runtime-tools.service';

const result = await capabilityLocalRuntimeToolsService.executeTool({
  toolCall,
  executionContext,
  deps,
  runtimeConfig,
  authorizedContext
});

if (result.templateAction) {
  // Generar ExecutionAction para ActionExecutor
}
```
