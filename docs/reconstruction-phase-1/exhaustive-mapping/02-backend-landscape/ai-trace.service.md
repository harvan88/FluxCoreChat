---
id: "ai-trace-service"
type: "infrastructure-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/ai-trace.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (aiTraces, aiSignals), FluxCore Extensions (fallback)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Observabilidad de IA" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Trace persistence (tokens/duration), LLM signal extraction, Request/Response body snapshots, Attempt tracking, In-memory extension fallback, Trace export/purge" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AITraceService

## 🎯 Propósito
El `AITraceService` es el sistema de caja negra de FluxCore. Captura cada interacción con los modelos de lenguaje (LLM), proporcionando una trazabilidad completa del ciclo de vida de una respuesta de IA, desde el prompt generado hasta el consumo final de tokens.

## 🚥 Trazabilidad de Inferencia
Para cada "Trace", el servicio persiste:
-   **Consumo**: Desglose exacto de `promptTokens`, `completionTokens` y `totalTokens`.
-   **Performance**: Duración en milenisegundos (`durationMs`) y marca de tiempo de inicio/fin.
-   **Contexto**: Snapshots del prompt enviado (`builtPrompt`) y del contexto de seguridad utilizado (`contextSnapshot`).
-   **Herramientas**: Lista de herramientas ofrecidas vs. herramientas efectivamente llamadas por el modelo.

## 🧬 Señales Cognitivas (AISignals)
Más allá de los logs técnicos, el servicio persiste **Señales** extraídas de la respuesta. Estas señales (intenciones, entidades, sentimientos) se vinculan al trace original y permiten al sistema reaccionar de forma estructurada a la salida no estructurada del LLM.

## 🛡️ Soberanía y Resiliencia
Implementa un patrón de fallback único: si la base de datos principal experimenta latencia o fallos, el servicio puede delegar la persistencia y consulta a un almacenamiento en memoria a través de una extensión registrada, asegurando que la telemetría nunca bloquee el flujo crítico de la conversación.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { aiTraceService } from 'apps/api/src/services/ai-trace.service.ts';

// Ejemplo de invocación típica
const result = await aiTraceService.execute(params);
```
