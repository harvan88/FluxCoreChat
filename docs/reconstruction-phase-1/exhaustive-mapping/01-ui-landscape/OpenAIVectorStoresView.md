---
id: "openai-vector-stores-view"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/views/OpenAIVectorStoresView.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Dependencia vitalicia con Store global RAG" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Paginador Tabla de Bases Vectores Cloud Exclusivas" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Filtro hermético anti-Local protegiendo flujos y disparos de creaciones" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 OpenAIVectorStoresView

## 🎯 Propósito
Es el mellizo opuesto de la vista Local. Dedicado religiosamente a listar, crear y abrir conexiones con Bases de Conocimientos manejadas por la API "OpenAI". Garantiza la segregación forzando visualizaciones dispares en paneles contiguos para no mezclar manzanas con naranjas en las cabezas de los desarrolladores operando.

## 📦 Estado y Datos
**Filtro Purgativo Constante:**
- Substrae la prop `vectorStores` subyacente de FluxCore e implementa un `filter(s => s.backend === 'openai')`. Acarrea el estado `isSavingGlobal`.

## 🔄 Flujos de Interacción
1. **Controlador Profundo (Deep Tab Router):** Resuelve interacciones cuando es incrustado en el ecosistema Multi-tab de FluxCore. Si crea un recurso Cloud lo inyecta a un `onOpenTab()` estampándolo con una Identity prefijada (`extension:fluxcore:openai-vectorStore:`), propiciando que al cerrar el entorno o abrir otro, el framework sepa rutear esta vista explícita salvando la jerarquía inusual.

## 💡 Ejemplo de Uso
```tsx
import { OpenAIVectorStoresView } from '../../components/fluxcore/views/OpenAIVectorStoresView';

if (currentSubView === 'cloud_stores') {
  return <OpenAIVectorStoresView accountId="1" />;
}
```
