---
id: "fluxcore-prompt-inspector-panel"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/extensions/FluxCorePromptInspectorPanel.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Consume api.getAITraces y derivados" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Panel de Depuración Avanzado (X-Ray Dev) para IAs" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Desglosador crudo de JSON, uso de Tokens, Prompts base y Metadatos" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 FluxCorePromptInspectorPanel

## 🎯 Propósito
(V3-Debug). Componente maestro en el entorno de desarrollo y monitorización, diseñado para aportar visibilidad de "Rayos X" absoluta sobre lo que pasa bajo la capota de la IA. Desglosa cada interacción que hace el asistente en "Trazas", permitiendo a los administradores y analistas inspeccionar el `System Prompt` final embebido, los intentos de red exactos (Requests/Responses), las llamadas a herramientas (Tools) y los contextos inyectados por tecnologías RAG, así como exportarlos para debuggear caídas masivas de APIs proveedoras.

## 📦 Estado y Datos
**Visor Multidimensional:**
- Extrae métricas pesadas: `traces` como resumen primario y `detail` como inmersión completa mediante llamadas `loadTraceDetail()`.
- Mantiene variables mutantes visuales para filtros de búsqueda (`conversationFilter`) y gestiones de estado en masa (`isExporting`, `isClearingTraces`, `isCopyingAll`).

## 🔄 Flujos de Interacción
1. **Dicotomía de Tablero Inteligente:** Construye en su área un Panel Split (`grid-cols-12`). La columna de 4 grillas enlista cronológicamente `traces` filtradas con su resumen de tokens (Ej. `1342 tok`). Cliquear un nodo cambia el cursor global forzando la columna de 8 grillas a escupir una autopsia exhaustiva bloque por bloque (Resumen, Runtime, System Prompt, Messages, Context).
2. **Extractor de Portapapeles Formateado:** Implementa un bucle intensivo en `handleCopyAll()` que desciende por TODOS los detalles (`limit: 200`), forjando un Reporte unificado puro en formato Markdown para ser portado instantáneamente a reportes de GitHub o mesas de Tickets de soporte por avería del LLM.

## 💡 Ejemplo de Uso
```tsx
import { FluxCorePromptInspectorPanel } from '../../components/extensions/FluxCorePromptInspectorPanel';

// Usualmente cargado dentro del Workspace en el tab de Debug
<DynamicContainer>
   <FluxCorePromptInspectorPanel accountId={currentId} />
</DynamicContainer>
```
