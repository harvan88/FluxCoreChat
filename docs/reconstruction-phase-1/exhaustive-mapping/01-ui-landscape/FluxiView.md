---
id: "fluxi-view"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/fluxcore/views/FluxiView.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Absorbe datos del Store Custom hook userWorks" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tablero Central del Motor Fluxi" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor Split Top-Bottom para Cola vs Activos" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 FluxiView

## 🎯 Propósito
Funge en representación del Dashboard de Área principal y orquestador absoluto visual destinado hacia los Trabajos en Bloque IA del motor alternativo "Fluxi" dictado en el Sidebar. Instancia los Tableros Mayores "Pestañales" separando dualmente la vida de la app: lo efímero (Activos / Propuestas Inminentes) frente al Archivo Muerto masivo (Historial), invocando y alimentando sub-tablas (`FluxiList`) para su acometido. 

## 📦 Estado y Datos
**Acople Masivo de Vectores Red (`useWorks`):**
- Importa internamente a `useWorks(accountId)` el cual le entrega en tiempo real tres matrices disociadas: `proposed`, `active` y `history`.
- Registra una memoria volátil binaria local `activeTab`.

## 🔄 Flujos de Interacción
1. **Compresor Mutativo en Cuadrículas Split (`Grid Layouting`):** Mantiene la arquitectura densa de FluxCore. Si el switch dictamina foco en "Activos", destruye la vista, e inyecta dinámicamente dos Tablas hijas verticales flex; apretando a las propuestas en el Top (`max-h-[40%]`) dotando priorización estética, y cediendo el resto del estanque horizontal al bloque de Tareas Ejecutando con alta visualidad gráfica.

## 💡 Ejemplo de Uso
```tsx
import { FluxiView } from '../../components/fluxcore/views/FluxiView';

<DynamicContainer>
   <FluxiView accountId="12" onOpenTab={pushNewTabContext} />
</DynamicContainer>
```
