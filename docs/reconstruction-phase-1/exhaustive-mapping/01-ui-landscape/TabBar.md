---
id: "tab-bar"
type: "ui-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/panels/TabBar.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Hunde sus garras en `usePanelStore` (Zustand) The Dynamic Totem" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "IDE-Like Header Nav" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Eventos Nativos de Drag and Drop (onDragStart, e.dataTransfer)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🗂️ TabBar

## 🎯 Propósito
PARTE 11 DEL TOTEM GEOMÉTRICO (Dynamic Container). Pinta la faja superior horizontal que envuelve un contenedor de paneles. Su característica estrella es el mapeo e iteración de `<TabItem/>` dotándole de capacidades arrastrables como un IDE (VSCode style) y los tres botones maestros de control de ventana: Pin 📌, Maximize ⤢ y Close ✕.

## 📦 Estado y Datos
**Reactivismo Cruzado:**
- Su estado Drag es frágil. Inyecta payloads codificados en el DOM `e.dataTransfer.setData('text/plain', JSON.stringify(...))` para permitir que al soltar una pestaña en un contenedor ajeno, todo el layout del React Redibuje sus ramas.

## 🔄 Flujos de Interacción
1. **Mapeo de Íconos Automagico:** Intenta forzar que las pestañas tengan hermosos íconos basados en su nomenclatura lógica de nacimiento (`tab.icon` string, o por `type="chat"` -> `MessageSquare`).
2. **Auto-Cierre Protectivo:** Contiene la defensa `if (containers.length <= 1) return;` que oscurece el bóton cerrar [X], denegando matemáticamente la destrucción visual del IDE previniendo un Crash (Blank screen of Death).

## 💡 Ejemplo de Uso
```tsx
<TabBar container={containerObject} />
```
