---
id: "tools-sidebar"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/tools/ToolsSidebar.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Punto de Inyección via Sidebar Global" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Menú Navegacional de Utilidades en Segundo Plano" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Instanciador de Entornos via Multi-Tab Array" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 ToolsSidebar

## 🎯 Propósito
Esquina lateral simplificada encargada específicamente de enrutar Sub-aplicaciones que llamamos "Herramientas" (Por ahora, principalmente 'Plantillas'). Opera listando menús verticales que al ser cliqueados no navegan localmente, sino que le exigen al Motor Principal (`PanelStore`) inyectar Tabs (pestañas) nuevos en el entorno central de la pantalla.

## 📦 Estado y Datos
**Reflector Activo Tabular:**
- Destaca qué herramienta estás viendo. Lanza una lectura pesada sobre todo el ecosistema de Contenedores (`layout.focusedContainerId` -> buscar activetab). Evalúa si la Pestaña que estás viendo coincide con `'template-panel'`, así le agrega CSS resaltado al propio botón del Sidebar (retroalimentación visual de "Tu tab foco es herramientas").

## 🔄 Flujos de Interacción
1. **Delegador Multi-Tab:** Al presionar "Plantillas" (`onSelect()`), construye un tab formalizado de UI (`template-panel`) y lo manda llamar con `openTab()`, adjuntándole un ID semántico (`identity: template-panel:{accountId}`).

## 💡 Ejemplo de Uso
```tsx
import { ToolsSidebar } from '../../components/tools/ToolsSidebar';

<ToolsSidebar accountId={activeAccountId} />
```
