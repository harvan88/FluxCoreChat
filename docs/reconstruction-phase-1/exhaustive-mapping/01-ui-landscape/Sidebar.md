---
id: "sidebar"
type: "smart-component"
status: "stable"
criticality: "critical"
location: "apps/web/src/components/layout/Sidebar.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Eslabón primordial conectando ViewRegistry y FluxCore ExtensionHost" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Controlador de Barras Laterales Dinámicas Múltiples" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Resolución canónica de títulos, control Drawer mobile, toggles Pins" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🧠 Sidebar (TOTEM)

## 🎯 Propósito
El Gobernante absoluto del eje Z izquierdo. El Sidebar opera como el "Lienzo de Operadores" para inyectar menús contextuales dependientes de donde navegue el usuario en el ActivityBar principal. Se suscribe fuertemente al dogma "ChatCore gobierna, extensiones inyectan" derivando las vistas al `registry` para no ensuciar el componente de layouts estáticos.

## 📦 Estado y Datos
**Enrutador Global Inteligente:**
- Recibe el macro estado global `activeActivity` limitante ("conversations", "contacts", "ext:website-builder"). De ahí salta al `viewRegistry` intentando extraer constructores inyectables React (Plugin System).

## 🔄 Flujos de Interacción
1. **Prefijo Extensional (`ext:`):** Posee un parseo heurístico; si se intercepta una actividad inyectada por terceros (`ext:algun-id`), le encomienda al `ExtensionHost` buscar su manifest YAML/JSON leyendo dinámicamente si esa extensión dictaminó mostrar un SidebarView especial, ruteándolo automágicamente sin que el Sidebar tenga que ser re-codeado.
2. **Disparadores Deep-Link Extensiones (`FluxCorePanel` Hook):** Alberga reglas específicas para extensiones críticas que disparan tabs simultáneos al inyectarse.
3. **Pin-Lock Toggles:** Retiene comandos UI de Persistencia (Fijar para que no colapse al perder hover). Resuelto con `toggleSidebarPinned`.  

## 💡 Ejemplo de Uso
```tsx
import { Sidebar } from '../../components/layout/Sidebar';

// Renderizado directo bajo Root App Shell Layout
<Sidebar />
```
