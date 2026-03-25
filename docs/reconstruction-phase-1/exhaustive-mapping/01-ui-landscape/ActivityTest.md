---
id: "activity-test"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/debug/ActivityTest.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Acoplado a useWebSocket hook" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "HUD de Debugging de Puertos WSS" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Renderiza estáticamente un Overlay ZIndex 1000" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🐛 ActivityTest

## 🎯 Propósito
Componente exclusivamente utilizado para Diagnóstico (Debug HUD). Flota sobre la pantalla ignorando todo Layout y permitiendo forzar el registro de la salud del túnel bidireccional de WebSockets. 

## 📦 Props
| Prop | Tipo | Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| (ninguna) | N/A | No | Componente de diagnóstico sin propiedades externas. |

## 🔄 Flujos de Interacción
1. **Volcado a Consola:** Cualquier impulso de actividad de tipeo o presencia lo tira sin piedad hacia `console.log` para que un desarrollador pueda trazar si los bytes están fluyendo a través de Redis/SocketIO en la red local.

## 💡 Ejemplo de Uso
```tsx
import { ActivityTest } from '../../components/debug/ActivityTest';

{import.meta.env.DEV && <ActivityTest />}
```
