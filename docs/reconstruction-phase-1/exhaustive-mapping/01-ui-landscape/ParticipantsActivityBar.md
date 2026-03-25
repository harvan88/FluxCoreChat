---
id: "participants-activity-bar"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/chat/ParticipantsActivityBar.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Acoplado internamente con ActivityIndicator" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tracker Visual de Eventos WSS Telemetry" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Renderiza iteraciones de map()" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🎨 ParticipantsActivityBar

## 🎯 Propósito
Tira de visibilidad UI (El equivalente al cartel "Menganito está escribiendo..."). Recibe un dictado en vivo de eventos capturados de la matriz global de WebSockets para avisarle a los interlocutores que alguien está tecleando o en proceso de grabación.
## 🧰 Props
- `activities` (Record<string, ActivityType>, Requerido): Diccionario vivo. Llaves como 'Ids de usuario' asociadas a Valores literales ('typing' | 'recording' | 'idle').

## 📦 Estado y Datos
**Depurador Nulo:**
- Aplican un corta-fuegos temprano (`if (!activities) return null`) previniendo crasheos de página completos por iteraciones de objetos indefinidos que pudieran ser arrojados durante retardos de red P2P.

## 🔄 Flujos de Interacción
1. **Desechado Automático Inerte:** Se asegura de filtrar salvajemente limpiando el arreglo con obj entries `filter(([_, activity]) => activity !== 'idle')`. Desapareciendo el componente completo sí todos pasaron a estar de brazos cruzados, colapsando el DOM hasta que alguien apriete un pad.

## 💡 Ejemplo de Uso
```tsx
import { ParticipantsActivityBar } from '../../components/chat/ParticipantsActivityBar';

<ParticipantsActivityBar activities={{"user1": "typing"}} />
```
