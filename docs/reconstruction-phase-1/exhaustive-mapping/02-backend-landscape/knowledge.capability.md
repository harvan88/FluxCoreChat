---
id: "knowledge-capability"
type: "agentic-capability"
status: "stable"
criticality: "high"
location: "apps/api/src/core/capabilities/knowledge.capability.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "RetrievalService, PermissionService, LLM (via Function Calling)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Herramienta de Búsqueda RAG para Agentes" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tool definition (JSON Schema), Auto-discovery of accessible VectorStores, Context building via Semantic Search, Token usage tracking in RAG, Source attribution" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Knowledge Capability

## 🎯 Propósito
La `Knowledge Capability` (herramienta `search_knowledge`) es la ventana del agente hacia la base de conocimiento del negocio. Permite que la IA, de forma autónoma, decida cuándo necesita buscar información externa (precios, políticas, datos técnicos) para completar su razonamiento en lugar de alucinar o depender solo de su memoria interna.

## 🚥 Definición de Herramienta
Expone una interfaz compatible con OpenAI Function Calling:
-   **Name**: `search_knowledge`.
-   **Description**: Instrucciones específicas para la IA sobre *cuándo* usarla (datos específicos no presentes en la charla).
-   **Parameters**: Requiere una `query` en lenguaje natural, optimizada para búsqueda semántica.

## 🧬 Resolución de Contexto (Soberanía)
A diferencia de un RAG simple, esta capacidad respeta la soberanía de datos:
1.  **Descubrimiento**: Consulta al `PermissionService` qué `vector_store` tiene permitidos la cuenta actual.
2.  **Filtrado**: Solo realiza búsquedas en los almacenes autorizados, evitando fugas de información entre inquilinos (Multi-tenancy).
3.  **Consolidación**: El `RetrievalService` toma la query y los IDs autorizados para devolver fragmentos (chunks) de texto ordenados por relevancia.

## 🛡️ Trazabilidad de Fuentes
La respuesta de la herramienta no solo incluye el texto de apoyo (`context`), sino también:
-   **Sources**: Lista de documentos originales de donde se extrajo la información.
-   **Metrics**: Cantidad de chunks usados y tokens consumidos, permitiendo auditar la eficiencia del proceso de recuperación semántica.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: knowledge.capability
import { knowledge.capability } from 'apps/api/src/core/capabilities/knowledge.capability.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await knowledge.capability.process(input);
```
