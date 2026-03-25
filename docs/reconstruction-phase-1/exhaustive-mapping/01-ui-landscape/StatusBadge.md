---
id: "status-badge"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/fluxcore/shared/StatusBadge.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Depende de Base UI `<Badge>`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Traductor de Enums a Pixeles" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Switch-Case gigante `active`, `disabled`, `expired`" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🏷️ StatusBadge

## 🎯 Propósito
Centralizar la lógica de negocio visual. Si un API devuelve `status: "expired"`, en lugar de dejarle la responsabilidad a cada programador Front de elegir el color, `StatusBadge` se asegura que SIEMPRE aparezca como un badge *Rojo (error)* con el texto castellanizado a "Expirado".
## 🧰 Props
- `status` (AnyStatus, Requerido): String arbitraria de control que será reducida en el conmutador interno (Ej. `'active'`, `'disabled'`, `'expired'`).
- `className` (string, Opcional): Margen y Flexbox tailwind superior inyectado.

## 📦 Estado y Datos
Puramente funcional. Intercepta un tipo genérico que abarca los estados de los Asistentes, Toolings o Vector Stores.

## 🔄 Flujos de Interacción
1. **Fallback Amigable:** Si un programador de Backend mete un estado loco o mal tipeado como "limbo", el switch caerá en su `default:` devolviendo un Badge de advertencia amarillo pero escupiendo libremente el string desconocido permitiendo debugeo visual silencioso.

## 💡 Ejemplo de Uso
```tsx
<StatusBadge status={assistantData.status} className="ml-auto" />
```
