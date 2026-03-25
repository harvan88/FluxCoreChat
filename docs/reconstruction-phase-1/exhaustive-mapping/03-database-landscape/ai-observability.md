---
id: "db-ai-observability"
type: "database-table"
status: "stable"
criticality: "medium"
location: "packages/db/src/schema/ai-traces.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tablas de trazabilidad y señales semánticas" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FK a Accounts, Conversations, Messages. Referencia cruzada entre Traces y Signals" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "AI Observability & Semantic Learning" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Latency tracking, Token usage auditing, Request/Response payload logging, Semantic signal extraction" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Tables: ai_observability_cluster

## 🎯 Propósito
Este cluster de tablas proporciona visibilidad total sobre qué está pensando la IA y cómo está ejecutando sus tareas. Es la infraestructura necesaria para depuración avanzada, auditoría de costos y aprendizaje de patrones de usuario (señales).

## 🚥 Estructura de Trazabilidad (Discovery)

### `ai_traces`
Registro técnico de cada llamada a un LLM.
-   **Metadata**: Proveedor (Groq/OpenAI), Modelo, Modo (Auto/Suggest).
-   **Consumo**: `prompt_tokens`, `completion_tokens`, `total_tokens`.
-   **Contenido**: Almacena el `request_body` (lo que se envió) y `response_content` (lo que se recibió).
-   **Herramientas**: Lista de herramientas ofrecidas y cuáles fueron llamadas realmente.

### `ai_signals`
Extractos semánticos derivados de las trazas.
-   `signal_type`: `sentiment`, `urgency`, `topic`, `intent`.
-   `signal_value`: El valor detectado (ej: `frustrated`, `high_urgency`, `sales_lead`).
-   `confidence`: Puntaje de fiabilidad de la señal (0.0 a 1.0).

## 🧬 Dinámica de Conexión (Connections)
-   **Correlación**: Cada señal (`ai_signals`) apunta obligatoriamente a una traza (`trace_id`).
-   **Contexto de Negocio**: Ambas están vinculadas a la `account_id` y `conversation_id`, lo que permite ver la evolución del sentimiento de un cliente a lo largo de un hilo de mensajes.

## 🛡️ Análisis de Rendimiento (Operations)
1.  **Optimización de Costos**: Facilita identificar si un modelo caro (GPT-4) está siendo usado para tareas que un modelo barato (Llama 8B) podría resolver.
2.  **Depuración de Herramientas**: El campo `tool_details` en la traza guarda la duración y el resultado de cada llamada a función, permitiendo detectar herramientas lentas o que devuelven errores recurrentes.
3.  **Fallback Auditing**: La columna `attempts` rastrea si el sistema tuvo que reintentar la petición con otro proveedor por fallos de red o límites de tasa.

## 💡 Ejemplo de Uso
```typescript
// Consultar trazas de IA para una conversación
import { db, aiTraces } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

const traces = await db.select()
  .from(aiTraces)
  .where(eq(aiTraces.conversationId, convId))
  .orderBy(desc(aiTraces.createdAt))
  .limit(20);
```
