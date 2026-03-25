---
id: "suggest-response-panel"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/extensions/fluxcore/components/SuggestResponsePanel.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Integrado en Composer cuando actua mode='suggest'" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Monitor de Sugerencias Proxy-IA (Canon v8.3)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Polling Activo 4000ms, Parcheado individual API" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 SuggestResponsePanel

## 🎯 Propósito
Esquina dedicada al modo "Ghost Writer". Si la conversación está flanqueada por un Agente IA escuchando en segundo plano, la IA puede "Sugerir" en lugar de "Autocontestar". Este UI Panel se pega encima del Composer leyendo esas sugerencias al vuelo, dándole la oportunidad solemne al operador humano de Aprobar, Reescribir o Desechar el borrador inteligente antes de tocar enviar.

## 📦 Estado y Datos
**Polling Cronometrado:**
- Ejecuta una ronda de espionaje a PostgreSQL /suggestions usando Polling con `setInterval(fetchSuggestions, 4000)`. Rastrea en tiempo continuo cualquier respuesta inyectada por los workers backenders (estado: `pending`).

## 🔄 Flujos de Interacción
1. **Interceptador de Ediciones:** Ofrece un campo de Textarea para alterar levemente la sugerencia. Si tocas el botón "Editar", roba tu foco.
2. **Ciclo de Cierre Multi-estado:** Cada acción contra la card de la sugerencia (Aprobar/Desaprobar) dispara un `PATCH` silencioso alterando `status` en el DB para extinguir ese popup y disparar el `onSent()` forzando a React a verter ese mensaje a la timeline del chat global.

## 💡 Ejemplo de Uso
```tsx
import { SuggestResponsePanel } from '../../../extensions/fluxcore/components/SuggestResponsePanel';

{mode === 'suggest' && (
   <SuggestResponsePanel
       accountId={account.id}
       conversationId={activeChat.id}
       onSent={triggerUIUpdate}
   />
)}
```
