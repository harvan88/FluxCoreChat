---
id: "local-vector-store-detail"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/vectorStores/LocalVectorStoreDetail.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Integra partes atómicas RAGConfigSection y VectorStoreFiles" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Mega Editor y Perfil de una Base Vectorial Nativa" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Visor cruzado de 'quién consume mi base', Snapshots y Test Query Tools" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 LocalVectorStoreDetail

## 🎯 Propósito
Es la sala de control de una Base de Datos Dimensional generada y operada dentro de nuestra propia estructura. Procesa toda la configuración semántica exigible a una RAG (Retriever-Augmented Generation) y te adhiere un Playground de Testing (`VectorStoreTestQuery`) sin abandonar el entorno. Su rol es unificar Sub-paneles.

## 📦 Estado y Datos
**Mega-Orquestación Pasiva:**
- Es un "Dumb Component Grande". Sus estados y funciones crudas (`onUpdate`, `onSave`) manan de niveles superiores, usándolos localmente para reflejar contadores `setFileStats` previniendo parpadeos y retrasos contra el backend ante la eliminación de cien documentos.

## 🔄 Flujos de Interacción
1. **Cruce Forense Entidades (Quién me consume):** Descarga todo el universo de `assistants` y aplica un filter `includes(store.id)` armando en memoria temporal un listado de Agentes o Asistentes vinculados. Muestra un Botón para Crear Instancias de Asistentes pre-vinculados dictaminando un payload `view:'config'` en cascadas OpenTab.
2. **Sistema Exportador Absoluto o Snapshot (`handleCopyConfig`):** Cuando el investigador desea guardar la topografía matemática para debug, golpea ciegamente el endpoint directo `/vector-store-snapshot/` exigiendo que el Engine dumpee toda la RAG entera a un JSON validado incordiándolo en el Portapapeles Nativo de tu OS.

## 💡 Ejemplo de Uso
```tsx
import { LocalVectorStoreDetail } from '../../components/fluxcore/vectorStores/LocalVectorStoreDetail';

<LocalVectorStoreDetail 
   store={dbLocal_221}
   accountId="wk_2"
   onSave={triggerFullSync}
/>
```
