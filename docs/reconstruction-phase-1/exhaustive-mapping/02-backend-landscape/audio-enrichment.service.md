---
id: "audio-enrichment-service"
type: "logic-service"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/audio-enrichment.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "AudioConverterService, AssetRegistryService, CoreEventBus, OpenAI (Whisper API), Drizzle (assetEnrichments)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Transcripción y Cognición Auditiva" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Audio normalization, Whisper transcription, Enrichment persistence, Cross-service event notification" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AudioEnrichmentService

## 🎯 Propósito
El `AudioEnrichmentService` dota al sistema de la capacidad de "escuchar". Transforma mensajes de voz y archivos de audio en texto procesable, permitiendo que el motor cognitivo de FluxCore analice el contenido hablado y ejecute acciones basadas en él.

## 🚥 El Proceso de "Oído"
1.  **Normalización**: Descarga el audio desde el almacenamiento y utiliza `AudioConverterService` para estandarizarlo a formato MP3 (optimizado para Whisper).
2.  **Transcripción**: Envía el flujo de audio a la API de Whisper (OpenAI) para obtener el texto y detectar el idioma.
3.  **Persistencia**: Guarda el resultado en `asset_enrichments`, vinculando la transcripción de forma permanente al asset de audio original.
4.  **Notificación**: Emite el evento `asset:transcription_completed` a través del `CoreEventBus` para que otros servicios (como el Kernel o la UI) reaccionen al nuevo contenido.

## 🧬 Resiliencia de Origen
El servicio es capaz de procesar audio desde múltiples orígenes:
-   **Asset ID**: Recupera y descarga directamente desde el Storage Adapter configurado.
-   **URL Local**: Procesa archivos temporales en el sistema de archivos del servidor.
-   **URL Remota**: Descarga contenido desde servidores externos mediante fetch.
 village.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { audioEnrichmentService } from 'apps/api/src/services/audio-enrichment.service.ts';

// Ejemplo de invocación típica
const result = await audioEnrichmentService.execute(params);
```
