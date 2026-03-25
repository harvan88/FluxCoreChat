---
id: "fluxcore-sidebar"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/fluxcore/FluxCoreSidebar.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Inyectado con useAIStatus para discernimiento visual" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Menú Lateral de la Consola Administrativa" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Mutación de Menús basada en Runtime (Asistentes vs Fluxi)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 FluxCoreSidebar

## 🎯 Propósito
Es el componente arquitectónico de navegación rígido situado al lateral izquierdo de la Consola de Administración (`FluxCorePanel`). Presenta un sumario de accesos verticales con Iconografía estándar lucide (Bot, Database, Wrench). Sin embargo, posee inteligencia deductiva camaleónica escondida: analiza internamente el motor general del Workspace para desarmar u ocultar botones que el usuario no debería alcanzar si su sistema base ha mutado.

## 📦 Estado y Datos
**Acople Radial (Detector de Runtimes):**
- Importa nativamente `useAIStatus(accountId)`. Chequea vitalmente qué "cerebro" está operando (`@fluxcore/asistentes` frente a `@fluxcore/fluxi`).

## 🔄 Flujos de Interacción
1. **Filtrador Interceptual de Destinos (`filteredNavItems`):** En cada ciclo del EventLoop, pregunta "Quién es el motor". Si el motor que domina el cerebro de la cuenta es el de tipo *Fluxi* (Delegativos/Background), aniquila con `filter` los botones textuales inservibles (`assistants`, `instructions`, `debug`), forzando al humano a concentrarse únicamente en el tablero de Trabajos (`works`), evitando así configuraciones paramétricas falsas.

## 💡 Ejemplo de Uso
```tsx
import { FluxCoreSidebar } from '../../components/fluxcore/FluxCoreSidebar';

<FluxCoreSidebar 
   activeView={view} 
   onViewChange={setView} 
   accountName="Workspace Ventas"
   accountId="usr_123"
/>
```
