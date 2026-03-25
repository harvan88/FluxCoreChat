---
id: "media-orchestrator-service"
type: "orchestration-service"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/media-orchestrator.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Core Event Bus, AudioEnrichmentService, AssetRegistry, MessageService" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Orquestador de Tuberías de Procesamiento de Medios" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Event listening (Ready/Linked), Audio detection, Transcription triggering, Enrichment state check" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ MediaOrchestratorService

## 🎯 Propósito
Este servicio es el encargado de observar los eventos del sistema relacionados con archivos y disparar las cadenas de procesamiento necesarias. Es un "Reactive Dispatcher" que conecta la llegada de un archivo con su enriquecimiento semántico.

## 🚥 Tubería de Audio (Whisper Pipeline)
Cuando un archivo es marcado como `ready` o es `linked` a un mensaje, el orquestador:
1.  **Analiza MIME Type**: Busca patrones de audio (`audio/*`) o contenedores comunes de voz (`video/webm`).
2.  **Validación de Mensaje**: Verifica si el mensaje receptor ya posee una transcripción para evitar doble gasto de tokens y procesamiento.
3.  **Trigger Transcripción**: Invoca al `AudioEnrichmentService` para convertir la voz en texto y inyectarla directamente en el hilo de conversación.

## 📡 Manejo de Eventos
-   **`asset:ready`**: Dispara procesos generales de análisis (como thumbnails o extracciones de texto).
-   **`asset:linked`**: Dispara procesos específicos al contexto de un mensaje (como transcripciones de notas de voz).
-   **Error Handling**: Emite `asset:enrichment_failed` si la tubería de procesamiento se interrumpe, permitiendo degradación elegante en la UI.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { mediaOrchestratorService } from 'apps/api/src/services/media-orchestrator.service.ts';

// Ejemplo de invocación típica
const result = await mediaOrchestratorService.execute(params);
```
