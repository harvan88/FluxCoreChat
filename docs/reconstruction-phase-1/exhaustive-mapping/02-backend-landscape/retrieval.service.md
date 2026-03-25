---
id: "retrieval-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/retrieval.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "EmbeddingService, RAGConfigService, PermissionService, Drizzle (documentChunks)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Búsqueda Semántica (RAG-007)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Access validation, Query embedding, pgvector similarity search, Context building with sources, Hybrid search placeholder" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ RetrievalService

## 🎯 Propósito
El `RetrievalService` es el componente táctico encargado de extraer conocimiento relevante de las bases de datos vectoriales. Su función es responder a la pregunta: "¿Qué sabe el sistema sobre esta consulta específica?" y entregar los fragmentos (chunks) más pertinentes para alimentar el prompt de la IA.

## 🚥 Ingeniería de Búsqueda
-   **Validación de Acceso**: Antes de buscar, verifica que la cuenta tenga permisos de lectura sobre cada Vector Store solicitado mediante `PermissionService`.
-   **pgvector Search**: Realiza la búsqueda de similitud directamente en PostgreSQL utilizando el operador `<=>` (distancia de coseno) para encontrar los vectores más cercanos al de la consulta.
-   **Context Formatting**: No solo entrega texto; construye un bloque estructurado titulado `=== CONTEXTO DE BASE DE CONOCIMIENTO ===` que incluye metadatos del documento (título, página, sección) para ayudar a la IA a citar fuentes.

## 🧬 Estrategia de Selección
-   **Filtrado por Score**: Ignora fragmentos que no alcancen el `minScore` configurado, evitando inyectar ruido o información irrelevante.
-   **Ajuste por Tokens**: El servicio suma el conteo de tokens de cada fragmento y corta la lista si excede el `maxTokens` permitido, preservando el espacio para la respuesta de la IA.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { retrievalService } from 'apps/api/src/services/retrieval.service.ts';

// Ejemplo de invocación típica
const result = await retrievalService.execute(params);
```
