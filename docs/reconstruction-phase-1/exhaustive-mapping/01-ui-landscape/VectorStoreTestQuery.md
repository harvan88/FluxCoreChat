---
id: "vector-store-test-query"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/fluxcore/vectorStores/VectorStoreTestQuery.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Interactúa con `/api/fluxcore/runtime/rag-context`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Micro-Debugger Frontend para RAGs (Simulador)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Emisión manual semántica (TopK=5), Parámetros de Similitud %" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🔬 VectorStoreTestQuery

## 🎯 Propósito
(El Simulador de Neuronas). Se monta debajo de la configuración de un RAG (VectorStore Local). Le da a los usuarios o administradores un espacio tipo "Buscador de Google" para tipear preguntas ("¿Cuál es el pesticida de las cucarachas?") y recibir sin necesidad de gastar tokens con una IA real, qué recortes (Chunks) rescató el algoritmo de Embedding en crudo desde la base vectorial.

## 📦 Estado y Datos
- **Almacen de Respuesta Cruda:** Guarda un state tipado `RAGTestResult` que encasilla el payload masivo de la API: `sources[]`, `similarity (float)`, `totalTokens` consumidos localmente, y la pieza de texto original para despacharlo a pintar.

## 🔄 Flujos de Interacción
1. **Rejilla Diagnosticadora:** Si la consulta prosperó, enlista las fuentes (`source` array) convirtiendo el valor frío `0.854` de similitud cosenoidal matemática de vectores en algo útil humano: `{(source.similarity * 100).toFixed(1)}%` (85.4%).

## 💡 Ejemplo de Uso
```tsx
<VectorStoreTestQuery 
    vectorStoreId={idFromParent}
    accountId={accountGlobalId}
/>
```
