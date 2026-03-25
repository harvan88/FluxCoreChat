---
id: "vector-store-list"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/fluxcore/vectorStores/VectorStoreList.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Wrapper de Inyección Visual a CollectionView" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tabla Customizada de Bases Vectoriales" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Banderas UI multi-nube y Columnas Responsive (hideBelow)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 VectorStoreList

## 🎯 Propósito
Simplemente expulsa todo el boilerplate y columnas de renderizado enrevesadas (React Fragments con Tooltips y Iconos SVG dedicados) empaquetando un Array crudo de `VectorStore` en el súper-componente genérico `CollectionView`. Promueve que quien consuma la "lista plana" no ensucie 200 líneas armando la tabla de UI.

## 📦 Estado y Datos
**Inmutabilidad Visual:**
- Sin estado real ni red. Todas las props (`stores`, `loading`, `onCreate`, `onSelect`, `onDelete`) se inyectan en caliente, haciéndolo ultra-reusable por interfaces Cloud y Locales sin importar.

## 🔄 Flujos de Interacción
1. **Delegador Visual Dinámico:** Incrusta el Badge estigmático (`OpenAI` SVG con fondo morado) a nivel tabla si detecta la propiedad interna semántica `row.backend === 'openai'`.
2. **Botines Dobles Responsivos:** Proporciona un `renderMobileActions` que se encarga de acoplar un boton de basura bi-confirmativo (`DoubleConfirmationDeleteButton`) aplacado sólo cuando el framework detecta ventanas móbiles.

## 💡 Ejemplo de Uso
```tsx
import { VectorStoreList } from '../../components/fluxcore/vectorStores/VectorStoreList';

<VectorStoreList 
  stores={localStoresArray}
  loading={isFetching}
  onCreate={openCreateModal}
  onSelect={navigateDeep}
  onDelete={askForPermadeath}
/>
```
