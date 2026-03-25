---
id: "audio-recorder-panel"
type: "smart-component"
status: "stable"
criticality: "critical"
location: "apps/web/src/components/chat/AudioRecorderPanel.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Usa HTML5 Audio API (MediaRecorder, AudioContext) profundo del sistema" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Ingeniería Completa de Captación/Dibujo y Empaquetado de Sonido Local" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Normalización WEBM/OPUS MIME, Render Canvas 60FPS a Manom Análisis de Frecuencias (FFT)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🎤 AudioRecorderPanel

## 🎯 Propósito
Es una monstruosidad de Ingeniería de Client-Side Frontend capaz de interceptar hardware (Micrófono) usando Permisos SO, procesar la data Analógica-Digital usando Contextos de Audio Web, envasar esos pedazos usando Blobs de WebM y finalmente renderizarlos 60 veces por segundo sobre Canvases HTM5 simulando ondas de latido visuales tipo Ableton Live o Telegram.

## 📦 Estado y Datos
**Decenas y Decenas de Refs y Memorias:**
- No confía en estado de React por velocidad (`streams`, `MediaRecorder`, `Chunks`). Maneja memoria en `useRef` para atajar porquerías de Memoria del Browser y garantizar liberaciones Limpiezas (`gc`) con `stopEverything()` cuando se oculta, evitando fugar y quemar el micrófono encendido (Luz roja SO apagada 100%) del celular del usuario permanentemente .

## 🔄 Flujos de Interacción
1. **Danza de MimeTypes (`pickAudioMimeType`):** Safari/iOS escupe OGG, Chrome ama WEBM. Este Script rastrea compatibilidad decodificadora, inyecta su sugerencia (`opus`) y uniforma a `File` al devolver la promesa.
2. **Motor Visual (El Analizador de Dominios):** Crea su propio `AudioContext` en memoria virtual separada. Acopla el `MediaStreamSource` a un Node de Analizador de Espectros (FFTSize). Luego un Bucle de Rendimiento altísimo (`requestAnimationFrame`) le pregunta a la Tarjeta Dispositiva: *"¿En qué frecuencia está mi onda?"*, devorando la Array de Amplitud (Uint8), calculando un Techo Geométrico y dibujando líneas puras con `ctx.stroke` con escala a Retina Pixel Density `devicePixelRatio`, garantizando extrema fluidez.

## 💡 Ejemplo de Uso
```tsx
<AudioRecorderPanel 
  open={micIconIsHolding} 
  onSend={async (wavBlobFile) => await networkPostAPI(wavBlobFile)} 
  onDiscard={() => killPanelAndReleaseMic()}
/>
```
