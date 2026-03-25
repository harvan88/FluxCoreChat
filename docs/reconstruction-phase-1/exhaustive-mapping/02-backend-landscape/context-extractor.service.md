---
id: "context-extractor-service"
type: "logic-service"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/context-extractor.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Karen Extension" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Bridge de Extracción Semántica" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Internal re-exporting" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ ContextExtractorService

## 🎯 Propósito
Este servicio actúa como un **Bridge (Puente)** hacia la lógica de extracción semántica implementada en la extensión **Karen** (Website Builder). Permite que el backend de la API utilice capacidades avanzadas de análisis de documentos e identificación de FAQ/Servicios mediante la reutilización del código de la extensión.

## 🧊 Funcionalidad Delegada
El servicio re-exporta tipos y funcionalidades críticas para:
- **Identificación de FAQ**: Extraer parejas de pregunta-respuesta de textos brutos.
- **Análisis de Servicios**: Identificar catálogos de servicios en documentos de negocio.
- **Contexto Semántico**: Generar resúmenes estructurados listos para ser consumidos por la IA.

## 💡 Nota de Implementación
Este archivo es un ejemplo de cómo FluxCore facilita la interoperabilidad entre el núcleo (Core) y las extensiones, permitiendo que la lógica propietaria de una extensión (como las heurísticas de Karen) sea inyectada y utilizada en otras partes del sistema sin duplicar código.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { contextExtractorService } from 'apps/api/src/services/context-extractor.service.ts';

// Ejemplo de invocación típica
const result = await contextExtractorService.execute(params);
```
