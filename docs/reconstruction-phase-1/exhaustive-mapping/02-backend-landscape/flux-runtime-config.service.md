---
id: "flux-runtime-config-service"
type: "logic-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/flux-runtime-config.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (assistants, instructions, runtime_config, vector_stores)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Configuración Técnica de Ejecución (Canon v8.3)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Technical runtime resolution, Instruction compilation, Provider/Model mapping, Vector store linking" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ RuntimeConfigService (Canon v8.3)

## 🎯 Propósito
Complemento técnico del `FluxPolicyContextService`. Mientras que el Context define el comportamiento del negocio, el **RuntimeConfig** especifica el **WHAT** (qué) necesita la tecnología para ejecutarse. Resuelve los parámetros del LLM, las instrucciones compiladas y las conexiones a bases de datos vectoriales.

## 🤖 Resolución de Asistente
Implementa una lógica de búsqueda de asistente "activo":
1. Busca el asistente preferido configurado en `accountRuntimeConfig`.
2. Fallback al asistente marcado como `production`.
3. Fallback al asistente más reciente en estado `active`.

## 📜 Compilación de Instrucciones
Orquestra la unión atómica de múltiples bloques de instrucciones. Consulta las versiones actuales de las instrucciones vinculadas y las concatena en un solo buffer de texto con separadores canónicos (`---`), permitiendo una inyección limpia en el `System Prompt` del modelo.

## 🏗️ Mapeo de Adaptadores
Convierte las definiciones humanas de "Runtime" a IDs de adaptadores registrados en el sistema:
- `local` ⮕ `asistentes-local` (Ejecución vía Groq/Karen).
- `openai` ⮕ `asistentes-openai` (Ejecución vía OpenAI Assistants API).
- `fluxi` ⮕ `fluxi-runtime` (Orquestación de flujos deterministas).

## 🧠 Sincronización RAG
Identifica automáticamente todos los `vectorStoreIds` vinculados al asistente actual. Esta información es crucial para que el `CognitiveDispatcher` sepa qué memorias externas debe habilitar durante la generación de la respuesta.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { fluxRuntimeConfigService } from 'apps/api/src/services/flux-runtime-config.service.ts';

// Ejemplo de invocación típica
const result = await fluxRuntimeConfigService.execute(params);
```
