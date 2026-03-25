---
id: "instruction-list"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/fluxcore/instructions/InstructionList.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Delegador de CollectionView Genérico" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tabla de Archivos de System Prompts" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Declarador de Columnas para tamaño y Metadatos IA" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 InstructionList

## 🎯 Propósito
Abstracción de interfaz que rige cómo se presentan las matrices de "Instrucciones de Texto" o Prompts ante el usuario en formato tabla cruzada. Delega enteramente en el Wrapper `CollectionView` concentrándose puramente en las reglas de Parseados visuales para las fechas, tamañajes y estatus de las entidades de Prompts.

## 📦 Estado y Datos
**Estructuras Funcionales Mutables:**
- Define una matriz inmutable en crudo de `columns` forjando el comportamiento adaptativo de celdillas (Escondiendo columnas de bytes y modificadores bajo puntos de quiebre de Tailwind `hideBelow: 'lg'`).

## 🔄 Flujos de Interacción
1. **Fábrica de Celulosa Sensitiva:** Si estampa Tamaño, interpola `formatSize(row.sizeBytes)` al lado del string `tokensEstimados` para generar perspectiva de "Peso Lógico vs Peso Byte". Provee acceso frontal veloz a descargas y clonación parando de golpe la propagación del padre de la tabla con clics defensivos `e.stopPropagation()` sobre sus micro-botones (`renderMobileActions`/`renderActions`).

## 💡 Ejemplo de Uso
```tsx
import { InstructionList } from '../../components/fluxcore/instructions/InstructionList';

<InstructionList 
   instructions={apiInstructions} 
   loading={false}
   onCreate={handleTouchCreate}
   onDelete={executeHttpRemoval}
/>
```
