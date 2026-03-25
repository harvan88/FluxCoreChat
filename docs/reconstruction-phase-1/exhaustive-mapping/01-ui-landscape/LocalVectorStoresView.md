---
id: "local-vector-stores-view"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/views/LocalVectorStoresView.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Alineado a hook Global useVectorStores" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Enrutador Principal que intercala tabla y editor" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Filtro hermético anti-OpenAI Vectors protegiendo flujos puros" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 LocalVectorStoresView

## 🎯 Propósito
(Vista General). Orquestador hermano de `InstructionsView`, pero dedicado absolutamente a la gestión de Vector Stores (Bases RAG). Implementa un Switch visual crudo entre el modo Listado (`VectorStoreList`) y el Modo Edición detallada (`LocalVectorStoreDetail`). Su rasgo de identidad maestro es garantizar hermeticismo lógico censurando del ecosistema cualquier Store que tenga etiqueta de proveedores API como "OpenAI", impidiendo mezclas nocivas.

## 📦 Estado y Datos
**Cánopy Estabulizador Mutativo:**
- Traga todo el array `vectorStores` subyacente y le aplica un sedazo estático `filter(backend === 'local')` amparándolo en el memorizador de react `useMemo`.
- Como Orquestador asume la labor de manejar la persistencia final mediante la prop `handleManualSave`, enviándola y bloqueando botones con `isSavingGlobal`.

## 🔄 Flujos de Interacción
1. **Generación Instantánea de Cascarones (`handleCreate`):** Forja una mutación HTTP de tipo fantasma empujando Strings neutros ("Nueva base.."). Al obtener el éxito 200, destruye su propia UI ListView dictando a los props inyectores Deep-Linking (`onOpenTab()`) que revienten el panel o fuercen el seteo a `setLocalSelectedStore()` logrando transicionar al usuario del mundo Lista al Tablero Editor Inmediato fluidamente.

## 💡 Ejemplo de Uso
```tsx
import { LocalVectorStoresView } from '../../components/fluxcore/views/LocalVectorStoresView';

if (activeTab === 'vector_stores') {
  return <LocalVectorStoresView accountId="uid_110" />;
}
```
