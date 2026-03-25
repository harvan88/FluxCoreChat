---
id: "activity-indicator"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/chat/ActivityIndicator.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Visualizador Dummy puramente representativo" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Indicador CSS de Estados Activos de Humanos" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Delays escalonados de CSS pulses" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 💬 ActivityIndicator

## 🎯 Propósito
La clásica "Burbujita de los 3 puntos" de Whatsapp. Proporciona micro-feedback de presencia para dar vida a los clientes conectados comunicando si están tipeando frenéticamente o enviando un audio.

## 📦 Estado y Datos
Puramente funcional. Recibe una Props restringida en TypeScript: `activity: 'typing' | 'recording' | 'idle'`.

## 🔄 Flujos de Interacción
1. **Animación Secuencial:** En el estado `'typing'`, utiliza tres bolitas `•` (span) y les aplica colas de espera en CSS `delay-150`, y `delay-300` junto con una animación de latido para hacer el rebote. En estado `'recording'`, planta un micrófono que pulsa en opacidad.

## 💡 Ejemplo de Uso
```tsx
<div className="chat-header">
  Juan Perez
  <ActivityIndicator activity={userPresence === 1 ? 'typing' : 'idle'} />
</div>
```
