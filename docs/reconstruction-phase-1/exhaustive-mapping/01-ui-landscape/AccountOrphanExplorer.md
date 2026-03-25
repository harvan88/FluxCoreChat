---
id: "account-orphan-explorer"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/monitor/AccountOrphanExplorer.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Habla directo con `useAccountDeletionMonitorStore` Zustand" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Telescopio de Data-Leaks (Vigilante de Orphaned Rows)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Routing entre Paneles PWA (Audit Auto-fill), Iterador de Data" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🔭 AccountOrphanExplorer

## 🎯 Propósito
Es el compañero pasivo del Auditor de Cuentas. Piensa en él como un centinela: se la pasa preguntando al Backend "¿Hay filas sueltas de gente que ya no existe?". A diferencia del Auditor "Activo" (Donde pones la Cuenta ID), aquí el sistema te *avisa proactivamente* qué Tablas quedaron cojas enseñando las muestras (Samples) exactas de los infractores.

## 📦 Estado y Datos
100% Sin Estado propio mutante. Se amarra como esclavo de lectura a `useAccountDeletionMonitorStore` invocando `fetchOrphans()` en Montaje para sacar la matriz destructiva `orphans[]`.

## 🔄 Flujos de Interacción
1. **Puente Inter-Panel (Jump-To-Audit):** Al mostrar la retícula de UUID's Huérfanos, si presionas el micro-boton "Auditar", el componente coge el UUID sucio, lo inyecta ocultamente en el Store, y levanta automáticamente el Otro Panel de Pestaña de Diagnostico (AccountDataAudit) rellenándolo por ti, comportándose como un flujo de trabajo entre ventanas similar a un IDE.

## 💡 Ejemplo de Uso
```tsx
// Se abre desde la barra de herramientas Administrativa
{view === 'orphans' && <AccountOrphanExplorer />}
```
