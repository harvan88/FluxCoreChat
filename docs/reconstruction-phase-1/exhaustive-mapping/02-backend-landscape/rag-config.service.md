---
id: "rag-config-service"
type: "infrastructure-service"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/rag-config.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (ragConfigurations)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Políticas de Conocimiento (RAG-003)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Effective config resolution, Hierarchical fallbacks, Persistence of tuning parameters, Default config management" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ RAGConfigService

## 🎯 Propósito
Este servicio gestiona los parámetros técnicos que gobiernan cómo la IA lee y recupera información. Actúa como el panel de control para ajustar la precisión y el rendimiento del sistema RAG.

## 🚥 Resolución Jerárquica
El servicio decide qué configuración aplicar siguiendo esta prioridad:
1.  **Asset Specific**: Configuración aplicada directamente a un Vector Store.
2.  **Account Default**: Configuración global definida por la cuenta para todos sus assets.
3.  **System Default**: Valores de fábrica `DEFAULT_RAG_CONFIG` (Recursive 512/50, OpenAI-3-Small).

## 🧬 Parámetros Gestionados
-   **Chunking**: Estrategia, tamaño, solapamiento y separadores.
-   **Embedding**: Proveedor, modelo y dimensiones del vector.
-   **Retrieval**: `topK` (cuántos fragmentos), `minScore` (calidad mínima) y `maxTokens` (límite de contexto).
-   **Processing**: Soporte para OCR, extracción de metadatos y tipos de archivos permitidos.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { ragConfigService } from 'apps/api/src/services/rag-config.service.ts';

// Ejemplo de invocación típica
const result = await ragConfigService.execute(params);
```
