---
id: "instructions-view-original"
type: "legacy-ui"
status: "deprecated"
criticality: "low"
location: "apps/web/src/components/fluxcore/views/InstructionsView.original.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Identificado como archivo original base" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Parser de Markdown Custom" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Biblioteca de Instrucciones Reutilizables" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Editor con Line Numbers y Modo Preview" }
evolution: { current_layer: 4, total_layers: 4, confidence: 100 }
---

# 📜 InstructionsView (Original)

## 🎯 Propósito
Versión original del visor y editor de instrucciones. Es crítica porque contiene un **Parser de Markdown Lado Cliente** (`markdownToHtml`) altamente personalizado que fue diseñado para previsualizar cómo la IA interpreta los prompts según los tokens estimados.

## 📦 Estado y Datos
Gestiona metadatos de texto: conteo de palabras, líneas y estimación de tokens (Words * 1.3). 

## 🔄 Flujos de Interacción
1. **Sincronización de Perfil:** Implementa la lógica de `isManaged`, donde ciertas instrucciones no se pueden editar porque vienen directamente del Perfil Global del Usuario.
2. **Descarga de Artefactos:** Permite exportar instrucciones como archivos `.md` locales mediante `createObjectURL`.

## ⚠️ Valor Arquitectónico
Se mantiene para auditar el algoritmo de `escapeHtml` y la lógica de inyección de `prose-invert` en el DOM.

## 💡 Ejemplo de Uso
```tsx
// Uso del componente InstructionsView.original
import { InstructionsView.original } from '@/components/InstructionsView.original';

function Example() {
  return <InstructionsView.original />;
}
```
