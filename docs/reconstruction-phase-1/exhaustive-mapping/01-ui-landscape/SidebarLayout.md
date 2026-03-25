---
id: "sidebar-layout"
type: "ui-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/ui/SidebarLayout.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Contenedor atómico para Sidebars de extensión o Módulos" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Layout Canónico Unificado" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Despacha Headers, Footers Fixos, Scrollers y Pin Locks de forma modular" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🎨 SidebarLayout (FC-412)

## 🎯 Propósito
Proveer la estandarización CSS rígida que unifica cualquier UI incrustado en los Barras Laterales. Concede que el creador de una extensión jamás tenga que lidiar con z-index, desbordes overflow o alineación de iconos Pinned, cediéndole la estructura: `Header | SearchBar? | ScrollableBody | Footer?`.

## 📦 Estado y Datos
**UI Tonto (Dumb Props):**
- Cero lógica matemática adyacente. Únicamente toma switches visuales (Ej: `isEmpty`, `loading`, `showPinButton`) pasándole al CSS responsivo la inyección para deformar la caja sin crashear.

## 🔄 Flujos de Interacción
1. **Componentes Granulares Acoplados:** Incluye Exportaciones menores suplementarias dentro del mismo archivo (`SidebarSection` y `SidebarItem`) permitiéndote contruir un menu en cascada que obedezca rigurosamente el estilo global. SidebarSection provee sub-headers colapsables (Acordeón).

## 💡 Ejemplo de Uso
```tsx
import { SidebarLayout, SidebarItem } from '../../components/ui/SidebarLayout';

<SidebarLayout title="Avanzado" showSearch onSearchChange={filterMenu}>
   <SidebarItem label="Network" active />
   <SidebarItem label="Seguridad" disabled />
</SidebarLayout>
```
