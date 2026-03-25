---
id: "instruction-detail"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/instructions/InstructionDetail.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Conexiones complejas a ReactMarkdown y Previsualización Prompt (X-Ray)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Macro-Editor In-Place para System Prompts" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Autoguardado, Tokens estimativos y Analizador de Modos Híbridos" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 InstructionDetail

## 🎯 Propósito
Es la sala de máquinas de escritura. Componente ultra-denso que domina toda la pantalla cuando el usuario desea reescribir un "System Prompt" o instrucción de base. Implementa visor dual nativo (Modo Code crudo vs Visualización GFM Markdown Rica). También posee un interceptor `promptPreview` que viaja a backend y simula cómo se verá la instrucción embebida definitivamente antes de enviarse a OpenAI.

## 📦 Estado y Datos
**Mega-Orquestación Pasiva:**
- Depende de un centenar de Props empujadas desde `InstructionsView` para evitar re-renderizaciones erráticas (`onContentChange`, `lastAutosave`, `isManaged`).
- Controla el Popover local inteligente de Asistentes dependientes `previewPickerOpen`.

## 🔄 Flujos de Interacción
1. **Gestor Anti-Dañino (Instrucciones Managed):** Si evalúa el booleano duro `isManaged` (La instrucción viene forzada por el Sistema), amputa los EventListeners de escritura, deshabilita mutaciones al Input Name, inyecta un Alert Info Gigante e impone la prop nativa `readOnly` bloqueando al teclado humano.
2. **Tablero Resumen Estadístico Matemático:** Al pie del componente y bajo un Accordion renderiza en vivo y con íconos vistosos el peso específico del string con base en funciones de `lib/fluxcore.ts`. Calculando empíricamente caracteres, límite total (`maxChars`), vocablos (`words`) y costo en Redes Neuronales (`tokens.toLocaleString()`), mutando sus contornos a rojo (`border-error/60`) si sobrepasa los márgenes establecidos.
3. **Mega Popover 'PromptPreview' Modal Absoluto:** Si solicita "Ver Vista Final IA", levanta una caja acorazada `z-50 bg-black/70` inyectando todo el `systemPrompt` parseado y formateado a JSON con sus variables de Temperatura, Modelo y BaseUrl impuestas, forjando visibilidad forense invaluable.

## 💡 Ejemplo de Uso
```tsx
import { InstructionDetail } from '../../components/fluxcore/instructions/InstructionDetail';

<InstructionDetail 
   instruction={currentFile} 
   viewMode="code"
   stats={{ lines: 40, words: 200, tokens: 412, chars: 1024 }}
   assistantConsumers={[{id: 'bot_2', name: 'Soporte'}]}
   onViewModeChange={setMode}
   onCopyContent={copyClipboard}
/>
```
