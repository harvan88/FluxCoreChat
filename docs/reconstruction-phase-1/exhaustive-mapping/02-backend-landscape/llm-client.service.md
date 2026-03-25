---
id: "llm-client-service"
type: "infrastructure-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/fluxcore/llm-client.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "OpenAI/Groq APIs (external)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Conector Soberano de LLMs (Canon §4.7.1)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Provider-level fallback (Groq -> OpenAI), Chat Completion parameters (maxTokens, temp), Tool call structural parsing, Token usage tracking, Error status normalization" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ LLMClientService

## 🎯 Propósito
El `LLMClientService` es el único punto de contacto técnico con los modelos de lenguaje. Siguiendo el **Canon §4.7.1**, es un servicio "puro" que no accede a la base de datos y se limita a realizar llamadas HTTP asíncronas a las APIs compatibles con OpenAI (Groq u OpenAI nativo).

## 🚥 Tolerancia a Fallos de Proveedor
Implementa una lógica de fallback de primer nivel:
-   Si el proveedor principal no tiene API Key configurada, intenta automáticamente con el secundario.
-   Si el proveedor principal devuelve errores recuperables (429 - Rate Limit o 503 - Service Unavailable), realiza un reintento transparente con el proveedor alternativo, asegurando alta disponibilidad incluso durante incidentes de terceros.

## 🧬 Estandarización de Salida
Normaliza la respuesta disparatada de diferentes APIs en un `LLMCompletionResult` consistente:
-   **Content**: El texto limpio de la respuesta.
-   **ToolCalls**: Extracción estructurada de llamadas a funciones/herramientas.
-   **Usage**: Mapeo unificado de tokens consumidos para el sistema de trazabilidad (`ai-trace`).

## 🛡️ Soberanía Técnica
El servicio es agnóstico al negocio. No resuelve asistentes ni valida créditos. Su única preocupación es que el JSON de salida cumpla con el esquema esperado de FluxCore, delegando la lógica de "qué decir" al `PromptBuilder` y la de "qué hacer" al `ActionExecutor`.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { llmClientService } from 'apps/api/src/services/fluxcore/llm-client.service.ts';

// Ejemplo de invocación típica
const result = await llmClientService.execute(params);
```
