---
id: "vector-store-diagnostic-section"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/components/VectorStoreDiagnosticSection.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Anidado profundamente sobre Detail Locales/Clouds" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Buscador Sandbox Textual Semántico" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "POST Manual de RAG Testing devolviendo score probabilístico" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🎨 VectorStoreDiagnosticSection

## 🎯 Propósito
(Caja de Arena Forense de Archivos). Le da al administrador un input de búsqueda falso simulando qué pasaría si un usuario le preguntara "ESO" a la IA artificial, para responder mostrando los fragmentos puros en base a porcentajes `(Score * 100)` indicando por qué el sistema RAG consideró que ese fragmento sirve o no de respuesta. 
## 🧰 Props
- `vectorStoreId` (string, Requerido): El ID UUID unívoco de Pinecone / DB al cual bombardear el fetch POST.
- `accountId` (string, Requerido): Requerido para comprobaciones de Ownership.

## 📦 Estado y Datos
**Form Inmutante Protegido:**
- Protege sus resultados asíncronos limpiando `setSearchResults(null)` si se interrumpe y previene gatillar el formulario si el string de consulta está manchado con puros espacios vacíos (`!searchQuery.trim()`).

## 🔄 Flujos de Interacción
1. **Bucle de Consumo Semántico:** Efectua un fetch forzudo interpelando el `/search` del vector store con limitadores (`maxNumResults: 5`). La respuesta la desempaqueta en tarjetas forenses imprimiendo la `filename` de origen y el porcentaje de similitud estricta al vector. Sirve vitalmente para saber cuándo los `RAG Configs` (TopK y minScore) estrangularon al sistema haciéndolo incapaz de encontrar PDF's relevantes. 

## 💡 Ejemplo de Uso
```tsx
import { VectorStoreDiagnosticSection } from '../../components/fluxcore/components/VectorStoreDiagnosticSection';

<VectorStoreDiagnosticSection vectorStoreId={id} accountId={acc} />
```
