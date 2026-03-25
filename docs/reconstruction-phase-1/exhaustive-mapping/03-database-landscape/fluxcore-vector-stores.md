---
id: "db-fluxcore-vector-stores"
type: "database-schema-cluster"
status: "stable"
criticality: "high"
location: "packages/db/src/schema/fluxcore-vector-stores.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Esquema RAG alineado con OpenAI y Local" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Vinculado a Accounts y Assets. Consumido por Asistentes" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Retrieval Augmented Generation (RAG)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Dual-backend sync (Local/OpenAI), File status monitoring, Chunking strategy management, Storage usage tracking" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Schema Cluster: Vector Stores (RAG)

## 🎯 Propósito
Este cluster habilita la "Memoria a Largo Plazo" de los asistentes. Permite indexar miles de documentos y realizar búsquedas semánticas para inyectar fragmentos relevantes en el contexto de la IA. Está diseñado para ser 100% compatible con la API de OpenAI pero ejecutable localmente.

## 🚥 Componentes (Discovery)

### 1. `fluxcore_vector_stores`
Contenedor lógico de conocimiento.
-   `backend`: `local` (pgvector) o `openai` (Vector Store Service).
-   `file_counts`: Objeto JSON con el conteo de archivos por estado (alineado con OpenAI).
-   `expires_after`: Política de auto-vencimiento (días después de actividad).

### 2. `fluxcore_vector_store_files`
Tablas de enlace entre el archivo físico (`assets`) y el vector store.
-   `external_id`: El ID real del archivo en OpenAI.
-   `status`: `pending`, `processing`, `completed`, `failed`.
-   `last_error`: Captura fallos de indexación o parsing.

### 3. `fluxcore_document_chunks` (Tabla Dependiente)
Solo usada en `backend='local'`. Contiene los fragmentos de texto planos y sus correspondientes vectores (`embedding`) de alta dimensión.

## 🧬 Estrategias de Procesamiento (Connections)
-   **Dinamismo**: El campo `chunking_strategy` permite definir cuánto texto se corta por fragmento y cuánto solapamiento (`overlap`) existe entre ellos para mantener el contexto.
-   **Asistentes**: Un asistente "conecta" con un vector store a través de una tabla de unión, permitiéndole realizar `tool_calls` automáticas de tipo `file_search`.

## 🛡️ Reglas Arquitectónicas (Operations)
1.  **Reflejo de Verdad (OpenAI)**: Si el backend es `openai`, FluxCore actúa como un espejo. No se intentan recalcular bytes o estados localmente; se lee lo que el proveedor dicta.
2.  **Soberanía (Local)**: Si el backend es `local`, FluxCore es la autoridad suprema y gestiona el ciclo de vida completo de embeddings.
3.  **Auditoría de Costos**: La columna `usage_bytes` permite tarificar el almacenamiento de "conocimiento" de forma separada al tráfico de mensajes.

## 💡 Ejemplo de Uso
```typescript
// Listar vector stores activos
import { db, fluxcoreVectorStores } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

const stores = await db.select()
  .from(fluxcoreVectorStores)
  .where(and(
    eq(fluxcoreVectorStores.accountId, accountId),
    eq(fluxcoreVectorStores.status, 'production')
  ));
```
