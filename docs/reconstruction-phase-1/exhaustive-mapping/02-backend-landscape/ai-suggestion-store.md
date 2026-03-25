---
id: "ai-suggestion-store"
type: "infrastructure-service"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/ai-suggestion-store.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (aiSuggestions)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Persistencia Efímera y Auditoría de Sugerencias" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "In-memory caching (fast read), Fire-and-forget DB sync, Status tracking (Pending/Approved/Rejected/Edited), Content auditing" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AISuggestionStore

## 🎯 Propósito
Maneja el almacenamiento y el estado de las sugerencias generadas por la IA. Actúa como un búfer que permite latencia ultra baja para el frontend (vía caché en memoria) mientras garantiza que cada sugerencia quede registrada para auditoría y entrenamiento futuro en la base de datos.

## 🚥 Estados de la Sugerencia
1.  **`pending`**: Recién enviada al frontend, esperando acción humana.
2.  **`approved`**: El humano aceptó la sugerencia tal cual.
3.  **`rejected`**: El humano descartó la sugerencia.
4.  **`edited`**: El humano modificó el texto antes de enviarlo.

## ⚡ Estrategia de Persistencia
-   **Hot-Path (In-Memory)**: Las sugerencias se guardan en un `Map` para recuperaciones instantáneas por ID.
-   **Fire-and-Forget (DB)**: Las escrituras en disco se realizan de forma asíncrona sin bloquear el flujo principal ("fire-and-forget"). Si una escritura falla, se loggea el error sin interrumpir la experiencia del usuario.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: ai-suggestion-store
import { aiSuggestionStore } from 'apps/api/src/services/ai-suggestion-store.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await aiSuggestionStore.process(input);
```
