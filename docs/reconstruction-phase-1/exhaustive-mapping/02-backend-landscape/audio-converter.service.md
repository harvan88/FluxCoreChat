---
id: "audio-converter-service"
type: "logic-service"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/audio-converter.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FFmpeg (CLI), Bun Runtime" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Transcodificación Multimedia" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Format normalization (WebM to MP3/OGG), Temp file management, FFmpeg orchestration" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AudioConverterService

## 🎯 Propósito
Este servicio proporciona las capacidades de "normalización" de formatos de audio dentro del backend. Su función principal es convertir formatos capturados comúnmente en navegadores (como WebM) a formatos estándares requeridos por proveedores de IA (OpenAI Whisper espera MP3) o canales de mensajería (WhatsApp prefiere OGG/Opus).

## 🛠️ Integración con FFmpeg
El servicio utiliza **FFmpeg** a través de procesos secundarios (`spawn`) como motor de transcodificación.
- **Normalización a MP3:** Ajusta el audio a 44100Hz, mono canal y 128k de bitrate para un balance óptimo entre peso y calidad para transcripción.
- **Normalización a OGG:** Utiliza el codec `libopus` a 64k, ideal para notas de voz en aplicaciones móviles.

## 📦 Gestión de Temporales
Implementa una política de limpieza estricta (Patrón `Finally`). Los archivos de entrada y salida se guardan en un directorio `/temp` local y se eliminan inmediatamente después de que el buffer resultante ha sido cargado en memoria, evitando fugas de almacenamiento en el servidor.

## 🚀 Optimizado para Bun
Utiliza las APIs nativas de **Bun** (`Bun.write`, `Bun.file`) para realizar operaciones de lectura/escritura de archivos de forma mucho más rápida que los módulos estándar de Node.js, reduciendo la latencia percibida en el envío de notas de voz.

## 💡 Casos de Uso
1. **Whisper Compatibility:** Convertir el `*.webm` del micrófono del navegador a `*.mp3`.
2. **Channel Bridging:** Convertir audios recibidos de fuentes heterogéneas a un formato único consumible por todas las extensiones de FluxCore.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { audioConverterService } from 'apps/api/src/services/audio-converter.service.ts';

// Ejemplo de invocación típica
const result = await audioConverterService.execute(params);
```
