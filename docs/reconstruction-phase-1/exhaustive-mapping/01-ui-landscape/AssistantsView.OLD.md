---
id: "assistants-view-old"
type: "legacy-ui"
status: "deprecated"
criticality: "low"
location: "apps/web/src/components/fluxcore/views/AssistantsView.OLD.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Identificado como archivo de backup" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Conexiones legacy a /api/fluxcore/assistants" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Antiguo orquestador de asistentes" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Operaciones de CRUD básicas sin soporte multiruntime" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📜 AssistantsView (OLD)

## 🎯 Propósito
Este archivo es una versión DEPRECADA del orquestador de asistentes. Se mantiene en el repositorio únicamente para propósitos de Reconstrucción Histórica y Auditoría de lógica de negocio previa al refactor de Multiruntime.

## 📦 Estado y Datos
Implementaba un manejo de estado basado en `useState` locales masivos. Carecía de la abstracción de "Runtime" (Local vs OpenAI) presente en la versión actual.

## 🔄 Flujos de Interacción
1. **Guardado Directo:** Utilizaba `fetch` directo en lugar de servicios centralizados.
2. **Layout Simple:** Gestión de pestañas rudimentaria.

## ⚠️ Nota de Mantenimiento
**NO UTILIZAR EN PRODUCCIÓN.** Este archivo será removido una vez finalice la fase de reconciliación de esquemas de base de datos.

## 💡 Ejemplo de Uso
```tsx
// Uso del componente AssistantsView.OLD
import { AssistantsView.OLD } from '@/components/AssistantsView.OLD';

function Example() {
  return <AssistantsView.OLD />;
}
```
