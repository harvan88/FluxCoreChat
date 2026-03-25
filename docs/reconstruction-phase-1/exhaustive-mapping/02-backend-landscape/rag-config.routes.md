---
id: "rag-config-routes"
type: "api-routes"
status: "stable"
criticality: "medium"
location: "apps/api/src/routes/rag-config.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "RAGConfigService, AuthMiddleware" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API de Configuración de Tubería RAG" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Chunking strategy setup (token size/overlap), Embedding provider/model selection, Retrieval heuristics tuning (TopK/MinScore), Configuration persistence per Vector Store" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ RAG Config Routes

## 🎯 Propósito
Las `RAG Config Routes` permiten el ajuste fino (fine-tuning operativo) de la tubería de recuperación de información. Controlan los parámetros técnicos que deciden cómo los documentos se fragmentan, cómo se indexan y con qué rigor se recuperan para ser presentados a la IA.

## 🚥 Capas de Configuración
La API organiza los ajustes en tres bloques lógicos:
1.  **Chunking**: Define la estrategia de división de documentos (tamaño de tokens y solapado/overlap) para mantener la semántica coherente.
2.  **Embedding**: Selección del proveedor (OpenAI/Local) y modelo de vectorización.
3.  **Retrieval**: Ajuste de los umbrales de búsqueda (`topK` para cantidad de resultados y `minScore` para relevancia mínima aceptable).

## 🧬 Persistencia Inteligente
El servicio gestiona la transformación entre el formato de la interfaz de usuario (simplificado) y los objetos de configuración complejos requeridos por los servicios de procesamiento de documentos en segundo plano, asegurando que los valores por defecto sensatos se inyecten automáticamente si no se especifican.

## 🛡️ Seguridad por Inquilino
Cada configuración está estrictamente vinculada a un `vectorStoreId` y validada contra un `accountId`, garantizando que un usuario no pueda alterar las estrategias de indexación de bases de conocimiento que no le pertenecen.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './rag-config.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/rag/config', router);
```
