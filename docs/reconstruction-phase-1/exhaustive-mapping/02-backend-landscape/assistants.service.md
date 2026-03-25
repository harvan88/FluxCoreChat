---
id: "assistants-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/fluxcore/assistants.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (assistants, instructions, vector_stores, tools), OpenAI Sync Service, Account Label Service" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Asistentes IA y Configuración de Comportamiento" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Managed instruction generation (Cori), Default provisioning, Assistant-to-Asset linking, Hybrid runtimes (Local/OpenAI), Mode synchronization (PolicyContext)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AssistantsService

## 🎯 Propósito
Este servicio gestiona la identidad y el cerebro de la IA para cada cuenta. Centraliza la creación, edición y activación de los Asistentes, orquestando su conexión con bases de conocimientos (Vector Stores), herramientas y juegos de instrucciones.

## 🤖 Cori: Instrucciones Gestionadas
El servicio implementa `generateManagedInstructionContent`, que construye dinámicamente el prompt de sistema para el asistente "Cori":
-   **Inyección de Perfil**: Lee los datos del negocio (JSON) y los inyecta en lenguaje natural.
-   **Contexto de Tiempo**: Calcula la hora local argentina para que la IA tenga noción temporal real.
-   **Pautas de Estilo**: Aplica reglas canónicas (brevedad, empatía, evitar alucinaciones).

## 🚥 Soberanía de Runtimes (Local vs OpenAI)
Soporta una arquitectura dual:
-   **Flujo OpenAI**: Si el asistente se marca como `runtime: openai`, el servicio sincroniza los cambios con la API de OpenAI (Threads/Assistants API) mediante `openaiSync`.
-   **Flujo Local**: Si es `local`, gestiona las relaciones internas de Drizzle para que el `CognitiveDispatcher` construya el prompt localmente.

## 🔄 Sincronización de Políticas
-   **Mode Sync**: Al cambiar el modo de un asistente (`auto`, `suggest`, `off`), el servicio asegura la redundancia escribiendo en `fluxcore_account_policies`, que es la "Source of Truth" de baja latencia para el despacho de mensajes.
-   **Auto-Provisioning**: Si una cuenta nueva no tiene asistente, `ensureActiveAssistant` crea automáticamente uno con la configuración recomendada de fábrica (Llama 3.1 8B).

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { assistantsService } from 'apps/api/src/services/fluxcore/assistants.service.ts';

// Ejemplo de invocación típica
const result = await assistantsService.execute(params);
```
