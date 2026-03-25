---
id: "file-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/file.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (fluxcoreFiles, fluxcoreVectorStoreFiles)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Archivos de Conocimiento (RAG Source Files)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Deduplicated upload, Vector store linking (N:M), Text extraction persistence, Link status tracking, Chunk count reporting" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ FileService

## 🎯 Propósito
El `FileService` se especializa en la gestión de archivos destinados al sistema RAG (Retrieval-Augmented Generation). A diferencia del Asset Registry general, este servicio se enfoca en la estructura de datos necesaria para que la IA pueda "leer" y "entender" los documentos.

## 🚥 Relación N:M (Vector Store Link)
-   **Soberanía de Archivos**: Un archivo físico vive de forma única en `fluxcore_files`.
-   **Vinculación Flexible**: El mismo manual de usuario (archivo) puede estar vinculado a múltiples "Tiendas de Vectores" (Vector Stores) preventa, soporte, legal sin ser duplicado.
-   **Tracking de Estado**: Cada enlace tiene su propio estado de procesamiento (`pending`, `processing`, `completed`, `failed`), permitiendo ver qué base de conocimiento ya está "lista para preguntar".

## 🧬 Preparación Cognitiva
-   **Persistence of Text**: Durante la carga, el servicio extrae y guarda el `textContent` para facilitar reprocesamientos rápidos de fragmentación (chunking) sin tener que re-descargar y re-decodificar el archivo original.
-   **Hash-Based Deduplication**: Evita inyectar múltiples veces la misma información en el contexto de la IA mediante chequeos de `contentHash`.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { fileService } from 'apps/api/src/services/file.service.ts';

// Ejemplo de invocación típica
const result = await fileService.execute(params);
```
