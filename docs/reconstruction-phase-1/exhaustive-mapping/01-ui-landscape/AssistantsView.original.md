---
id: "assistants-view-original"
type: "legacy-ui"
status: "deprecated"
criticality: "low"
location: "apps/web/src/components/fluxcore/views/AssistantsView.original.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Identificado como archivo original base" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Lógica de activación de asistentes" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Versión de referencia para lógica de composición" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Manejo de DoubleConfirmationDelete y OpenAIIcon" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📜 AssistantsView (Original)

## 🎯 Propósito
Archivo fuente original que sirvió de base para el `AssistantsView` actual. Contiene la lógica primigenia de activación de asistentes (`/activate`) y la integración inicial con el `OpenAIIcon`.

## 📦 Estado y Datos
Estructura de datos alineada con la primera iteración de la base de datos de FluxCore. Incluye metadatos de tokens usados y tamaño de assets que sirvieron para diseñar el dashboard de monitoreo.

## 🔄 Flujos de Interacción
1. **Activación de un Click:** Implementaba el endpoint `POST /activate` que transmutaba el estado de un asistente de 'draft' a 'active'.
2. **Runtime Modal:** Presentaba la primera implementación del selector de Runtime (Local vs OpenAI).

## ⚠️ Nota de Mantenimiento
Documentado para asegurar que los flujos de 'Activación' no se pierdan durante la migración a la arquitectura de microservicios.

## 💡 Ejemplo de Uso
```tsx
// Uso del componente AssistantsView.original
import { AssistantsView.original } from '@/components/AssistantsView.original';

function Example() {
  return <AssistantsView.original />;
}
```
