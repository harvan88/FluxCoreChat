---
id: "document-processing-service"
type: "orchestration-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/document-processing.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "ChunkingService, EmbeddingService, RAGConfigService, VectorStoreService, Drizzle (documentChunks, vectorStoreFiles)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Pipeline de Ingesta y Indexación (RAG-006)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Document parsing (MIME-based), Cascading cleanup, Batch processing with concurrency, Job status tracking, Stats synchronization" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ DocumentProcessingService

## 🎯 Propósito
El `DocumentProcessingService` es el orquestador del pipeline de ingesta. Toma archivos crudos (Buffer) y los transforma en conocimiento accionable dentro de la base de datos vectorial, coordinando los servicios de fragmentación y vectorización en una secuencia lógica.

## 🚥 El Pipeline de Ingesta
1.  **Parse**: Identifica el tipo MIME (PDF, TXT, DOCX) y extrae el texto plano.
2.  **Clean**: Elimina chunks previos asociados al archivo para evitar duplicados en re-procesamientos.
3.  **Chunk**: Segmenta el texto según la estrategia configurada.
4.  **Embed**: Genera los vectores para cada fragmento en batches concurrentes.
5.  **Store**: Inserta los chunks en la tabla `fluxcore_document_chunks` usando SQL raw para el tipo `vector`.

## 🧬 Gestión de Jobs y Concurrencia
Maneja una cola de trabajos en memoria que permite rastrear el progreso (`progress`) de cada archivo. Implementa un control de concurrencia para evitar saturar las APIs de embeddings o la memoria del servidor cuando se suben múltiples archivos pesados simultáneamente.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { documentProcessingService } from 'apps/api/src/services/document-processing.service.ts';

// Ejemplo de invocación típica
const result = await documentProcessingService.execute(params);
```
