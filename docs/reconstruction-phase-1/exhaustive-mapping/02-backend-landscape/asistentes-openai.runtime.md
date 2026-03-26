---
id: "asistentes-openai-runtime"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/fluxcore/runtimes/asistentes-openai.runtime.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "runAssistantWithMessages (openai-sync), CapabilityOpenAIOfferService, RuntimeStyleService, RuntimeInstructionContextService" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor Cognitivo Remoto (OpenAI Assistants API)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Thread Formatting, Instructions Override, Platform Capability Consumption" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🧠 AsistentesOpenAIRuntime (v8.3)

## 🎯 Propósito (Canon §4.11)
Implementa la integración con la API de OpenAI Assistants. A diferencia del runtime local, este delega la gestión de estados, hilos (`threads`) y búsqueda de archivos (`vector stores`) a la infraestructura de OpenAI, pero bajo la gobernanza estricta de la plataforma FluxCore.

## 🏗️ Arquitectura "Gobernanza Local"
A partir de la v8.3, el runtime de OpenAI consume capacidades mediadas:
1. **Oferta Centralizada:** Utiliza el `capabilityOpenAIOfferService` para decidir qué herramientas (`tools`) enviar a OpenAI basándose en la configuración de la plataforma FluxCore.
2. **Override de Instrucciones:** Inyecta las directivas del `PolicyContext` resuelto (tono, idioma, reglas de contacto) como instrucciones adicionales, forzando al modelo remoto a seguir la soberanía de negocio local.
3. **Consumo de Herramientas:** Aunque OpenAI orqueste los `runs`, las herramientas propuestas por la plataforma (como `send_template`) son mapeadas y filtradas para asegurar paridad con el runtime local.

## 🚥 Invariantes y Seguridad
- **Aislamiento de Datos:** No realiza accesos directos a la DB (Canon Inv. 10).
- **Mediación de Efectos:** Los resultados del runtime (textos y acciones de herramientas) se transforman en `ExecutionAction[]` para su procesamiento mediado por el `ActionExecutor`.
- **Independencia:** Funciona como una ruta de ejecución paralela y exclusiva al runtime local.

## 🧱 Dependencias
- **Depende de:** `openai-sync.service.ts`, `capability-openai-offer.service.ts`, `runtime-style.service.ts`, `runtime-instruction-context.service.ts`.
- **Es usado por:** `runtime-gateway.service.ts`.

## 💡 Ejemplo de Uso
```typescript
import { asistentesOpenAIRuntime } from './services/fluxcore/runtimes/asistentes-openai.runtime';

// Invocado por el RuntimeGateway
const actions = await asistentesOpenAIRuntime.handleMessage(input);
```
