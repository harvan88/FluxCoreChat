---
id: "template-card"
type: "ui-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/templates/TemplateCard.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Consume `DoubleConfirmationDeleteButton`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Fila Especializada de Plantilla (Quick Reply)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Calculos de fechas, Mapeo Categorico inverso, Sub-eventos Flotantes" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🎟️ TemplateCard

## 🎯 Propósito
(Pese a su nombre *Card* esto se renderiza internamente como un `<tr>` *Table Row*). Constituye cada una de las tiras horizontales vistas dentro del Gestor de Canned Responses / Plantillas del sistema, mostrando micro-estadísticas y previas del contenido crudo. 
## 🧰 Props
- `template` (Template, Requerido): El objeto unificado de base de datos a renderizar (`name`, `content`, `tags`).
- `isSelected` (boolean, Opcional): Cambia sutilmente el fondo para iluminar la selección actual.
- `onSelect` (function, Requerido): Notificación para Single-Click.
- `onEdit` (function, Requerido): Notificación para Double-Click o botón lápiz.
- `onDelete` (function, Requerido): Delegado destructivo.
- `onDuplicate` (function, Requerido): Clonador.

## 📦 Estado y Datos
100% Sin Estado lógico, recibe la iteración única `template: Template`.

## 🔄 Flujos de Interacción
1. **Hover Flotante de Controles:** El último celo de la tabla oculta y despliega mágicamente una bandeja de botoncillos (Pencil/Edit, Copy/Duplicate, Trash/Delete) basando puramente su toggle en clases CSS `.group-hover:opacity-100`.
2. **Doble Binding Mouse:** Ofrece comodidad extraña permitiendo picarle un click (`onSelect` pidiendo Pre-visuallizarlo) o un rabioso doble click seguido (`onDoubleClick`) abriendo forzadamente el modal gigante de edición.

## 💡 Ejemplo de Uso
```tsx
<tbody>
  {templates.map(tmp => (
     <TemplateCard template={tmp}
       onDelete={() => invokeDeleteWorkflow(tmp.id)}
     />
  ))}
</tbody>
```
