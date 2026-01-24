# OpenAI Vector Store - Documentación de Referencia

> **Fecha de Creación:** 2026-01-23
> **Propósito:** Documentación oficial de la API de Vector Store de OpenAI para referencia en FluxCore

---

## Índice

1. [Conceptos Fundamentales](#1-conceptos-fundamentales)
2. [Vector Stores API](#2-vector-stores-api)
3. [Vector Store Files API](#3-vector-store-files-api)
4. [File Batches API](#4-file-batches-api)
5. [Files API (Archivos)](#5-files-api-archivos)
6. [Estrategias de Chunking](#6-estrategias-de-chunking)
7. [Búsqueda Semántica](#7-búsqueda-semántica)
8. [Mejores Prácticas](#8-mejores-prácticas)
9. [Código de Referencia Oficial](#9-código-de-referencia-oficial)

---

## 1. Conceptos Fundamentales

### ¿Qué es un Vector Store?

Un **Vector Store** es una colección de archivos procesados que pueden ser utilizados por la herramienta `file_search` en las APIs de Responses y Assistants de OpenAI.

**Características principales:**
- Almacena embeddings vectoriales de documentos
- Soporta búsqueda semántica basada en similaridad
- Se integra automáticamente con el tool `file_search`
- Gestiona el ciclo de vida de los archivos indexados

### Objeto Vector Store

```json
{
  "id": "vs_abc123",
  "object": "vector_store",
  "created_at": 1699061776,
  "name": "Support FAQ",
  "description": "Contains commonly asked questions...",
  "usage_bytes": 139920,
  "file_counts": {
    "in_progress": 0,
    "completed": 3,
    "failed": 0,
    "cancelled": 0,
    "total": 3
  },
  "status": "completed",
  "expires_after": {
    "anchor": "last_active_at",
    "days": 7
  },
  "expires_at": 1699234576,
  "last_active_at": 1699061776,
  "metadata": {}
}
```

### Estados del Vector Store

| Estado | Descripción |
|--------|-------------|
| `in_progress` | Se están procesando archivos |
| `completed` | Listo para usar |
| `expired` | Ha expirado según la política |

---

## 2. Vector Stores API

### Crear Vector Store

```typescript
// POST https://api.openai.com/v1/vector_stores

const openai = new OpenAI();

const vectorStore = await openai.vectorStores.create({
  name: "Support FAQ",
  description: "Preguntas frecuentes organizadas por tema",
  file_ids: ["file-abc123", "file-def456"], // Opcional
  chunking_strategy: {
    type: "auto" // o "static" con configuración
  },
  expires_after: {
    anchor: "last_active_at",
    days: 7
  },
  metadata: {
    category: "support",
    version: "1.0"
  }
});
```

**Parámetros de creación:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `name` | string | No | Nombre del vector store |
| `description` | string | No | Descripción del propósito |
| `file_ids` | array | No | IDs de archivos a incluir |
| `chunking_strategy` | object | No | Estrategia de chunking |
| `expires_after` | object | No | Política de expiración |
| `metadata` | map | No | Hasta 16 pares clave-valor |

### Listar Vector Stores

```typescript
// GET https://api.openai.com/v1/vector_stores

const vectorStores = await openai.vectorStores.list({
  limit: 20,
  order: "desc",
  // after: "vs_xxx", // Para paginación
  // before: "vs_xxx"
});

for await (const vs of vectorStores) {
  console.log(vs.name, vs.status);
}
```

### Recuperar Vector Store

```typescript
// GET https://api.openai.com/v1/vector_stores/{vector_store_id}

const vectorStore = await openai.vectorStores.retrieve("vs_abc123");
```

### Modificar Vector Store

```typescript
// POST https://api.openai.com/v1/vector_stores/{vector_store_id}

const updated = await openai.vectorStores.update("vs_abc123", {
  name: "Updated FAQ",
  expires_after: {
    anchor: "last_active_at",
    days: 14
  },
  metadata: {
    version: "2.0"
  }
});
```

### Eliminar Vector Store

```typescript
// DELETE https://api.openai.com/v1/vector_stores/{vector_store_id}

const deleted = await openai.vectorStores.delete("vs_abc123");
// { id: "vs_abc123", object: "vector_store.deleted", deleted: true }
```

---

## 3. Vector Store Files API

### Crear Archivo en Vector Store

```typescript
// POST https://api.openai.com/v1/vector_stores/{vector_store_id}/files

const file = await openai.vectorStores.files.create("vs_abc123", {
  file_id: "file-abc123",
  attributes: {
    category: "policies",
    date: "2024-01-01"
  },
  chunking_strategy: {
    type: "static",
    static: {
      max_chunk_size_tokens: 800,
      chunk_overlap_tokens: 400
    }
  }
});
```

### Objeto Vector Store File

```json
{
  "id": "file-abc123",
  "object": "vector_store.file",
  "usage_bytes": 1234,
  "created_at": 1699061776,
  "vector_store_id": "vs_abc123",
  "status": "completed",
  "last_error": null,
  "attributes": {
    "category": "policies"
  },
  "chunking_strategy": {
    "type": "static",
    "static": {
      "max_chunk_size_tokens": 800,
      "chunk_overlap_tokens": 400
    }
  }
}
```

### Estados de Archivos

| Estado | Descripción |
|--------|-------------|
| `in_progress` | Procesando |
| `completed` | Indexado correctamente |
| `failed` | Falló el procesamiento |
| `cancelled` | Cancelado |

### Listar Archivos

```typescript
// GET https://api.openai.com/v1/vector_stores/{vector_store_id}/files

const files = await openai.vectorStores.files.list("vs_abc123", {
  limit: 100,
  order: "desc",
  filter: "completed" // in_progress, completed, failed, cancelled
});
```

### Recuperar Archivo

```typescript
// GET https://api.openai.com/v1/vector_stores/{vs_id}/files/{file_id}

const file = await openai.vectorStores.files.retrieve("vs_abc123", "file-abc123");
```

### Recuperar Contenido del Archivo

```typescript
// GET https://api.openai.com/v1/vector_stores/{vs_id}/files/{file_id}/content

const content = await openai.vectorStores.files.content("vs_abc123", "file-abc123");
// {
//   file_id: "file-abc123",
//   filename: "example.txt",
//   attributes: {...},
//   content: [{ type: "text", text: "..." }]
// }
```

### Actualizar Atributos

```typescript
// POST https://api.openai.com/v1/vector_stores/{vs_id}/files/{file_id}

const updated = await openai.vectorStores.files.update("vs_abc123", "file-abc123", {
  attributes: {
    category: "updated_category",
    priority: 1
  }
});
```

### Eliminar Archivo del Vector Store

```typescript
// DELETE https://api.openai.com/v1/vector_stores/{vs_id}/files/{file_id}

const deleted = await openai.vectorStores.files.delete("vs_abc123", "file-abc123");
// Nota: Esto NO elimina el archivo subyacente, solo lo desvincula
```

---

## 4. File Batches API

### Crear Batch de Archivos

```typescript
// POST https://api.openai.com/v1/vector_stores/{vs_id}/file_batches

// Opción 1: Con file_ids comunes
const batch = await openai.vectorStores.fileBatches.create("vs_abc123", {
  file_ids: ["file-1", "file-2", "file-3"],
  attributes: { batch: "upload-2024-01" }, // Aplicado a todos
  chunking_strategy: { type: "auto" }
});

// Opción 2: Con configuración por archivo
const batchCustom = await openai.vectorStores.fileBatches.create("vs_abc123", {
  files: [
    {
      file_id: "file-abc123",
      attributes: { category: "finance" }
    },
    {
      file_id: "file-abc456",
      chunking_strategy: {
        type: "static",
        static: {
          max_chunk_size_tokens: 1200,
          chunk_overlap_tokens: 200
        }
      }
    }
  ]
});
```

### Objeto File Batch

```json
{
  "id": "vsfb_abc123",
  "object": "vector_store.files_batch",
  "created_at": 1699061776,
  "vector_store_id": "vs_abc123",
  "status": "in_progress",
  "file_counts": {
    "in_progress": 1,
    "completed": 1,
    "failed": 0,
    "cancelled": 0,
    "total": 2
  }
}
```

### Recuperar Estado del Batch

```typescript
const batch = await openai.vectorStores.fileBatches.retrieve("vs_abc123", "vsfb_abc123");
```

### Cancelar Batch

```typescript
await openai.vectorStores.fileBatches.cancel("vs_abc123", "vsfb_abc123");
```

### Listar Archivos del Batch

```typescript
const batchFiles = await openai.vectorStores.fileBatches.listFiles("vs_abc123", "vsfb_abc123", {
  filter: "in_progress"
});
```

---

## 5. Files API (Archivos)

### Subir Archivo

```typescript
// POST https://api.openai.com/v1/files

const file = await openai.files.create({
  file: fs.createReadStream("document.pdf"),
  purpose: "assistants" // Requerido para vector stores
});
```

**Propósitos válidos:**
- `assistants` - Para uso con Assistants API y Vector Stores
- `fine-tune` - Para fine-tuning
- `batch` - Para batch API

### Listar Archivos

```typescript
const files = await openai.files.list({
  purpose: "assistants"
});
```

### Eliminar Archivo

```typescript
// DELETE https://api.openai.com/v1/files/{file_id}

const deleted = await openai.files.del("file-abc123");
```

> ⚠️ **IMPORTANTE:** Eliminar un archivo de un vector store NO elimina el archivo subyacente. Para eliminar completamente, usar `files.del()`.

---

## 6. Estrategias de Chunking

### Auto (Predeterminado)

```typescript
chunking_strategy: {
  type: "auto"
}
// Usa max_chunk_size_tokens: 800, chunk_overlap_tokens: 400
```

### Static (Personalizado)

```typescript
chunking_strategy: {
  type: "static",
  static: {
    max_chunk_size_tokens: 800,   // 100 - 4096
    chunk_overlap_tokens: 400     // <= max_chunk_size_tokens / 2
  }
}
```

**Recomendaciones:**

| Caso de Uso | max_chunk | overlap | Notas |
|-------------|-----------|---------|-------|
| General | 800 | 400 | Balance predeterminado |
| Documentos técnicos | 1200 | 300 | Más contexto por chunk |
| FAQ/Respuestas cortas | 400 | 100 | Respuestas más precisas |
| Documentos legales | 1500 | 500 | Mantener contexto legal |

---

## 7. Búsqueda Semántica

### Endpoint de Búsqueda

```typescript
// POST https://api.openai.com/v1/vector_stores/{vs_id}/search

const results = await openai.vectorStores.search("vs_abc123", {
  query: "¿Cuál es la política de devoluciones?",
  max_num_results: 10,
  rewrite_query: false,
  ranking_options: {
    ranker: "auto",           // "none" | "auto" | "default-2024-11-15"
    score_threshold: 0.5      // Filtrar por score mínimo
  },
  filters: {
    type: "eq",
    key: "category",
    value: "policies"
  }
});
```

### Respuesta de Búsqueda

```json
{
  "object": "vector_store.search_results.page",
  "search_query": "¿Cuál es la política de devoluciones?",
  "data": [
    {
      "file_id": "file_123",
      "filename": "policies.pdf",
      "score": 0.95,
      "attributes": {
        "category": "policies",
        "date": "2024-01-01"
      },
      "content": [
        {
          "type": "text",
          "text": "Nuestra política de devoluciones permite..."
        }
      ]
    }
  ],
  "has_more": false,
  "next_page": null
}
```

### Filtros Disponibles

```typescript
// Filtro de comparación simple
filters: {
  type: "eq",  // eq, ne, gt, gte, lt, lte
  key: "category",
  value: "support"
}

// Filtro compuesto
filters: {
  type: "and",  // and, or
  filters: [
    { type: "eq", key: "category", value: "support" },
    { type: "gte", key: "priority", value: 1 }
  ]
}
```

---

## 8. Mejores Prácticas

### 8.1 Gestión de Archivos

1. **Subir antes de crear el vector store:**
   ```typescript
   // 1. Subir archivos primero
   const fileIds = [];
   for (const doc of documents) {
     const file = await openai.files.create({
       file: doc.content,
       purpose: "assistants"
     });
     fileIds.push(file.id);
   }
   
   // 2. Crear vector store con los IDs
   const vs = await openai.vectorStores.create({
     name: "Knowledge Base",
     file_ids: fileIds
   });
   ```

2. **Usar File Batches para múltiples archivos:**
   ```typescript
   // Más eficiente que agregar uno por uno
   await openai.vectorStores.fileBatches.create(vsId, {
     file_ids: fileIds
   });
   ```

3. **Monitorear estado de procesamiento:**
   ```typescript
   // Polling para verificar completitud
   async function waitForVectorStore(vsId: string) {
     while (true) {
       const vs = await openai.vectorStores.retrieve(vsId);
       if (vs.status === "completed") return vs;
       if (vs.file_counts.failed > 0) {
         console.warn(`${vs.file_counts.failed} archivos fallaron`);
       }
       await new Promise(r => setTimeout(r, 1000));
     }
   }
   ```

### 8.2 Política de Expiración

1. **Configurar expiración apropiada:**
   ```typescript
   // Para datos temporales (7 días)
   expires_after: { anchor: "last_active_at", days: 7 }
   
   // Para datos permanentes
   // No especificar expires_after
   ```

2. **Manejar renovación:**
   ```typescript
   // Cualquier uso renueva automáticamente el contador
   // Búsquedas, file_search del asistente, etc.
   ```

### 8.3 Optimización de Búsqueda

1. **Usar atributos para filtrar:**
   ```typescript
   // Al agregar archivos
   attributes: {
     tenant_id: "customer-123",
     document_type: "contract",
     year: 2024
   }
   
   // Al buscar
   filters: {
     type: "and",
     filters: [
       { type: "eq", key: "tenant_id", value: "customer-123" },
       { type: "eq", key: "document_type", value: "contract" }
     ]
   }
   ```

2. **Ajustar chunking según el contenido:**
   ```typescript
   // Código o contenido técnico
   { max_chunk_size_tokens: 1200, chunk_overlap_tokens: 300 }
   
   // Contenido conversacional
   { max_chunk_size_tokens: 600, chunk_overlap_tokens: 200 }
   ```

### 8.4 Manejo de Errores

```typescript
try {
  await openai.vectorStores.files.create(vsId, { file_id });
} catch (error) {
  if (error.code === "invalid_file_format") {
    console.error("Formato de archivo no soportado");
  } else if (error.code === "file_already_exists") {
    console.warn("El archivo ya existe en el vector store");
  } else {
    throw error;
  }
}
```

### 8.5 Headers Requeridos

```typescript
// Para usar la API v2 de Assistants
headers: {
  "Authorization": `Bearer ${apiKey}`,
  "Content-Type": "application/json",
  "OpenAI-Beta": "assistants=v2"  // IMPORTANTE
}
```

---

## 9. Código de Referencia Oficial

### Ejemplo Completo: Crear y Usar Vector Store

```typescript
import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function setupKnowledgeBase() {
  // 1. Subir archivos
  const file1 = await openai.files.create({
    file: fs.createReadStream('./docs/faq.pdf'),
    purpose: 'assistants',
  });

  const file2 = await openai.files.create({
    file: fs.createReadStream('./docs/policies.pdf'),
    purpose: 'assistants',
  });

  console.log('Archivos subidos:', file1.id, file2.id);

  // 2. Crear vector store
  const vectorStore = await openai.vectorStores.create({
    name: 'Customer Support Knowledge',
    description: 'FAQ y políticas para soporte al cliente',
    expires_after: {
      anchor: 'last_active_at',
      days: 30,
    },
  });

  console.log('Vector store creado:', vectorStore.id);

  // 3. Agregar archivos con batch
  const batch = await openai.vectorStores.fileBatches.create(vectorStore.id, {
    file_ids: [file1.id, file2.id],
    chunking_strategy: {
      type: 'static',
      static: {
        max_chunk_size_tokens: 800,
        chunk_overlap_tokens: 400,
      },
    },
  });

  console.log('Batch creado:', batch.id);

  // 4. Esperar a que se procese
  let status = batch.status;
  while (status === 'in_progress') {
    await new Promise(r => setTimeout(r, 2000));
    const updated = await openai.vectorStores.fileBatches.retrieve(
      vectorStore.id,
      batch.id
    );
    status = updated.status;
    console.log('Estado:', status, updated.file_counts);
  }

  console.log('Vector store listo!');

  // 5. Crear asistente con file_search
  const assistant = await openai.beta.assistants.create({
    name: 'Support Assistant',
    instructions: 'Ayuda a los clientes usando la base de conocimiento.',
    model: 'gpt-4-turbo',
    tools: [{ type: 'file_search' }],
    tool_resources: {
      file_search: {
        vector_store_ids: [vectorStore.id],
      },
    },
  });

  console.log('Asistente creado:', assistant.id);

  return { vectorStore, assistant };
}

// Ejecutar
setupKnowledgeBase().catch(console.error);
```

### Ejemplo: Búsqueda Directa

```typescript
async function searchKnowledge(question: string) {
  const results = await openai.vectorStores.search(VS_ID, {
    query: question,
    max_num_results: 5,
    ranking_options: {
      ranker: 'auto',
      score_threshold: 0.7,
    },
  });

  console.log('Resultados encontrados:', results.data.length);
  
  for (const result of results.data) {
    console.log(`\n[${result.filename}] Score: ${result.score}`);
    for (const content of result.content) {
      console.log(content.text.substring(0, 200) + '...');
    }
  }

  return results.data;
}
```

### Ejemplo: Gestión de Ciclo de Vida

```typescript
async function cleanupOldFiles(vsId: string, olderThanDays: number) {
  const cutoff = Date.now() / 1000 - (olderThanDays * 24 * 60 * 60);
  
  const files = await openai.vectorStores.files.list(vsId);
  
  for await (const file of files) {
    if (file.created_at < cutoff) {
      console.log(`Eliminando ${file.id} (antiguo)`);
      await openai.vectorStores.files.delete(vsId, file.id);
      // Opcional: también eliminar el archivo subyacente
      await openai.files.del(file.id);
    }
  }
}
```

---

## Resumen de Endpoints

| Operación | Método | Endpoint |
|-----------|--------|----------|
| Crear VS | POST | `/v1/vector_stores` |
| Listar VS | GET | `/v1/vector_stores` |
| Recuperar VS | GET | `/v1/vector_stores/{vs_id}` |
| Modificar VS | POST | `/v1/vector_stores/{vs_id}` |
| Eliminar VS | DELETE | `/v1/vector_stores/{vs_id}` |
| Buscar | POST | `/v1/vector_stores/{vs_id}/search` |
| Crear archivo | POST | `/v1/vector_stores/{vs_id}/files` |
| Listar archivos | GET | `/v1/vector_stores/{vs_id}/files` |
| Recuperar archivo | GET | `/v1/vector_stores/{vs_id}/files/{file_id}` |
| Actualizar archivo | POST | `/v1/vector_stores/{vs_id}/files/{file_id}` |
| Contenido archivo | GET | `/v1/vector_stores/{vs_id}/files/{file_id}/content` |
| Eliminar archivo | DELETE | `/v1/vector_stores/{vs_id}/files/{file_id}` |
| Crear batch | POST | `/v1/vector_stores/{vs_id}/file_batches` |
| Recuperar batch | GET | `/v1/vector_stores/{vs_id}/file_batches/{batch_id}` |
| Cancelar batch | POST | `/v1/vector_stores/{vs_id}/file_batches/{batch_id}/cancel` |
| Listar archivos batch | GET | `/v1/vector_stores/{vs_id}/file_batches/{batch_id}/files` |
| Subir archivo | POST | `/v1/files` |
| Eliminar archivo | DELETE | `/v1/files/{file_id}` |

---

## Referencias

- [OpenAI API Reference - Vector Stores](https://platform.openai.com/docs/api-reference/vector-stores)
- [OpenAI File Search Guide](https://platform.openai.com/docs/assistants/tools/file-search)
- [OpenAI SDK TypeScript](https://github.com/openai/openai-node)
