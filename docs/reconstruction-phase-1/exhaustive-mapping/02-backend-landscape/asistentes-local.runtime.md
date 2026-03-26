---
id: "asistentes-local-runtime"
type: "core"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "LLM Client, CapabilityLocalRuntimeToolsService, CreateCapabilityDeps, Prompt Builder" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor Cognitivo Soberano (Local LLM)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Multi-round Tool Calling, Platform Capability Consumption, Template Authorization" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🧠 AsistentesLocalRuntime (v8.3)

## 🎯 Propósito (Canon §4.10)
Es el motor de IA soberano de FluxCore. Implementa la ejecución de modelos de lenguaje (vía Groq u OpenAI) siguiendo un flujo determinista y mediado por la plataforma. Su diseño garantiza que el runtime sea un consumidor puro de capacidades, sin lógica de herramientas interna.

## 🏗️ Arquitectura "Plataforma Primero"
A partir de la v8.3, el runtime local ya no define sus propias herramientas. En su lugar:
1. Recibe el `RuntimeInput` con los servicios de plataforma ya inyectados.
2. Consulta al `capabilityLocalRuntimeToolsService` para obtener la lista de herramientas autorizadas (`LLMTool[]`).
3. Ejecuta las llamadas a herramientas generadas por el LLM delegando la lógica al servicio de puente de la plataforma.
4. Soporta hasta 2 rondas de llamadas (`MAX_TOOL_ROUNDS`) para flujos complejos (RAG -> Respuesta).

## 🚥 Invariantes y Seguridad
- **Aislamiento de Datos:** No tiene acceso directo a la DB (Canon Inv. 10).
- **Mediación de Efectos:** Nunca ejecuta efectos secundarios directamente (ej. enviar mensaje); siempre devuelve `ExecutionAction[]` para ser procesados por el `ActionExecutor`.
- **Autorización Granular:** Solo expone las herramientas y plantillas marcadas como autorizadas en el `PolicyContext`.

## 🧱 Dependencias
- **Depende de:** `llm-client.service.ts`, `capability-local-runtime-tools.service.ts`, `capability-deps-factory.service.ts`, `prompt-builder.service.ts`.
- **Es usado por:** `runtime-gateway.service.ts`.

## 💡 Ejemplo de Uso
```typescript
import { asistentesLocalRuntime } from './services/fluxcore/runtimes/asistentes-local.runtime';

// Invocado por el RuntimeGateway
const actions = await asistentesLocalRuntime.handleMessage(input);
```
