---
id: "pillar-rag"
type: "pillar"
status: "stable"
criticality: "high"
location: "apps/api/src/services/rag.service.ts"
---

# Pilar RAG - Retrieval Augmented Generation

**Ubicación:** `apps/api/src/services/rag.service.ts`  
**Propósito:** Proveer búsqueda semántica y recuperación de conocimiento para runtimes  
**Tipo:** System Pillar  

---

## 🎯 Propósito Principal

El Pilar RAG permite que los asistentes accedan a conocimiento almacenado en vector stores para enriquecer sus respuestas con información relevante y actualizada.

---

## 🏗️ Arquitectura

### Componentes:
- **Vector Store Manager:** Gestión de múltiples vector stores
- **Embedding Service:** Generación de embeddings
- **Retrieval Engine:** Búsqueda semántica
- **Chunk Manager:** Gestión de chunks de documentos

---

## 🔗 Integración con Sistema

### 1. Schema DB:
- `fluxcore-rag-configurations.ts` - Configuración RAG
- `fluxcore-vector-stores.ts` - Almacenamiento vectorial
- `fluxcore-document-chunks.ts` - Chunks de documentos

### 2. Runtimes:
```typescript
// AsistenteLocal puede declarar 'search_knowledge'
const tools = ['search_knowledge', 'send_template'];
// FluxCore ejecuta la búsqueda RAG
```

---

## 🔄 Flujo de Retrieval

```
Query → Embedding → Vector Search → Top K Results → Context → LLM → Response
```

---

## 📋 Estado Actual

- **⚠️  Servicio no encontrado en análisis de código**
- **✅ Schema implementado**
- **✅ Configuración disponible**
- **⚠️  Puede estar en implementación**

---

## 🚨 Notas Importantes

- **Knowledge Base:** Acceso a información actualizada
- **Semantic Search:** Búsqueda por significado, no solo palabras
- **Configurable:** Por asistente y por cuenta
- **Extensible:** Soporte para múltiples vector stores
