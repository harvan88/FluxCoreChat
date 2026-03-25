---
id: "fluxcore-runtime-routes"
type: "api-routes"
status: "stable"
criticality: "medium"
location: "apps/api/src/routes/fluxcore-runtime.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FluxCoreService, RetrievalService, AITemplateService, PromptBuilder, CoreEventBus" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API de Diagnóstico y Runtime Low-Level" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Prompt building preview, Ad-hoc RAG context extraction, Diagnostic Vector Store snapshots (chunk stats), Template discovery for tools, Manual event triggers for testing" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ FluxCore Runtime Routes

## 🎯 Propósito
Las `FluxCore Runtime Routes` proporcionan herramientas de introspección y ejecución manual para los componentes internos de la IA. No están diseñadas para el uso final del cliente, sino para que el sistema (vía Function Calling) y los desarrolladores puedan depurar el comportamiento del runtime de ejecución.

## 🚥 Diagnóstico de Conocimiento (RAG)
Incluye herramientas potentes para auditar el RAG:
-   **RAG Context**: Permite probar la recuperación semántica (`retrieval`) sobre un conjunto de stores sin pasar por el flujo de chat completo.
-   **Diagnostic Snapshot**: Devuelve el estado real de un Vector Store directamente desde la base de datos, incluyendo conteo de chunks, tokens totales e instrucciones de configuración efectivas.

## 🧬 Previsualización de Prompts
El endpoint `/prompt-preview/:assistantId` utiliza el `PromptBuilder` para generar el bundle completo que se enviaría a la IA (System Message + Herramientas). Es vital para entender exactamente qué instrucciones está recibiendo el LLM tras la inyección de metadatos y contexto extra.

## 🛡️ Herramientas y Plantillas
-   **List Templates**: Punto de entrada para que la IA descubra qué plantillas oficiales puede enviar.
-   **Test Trigger**: Permite inyectar eventos de mensaje manualmente en el `coreEventBus`, simulando la llegada de un mensaje de WhatsApp o Webchat para probar la reacción del sistema en caliente.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './fluxcore-runtime.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/fluxcore/runtime', router);
```
