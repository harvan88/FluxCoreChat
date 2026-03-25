---
id: "conversation-row-ai-status"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/conversations/ConversationRowAIStatus.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Inyección de useAutomation Custom Hook combinada con AIStatusIndicator" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Micro-componente de ciclo de estado en Sidebar" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Manejo de clicks de stopPropagation" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 ConversationRowAIStatus

## 🎯 Propósito
Extracción especializada de lógica. Actúa como el cerebro controlador incrustado dentro de las tarjetas individuales del SideBar de conversaciones. Se encarga única y exclusivamente de gestionar visualmente y mutar vía Hook el "Nivel de Agresividad y Autonomía" del Asistente Bot FluxCore dentro de esa Sala concreta (Piloto Automático, Asistencia de Sugerencias, Off).
## 🧰 Props
- `accountId` (string, Requerido): Identificador del usuario.
- `relationshipId` (string, Requerido): Identificador de la relación o conversación asociada.
- `isFluxCoreEnabled` (boolean, Requerido): Indicador global de si la IA está activa.

## 📦 Estado y Datos
**Composiciones Desacopladas:**
- Evita depender en stores globales extrayendo el contexto con `useAutomation(accountId, relationshipId)`.
- Re-transmite las propiedades extraídas hacia el componente exclusivamente visual `<AIStatusIndicator />` (Patrón Smart + Dumb Components form).

## 🔄 Flujos de Interacción
1. **La Farsa Matemática Modal (Ciclo Finito):** Al operar un click directo encima del Status Tracker. Aplica un atenuador de burbujas de Red DOM (`e.stopPropagation()`) para prevenir que se seleccione y abra el Chat Accidentalmente. Acto seguido emplea una indexión por Array para ciclar modularmente los modos `auto -> suggest -> off -> auto` usando el operador residual length (`(currentIndex + 1) % modes.length`). 
2. **Propagación Asíncrona:** Emite el resultado como Promesa Vacía al motor `setRule()` inyectándole el Scope Parametral, ocasionando que la barra principal cambie simultáneamente de color y el bot empiece a obedecer la nueva restricción en microsegundos.

## 💡 Ejemplo de Uso
```tsx
import { ConversationRowAIStatus } from '../../components/conversations/ConversationRowAIStatus';

<ChatRowCard>
    <Label>{chat.name}</Label>
    <ConversationRowAIStatus 
         accountId={user.id}
         relationshipId={chat.relId}
         isFluxCoreEnabled={true}
    />
</ChatRowCard>
```
