---
id: "assistant-list"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/fluxcore/assistants/AssistantList.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Adaptador visual puramente pasivo de arrays masivos" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Catálogo de Identidades de Inteligencias Individuales" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Lógica embebida Double-Confirmation-Delete, Tooltips dinámicos" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 AssistantList

## 🎯 Propósito
La Grilla Frontal estándar donde descansan tus "Cerebros AI". Toma como Inyección Externa el Array de Inteligencias (Locales Mistral / Llama3 o Cloud API OpenAI), y las enlista con sus insignias usando la clase estándar de Grilla `CollectionView`. 

## 📦 Estado y Datos
No maneja mutaciones locales a gran escala, pero recibe de props la dupla mortal `activateConfirm` / `setActivateConfirm` del padre para asegurar esa micro-transacción visual de 2 clics al activar un agente y desactivar al retador.

## 🔄 Flujos de Interacción
1. **Identificación de Runtime:** Verifica en vivo el `row.runtime` para saber si escupir el feo cerebro alien (Local Llama) o montar el elegante logo del Átomo (`OpenAIIcon`) delatando si el asistente consumirá créditos Cloud o fierro en casa.
2. **Acceso de Cruce Relacional:** Toma inteligentemente la prop `instructions[]` y hace un join visual `instructions.find(i => i.id === id)` sustituyendo los indescifrables UUIDs de la BBDD por nombres cálidos como "Prompt Limpieza de Tickets".

## 💡 Ejemplo de Uso
```tsx
<AssistantList 
  assistants={data} 
  instructions={loadedInstructions} 
  onSelect={(row) => showDetailMode()} 
/>
```
