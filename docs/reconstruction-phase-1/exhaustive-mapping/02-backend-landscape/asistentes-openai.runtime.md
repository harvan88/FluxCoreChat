---
id: "asistentes-openai-runtime"
type: "cognitive-runtime"
status: "stable"
criticality: "high"
location: "apps/api/src/services/fluxcore/runtimes/asistentes-openai.runtime.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "OpenAI Sync Service, Policy Context, Runtime Config" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor Cognitivo Remoto (OpenAI Assistants API)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Thread Formatting, Instructions Override, Run Monitoring" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🧠 AsistentesOpenAIRuntime (v8.3)

## 🎯 Propósito
Implementa la integración con la API de **OpenAI Assistants**. A diferencia del runtime local, este delega la gestión de estados, hilos (`threads`) y búsqueda de archivos (`vector stores`) a la infraestructura de OpenAI, ofreciendo una experiencia de "Asistente como Servicio".

## 🏗️ Flujo de Operación
1. **Identidad:** Requiere un `externalAssistantId` (asst_xxx) configurado en el `RuntimeConfig` de la cuenta.
2. **Contexto Dinámico:** Inyecta las directivas del `PolicyContext` de FluxCore como instrucciones adicionales (`instructionsOverride`), forzando a OpenAI a respetar el tono y las reglas locales de la empresa.
3. **Sincronización:** Utiliza `openaiSyncService` para orquestar la creación de runs y la espera de respuestas de forma eficiente y segura.

## 🛡️ Invariantes de Diseño
- **Independencia:** Nunca funciona como fallback del runtime local; son caminos de ejecución paralelos y exclusivos.
- **Sandboxing:** No realiza accesos directos a la DB de FluxCore, cumpliendo con el Canon v8.0 de seguridad de runtimes.

## 💡 Ventajas
Permite utilizar las capacidades avanzadas de OpenAI (como Code Interpreter o su RAG nativo) de forma transparente dentro de la interfaz de chat de FluxCore, manteniendo el control de políticas en el lado del Kernel de FluxCore.

## 💡 Ejemplo de Uso
```typescript
// El adaptador/runtime se registra en el sistema
import { runtime } from 'apps/api/src/services/fluxcore/runtimes/asistentes-openai.runtime.ts';

// Invocado por el RuntimeGateway según la configuración de cuenta
const actions = await runtime.handleMessage(runtimeInput);
```
