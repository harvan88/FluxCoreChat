---
id: "standard-composer"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/chat/StandardComposer.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Invoca modales de captura (Audio, Camera, Emoji)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Núcleo de Input Textual y Multimodal Privado" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Límite de 4000 carácteres, Interceptación de Attachments, Emisión de Typing Status" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🎹 StandardComposer

## 🎯 Propósito
El motor de entrada principal (El "Chat Box") para usuarios logueados dentro de la plataforma principal. A diferencia de su homólogo pobre (`PublicProfileComposer`), este es una bestia multimodal: Soporta envío de audios grabados en vivo, tomar fotos instantáneas con webcams de escritorio, adjuntar PDFs/DOCXs, emojis, y el uso nativo de las "Plantillas (Quick Replies)".

## 📦 Estado y Datos
**Orquestador de Inputs (Virtual File Manager):**
- Gestiona localmente un array de artefactos pre-envío `queuedMedia` para renderizar unas cajitas flotantes (con "X" removible) de todo lo que el usuario subirá junto al texto antes de presionar el botón de disparo Enter.

## 🔄 Flujos de Interacción
1. **Emitidor Biológico:** Posee un `useEffect` escuchando la longitud del String o el estado activado del micrófono, disparando un `props.onUserActivity('typing' | 'recording' | 'idle')` que viaja hasta los WebSockets para hacer brincar los "..." azules en la contraparte.
2. **Atrapador de Teclado Dual:** Escucha `onKeyDown` para detectar si presionaron <kbd>Enter</kbd> (envía mensaje) o <kbd>Shift</kbd> + <kbd>Enter</kbd> (Inserta salto de linea ignorando el envío).

## 💡 Ejemplo de Uso
```tsx
<StandardComposer
    value={comDraft}
    onChange={setDraft}
    onSend={finalizeMessage}
    uploadAsset={uploadFileFn}
    uploadAudio={uploadAudioFn}
    isUploading={false}
/>
```
