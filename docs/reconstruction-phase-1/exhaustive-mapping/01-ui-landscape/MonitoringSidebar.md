---
id: "monitoring-sidebar"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/monitor/MonitoringSidebar.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-04-08", confidence: 100, notes: "Usa `panelStore` para abrir tabs de monitoring en dashboard" }
  subsystem: { status: "complete", completed_date: "2026-04-08", confidence: 100, notes: "Navegador canónico de las tres superficies activas de observabilidad" }
  operations: { status: "complete", completed_date: "2026-04-08", confidence: 100, notes: "Selección activa por identidad y apertura contextual por `view`" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 MonitoringSidebar

## 🎯 Propósito
`MonitoringSidebar` es el menú de entrada a la superficie de observabilidad activa del producto. Su responsabilidad es exponer únicamente las herramientas vigentes de monitoring y mantener sincronizada la selección visible con el `dashboard` multi-panel.

## 📦 Estado y Datos
- `layout`
  - se usa para localizar el contenedor `dashboard` y derivar la herramienta activa.
- `openTab`
  - abre tabs de tipo `monitoring` con identidad y `context.view` específicos.
- `tools`
  - catálogo estático reducido a tres opciones: `Kernel Console`, `Cognitive Pipeline` y `Documentation Quality`.

## 🔄 Flujos de Interacción
1. **Detección de vista activa**
   - inspecciona el tab activo del contenedor `dashboard`.
   - resuelve la identidad activa desde `tab.identity` o, en su defecto, desde `tab.context.view`.

2. **Apertura de herramientas**
   - cada botón invoca `openMonitoringTab(identity, view, title, icon)`.
   - el tab resultante siempre es de tipo `monitoring` y queda listo para ser resuelto por `DynamicContainer`.

3. **Reducción del paisaje**
   - la barra lateral expone únicamente la superficie oficial de observabilidad activa y excluye herramientas retiradas del paisaje canónico.

## 💡 Ejemplo de Uso
```tsx
import { MonitoringSidebar } from '../../components/monitor/MonitoringSidebar';

<SidebarArea>
  <MonitoringSidebar />
</SidebarArea>
```
