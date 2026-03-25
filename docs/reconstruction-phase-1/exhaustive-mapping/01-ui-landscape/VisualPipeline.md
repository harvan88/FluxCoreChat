---
id: "visual-pipeline"
type: "smart-component"
status: "stable"
criticality: "critical"
location: "apps/web/src/components/monitor/VisualPipeline.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Consumidor Nativo de `/ws` Telemetry Stream" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Panel de Auditoría del Ciclo Cognitivo de Mensajes" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Live WS Parsing, 7-Step Render Node, Captura de Errores de Inteligencia" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 👁️‍🗨️ VisualPipeline

## 🎯 Propósito
(Live Cognitive Pipeline). Un monitor de tiempo real al estilo AWS X-Ray o Datadog. Escupe visualmente el viaje de 7 fases (`Ingreso -> Proyección -> Worker -> Dispatcher -> Runtime -> Certificación -> Entrega`) de CADS mensaje en vivo a través de un WebSocket que escucha todo el Kernel.

## 📦 Estado y Datos
**Buffer de Trazas (`traces: Record<string, PipelineTrace>`):**
- Acumula en memoria los mensajes disparados. Intercepta frames WSS `telemetry:pipeline_step` haciendo Deep-Merging mágico (`...currentTrace.steps`) sobreescribiendo en vivo el status del paso que la IA logre pasar sin morirse.

## 🔄 Flujos de Interacción
1. **El Conector Latidor (`renderConnector`):** Dibuja lógicamente barras visuales entre cada "burbuja" de los pasos. Si un paso truena (error), la barra se tiñe de rojo en ese puente. Si el motor está pensando, la barra late amarilla (`animate-pulse`).
2. **Inspector de Fallbacks y Portapapeles:** Cuenta con artillería pesada para exportar telemetría. Invoca un Hack `copyViaFallback` con textareas fantasma en el Body para robar una traza JSON hacia el ClipBoard del inspector en caso que el API de Navegador falle. 

## 💡 Ejemplo de Uso
```tsx
<Route path="/monitor/pipeline" element={<VisualPipeline />} />
```
