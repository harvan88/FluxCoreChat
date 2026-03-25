---
id: "camera-capture-modal"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/chat/CameraCaptureModal.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API HTML5 Nativos (MediaDevices, WebGL/Canvas toBlob)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Controlador Físico de Captación Óptica (Webcam/Camara Celular)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Alineación Condicional (Environment Ideal) Móvil, DrawImage para Snapshot en Memoria" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📸 CameraCaptureModal

## 🎯 Propósito
Es el Sistema Especializado que levanta violentamente un Modal Full-Screen y pide permisos al Operating System para invocar las Lentes del dispositivo en tiempo real. Se utiliza dentro del Pipeline de Chat para que los operadores envíen fotos en vivo a los clientes.

## 📦 Estado y Datos
Sostiene múltiples References (`useRef`) ultra complejas. Un `videoRef` encargado de vomitar la señal en vivo 30 fps de la cámara; y un `canvasRef` fantasma que es la memoria en la que congelará un Frame específico cuando la persona decida capturar.

## 🔄 Flujos de Interacción
1. **El Combate de Permisos (`getUserMedia` Fallbacks):** Primeramente lanza el comando dictaminando explícitamente `facingMode: { ideal: 'environment' }` tratando de forzar a que el Iphone/Android abra la Cámara Trasera Físico-óptica. Si no existe o el Browser de Pc no soporta ese flag de hardware, la promesa detona e invoca de inmediato un fallback pidiendo acceso estándar y ciego (`video: true`) para no fallar la UX.
2. **El "Freezing" Técnico (`handleCapture`):** Cuando clicas capturar, extrae 1 frame de la resolución nativa de hardware `video.videoWidth` (E incluso si falla la deducción, clona en 720p HD base). Derrama los pixeles contra un Canvas, inyecta algoritmos puros pidiendo la transformación JPG calidad extrema de Compresión (0.92) con `toBlob()`, libera la cámara para no seguir quemando RAM, y almacena un Objeto Físico (`File`) para ofrecer Disparar (`handleSend`).

## 💡 Ejemplo de Uso
```tsx
<CameraCaptureModal 
  open={shouldShowSelfieWindow} 
  onClose={() => setFalse()}
  onSend={(file) => apiServiceDumpingFile(file)} 
/>
```
