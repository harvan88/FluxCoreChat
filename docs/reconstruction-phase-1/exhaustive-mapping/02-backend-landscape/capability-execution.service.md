---
id: "capability-execution.service"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/capability-execution.service.ts"
---

# 🤖 capability-execution.service

## 🎯 Propósito
Centraliza la lógica de ejecución de todas las capacidades propulsadas por la plataforma FluxCore. Asegura que la implementación de `search_knowledge`, `send_template` y otras herramientas sea determinista y se mantenga fuera de la caja de los runtimes específicos.

## 🏗️ Arquitectura
Utiliza un patrón de "Dependency Injection" (`CapabilityExecutionDeps`) para recibir los servicios del núcleo necesarios (retrieval, templates) y expone un método unificado `executeTool`.

Diferencia funcional:
- **Queries (`search_knowledge`):** Ejecuta la acción inmediatamente y devuelve los datos resultantes a la IA en el turno actual.
- **Commands (`send_template`):** Valida la autorización y devuelve una `ExecutionAction` que será ejecutada posteriormente por el `ActionExecutor` para mediar efectos secundarios.

## 🧱 Dependencias
- **Depende de:** `fluxcore-types.ts`.
- **Es usado por:** `capability-openai-compat.service.ts`, `capability-local-runtime-tools.service.ts`.

## 💡 Ejemplo de Uso
```typescript
const service = createCapabilityExecutionService(createCapabilityDeps());
const result = await service.executeTool('search_knowledge', { query: 'precios' }, context);

if (result.outcome === 'success') {
  // result.data contiene el contexto RAG
}
```
