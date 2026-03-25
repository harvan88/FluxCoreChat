---
id: "tools-view"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/views/ToolsView.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Adopta patrón CollectionView Universal" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Biblioteca UI Global de Capabilidades Conectables" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Fusión Dinámica de Arreglos (Definitions + Connections)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 ToolsView

## 🎯 Propósito
Es el "Mercado de Integraciones". Permite a los administradores visualizar las "Definiciones de Herramientas" (qué plugins conoce el Bot) y cruzarlas contra sus "Conexiones Ocurridas" (Cuáles plugins autorizó el usuario, ej. Google Auth, Github Auth) en una visual tabular estandarizada usando el componente masivo `CollectionView`.

## 📦 Estado y Datos
**Mapeo Asincrono Híbrido:**
- Hace un `Promise.all` dual hacia el back para recuperar `definitions` y `connections` al unísono, permitiéndole armar las filas visuales sin esperas en cascada.

## 🔄 Flujos de Interacción
1. **Derivador de Status Badge:** Expone una columna calculada sobre el backend real (`getConnectionStatus`). Rotea por la lista de matches (donde `c.toolDefinitionId === toolId`) e inyecta un Componente Badge de color Verde, Ámbar o Rojo dependiendo si la integración está viva, vencida, o jamás instaurada.

## 💡 Ejemplo de Uso
```tsx
import { ToolsView } from '../../components/fluxcore/views/ToolsView';

// Embebido dentro del Gestor FluxCore
<ToolsView accountId={currentAccount.id} />
```
