---
id: "ai-suggestion-card"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/extensions/AISuggestionCard.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Despacha al Chat Principal usando hooks de aprobación local" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Componente de UI del Motor de Trabajo Supervisado (Human-In-The-Loop)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Edición Inline, Textarea auto-resize, Gestión Mutadora del Payload Raw" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ✨ AISuggestionCard

## 🎯 Propósito
(El puente del Piloto Semi-Automático). Cuando la IA no tiene permitido despachar al cliente final, esculpe su respuesta y te la presenta en esta Tarjeta Elevada Púrpura. Su trabajo es permitirte rechazar el trabajo (Descartar), despacharlo tal cual está (Enviar) o meterle mano editando crines y sintaxis (Editar) antes de certificarlo. Acompañado del hook exportado `useAISuggestions`.

## 📦 Estado y Datos
1. **Pizarra Magnética (`isEditing` / `editedText`):** Muta la tarjeta convirtiendo el párrafo estático en un Mega `<textarea>` inyectando la sugerencia original de la IA permitiendo re-escribir su pensamiento por completo localmente.
2. **Auto-Bloqueo de Fantasma (`autoState`):** Posee barreras de cristal si adivina que está atada a un motor automático, deshabilitando botones manuales para prevenir carreras (Race Conditions) con FluxCore enviando solo.

## 🔄 Flujos de Interacción
1. **Desplegables Meta-cognitivos (Reasonings):** El cerebro IA a menudo anexa variables `reasoning` ("Digo esto porque en base de conocimientos dice bla bla") o `alternatives`. Este componente esconde esa data bajo botones Collapsables silenciosos para no asustar al agente, revelándola solo si presiona "Ver razonamiento".

## 💡 Ejemplo de Uso
```tsx
{suggestions.map(sug => (
  <AISuggestionCard 
     key={sug.id} 
     suggestion={sug} 
     onApprove={(text) => handleSendApproved(sug.id, text)} 
  />
))}
```
