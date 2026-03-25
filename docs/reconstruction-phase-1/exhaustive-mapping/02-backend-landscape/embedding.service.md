---
id: "embedding-service"
type: "infrastructure-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/embedding.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "RAGConfigService, OpenAI/Cohere APIs" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Centro de Vectorización Multi-Proveedor (RAG-004)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Batch embedding generation, Provider fallback logic, Cosine similarity utility, Connectivity probing" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ EmbeddingService

## 🎯 Propósito
El `EmbeddingService` es el responsable de convertir texto humano en representaciones numéricas (vectores). Actúa como una capa de abstracción sobre múltiples proveedores de embeddings, permitiendo que FluxCore sea agnóstico al modelo matemático de representación.

## 🚥 Soberanía de Proveedores
Implementa una arquitectura de plugins para soportar:
-   **OpenAI**: Modelos nativos como `text-embedding-3-small`.
-   **Cohere**: Optimizaciones multi-idioma (V3).
-   **Custom**: Soporte para modelos locales o infraestructura propietaria vía HTTP POST.

## 🧬 Resiliencia y Fallback
El servicio implementa una lógica de reintento con fallback. Si el proveedor configurado (ej. OpenAI) falla por rate limits o caída de servicio, el sistema puede intentar automáticamente con la siguiente opción en la lista de orden de fallback (`openai -> cohere -> custom`), garantizando que la ingesta de documentos no se detenga.

## ⚡ Procesamiento en Batch
Para optimizar el rendimiento y reducir el número de peticiones HTTP, el servicio agrupa los fragmentos en "Batches" de tamaño configurable, permitiendo vectorizar cientos de párrafos en una sola llamada al proveedor.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { embeddingService } from 'apps/api/src/services/embedding.service.ts';

// Ejemplo de invocación típica
const result = await embeddingService.execute(params);
```
