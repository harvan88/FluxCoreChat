---
id: "chunking-service"
type: "infrastructure-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/chunking.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "RAGConfigService" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Servicio de Fragmentación de Texto (RAG-003)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Strategy registry, Recursive splitting, Sentence/Paragraph detection, Fixed size chunking, Token count approximation" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ ChunkingService

## 🎯 Propósito
El `ChunkingService` se encarga de dividir documentos extensos en fragmentos más pequeños y manejables (chunks). Este paso es vital para el proceso RAG, ya que permite indexar partes específicas del texto y recuperarlas sin exceder los límites de memoria de los modelos de IA.

## 🚥 Estrategias de Fragmentación
1.  **Recursive (Defecto)**: Intenta dividir jerárquicamente usando separadores lógicos (`\n\n`, `\n`, `. `, ` `), preservando la estructura del documento.
2.  **Fixed**: Divide el texto rígidamente por número de tokens con un solapamiento (`overlap`) para evitar perder contexto entre fragmentos.
3.  **Sentence/Paragraph**: Utiliza expresiones regulares para asegurar que cada fragmento termine en un punto y aparte o en un cambio de párrafo.

## 🧬 Configuración Dinámica
El servicio consulta la configuración efectiva del Vector Store para aplicar los parámetros de `sizeTokens`, `overlapTokens` y `separators` específicos para cada conjunto de datos, permitiendo optimizar el chunking según el tipo de documento (manuales técnicos vs. literatura libre).

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { chunkingService } from 'apps/api/src/services/chunking.service.ts';

// Ejemplo de invocación típica
const result = await chunkingService.execute(params);
```
