---
id: "flux-core-composer"
type: "smart-component"
status: "stable"
criticality: "critical"
location: "apps/web/src/extensions/fluxcore/components/FluxCoreComposer.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Invoca API, useUIStore, usePanelStore, Hooks de IA" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Teclado Multimodal IA Supremo y Complejo" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Control Multi-capa y delegador de anexos multimedia paralelos" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 FluxCoreComposer

## 🎯 Propósito
Es, indudablemente, el "Gran Corazón de Carga" (El Input Box) masivo donde suceden todas las ingestas del usuario en modo chat. No es una simple cajita de texto. Es un Composer Multimodal absoluto encapsulando dentro subcomponentes monstruosos: Grabación de voz en caliente, adjuntos, selector de Emojis, despliegue de IAs automatizadas (Supervisado/Off/Automático), colas gráficas temporales en fila para enviar (`queuedMedia`), integraciones fotográficas (`CameraCaptureModal`) y rastreo de inactividad (`Idle/Typing`).

## 📦 Estado y Datos
**Acople Supremo con Múltiples Motores:**
- Suscrito en vivo sobre `useAutomation`, `useAIStatus` sondeando en tiempo de vida el Permiso que tiene esta cuenta y su Status HTTP contra proveedores como OpenAi/Groq (`connected === false`, `entitled === true`).
- Conserva la volatilidad del progreso en subidas mediante arrays `queuedMedia[]` reteniendo identidades previas como Audio Waveforms, MimeTypes y URLs provisionales.

## 🔄 Flujos de Interacción
1. **Radar Perimetral Predictivo de Estatus IA (`aiBlockInfo`):** Este hook computado masivo (`useMemo`) analiza activamente. Si encuentra el más mínimo error corporativo (Ej. Cliente no pagó Entitlements en AdminPanel, Plugin Deshabilitado, Token API rechazada), forzará el pintado de Barricadas Visuales Superiores de Advertencia Amarilla bloqueando la mutación de Modos Automáticos para prevenir envíos de la nada que caerían al vacío.
2. **Máquina Enrutadora Multi-Pila Discreta:** Contempla 4 vías de rendereo final dependiendo quién esté interrumpiendo o liderando temporalmente:
   - Panel de Modos IA (Si interpelamos su logo)
   - Panel Visual Grabadora Ondulante (Pisa toda el área dejando mudo el input box)
   - Discos Estáticos Sugeridos IA (Modo Sugerir/Supervisado actuando)
   - Rendereo Clásico Nativo (`textarea` con botones adjuntos estándar)
3. **Flujograma de Embebido Gráfico (`buildMediaFromResult`):** Al detectar disparos de Componentes Menores (Como cliquear Documento en `AttachmentPanel`), canaliza los File de JS puro, invoca forzosamente el método red (`uploadAsset`) dictaminado desde componentes Cánopy más altos y convierte esa firma exitosa de servidor en Píldoras gráficas adjuntas de color gris sobre el input con la crucecita X a la espera de un Enter decisivo del usuario humano junto a sus escritos.

## 💡 Ejemplo de Uso
```tsx
import { FluxCoreComposer } from '../../extensions/fluxcore/components/FluxCoreComposer';

<FluxCoreComposer 
    value={textoBorra} 
    onChange={setTexto}
    accountId="usr_core99"
    disabled={locked}
    uploadAsset={engineS3Uploader}
    uploadAudio={audioTranscriptorStream}
    onSend={dispatchFinalSockedBundle}
    isSending={mutation.isLoading}
/>
```
