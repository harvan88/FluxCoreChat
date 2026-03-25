---
id: "expanded-editor"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/editors/ExpandedEditor.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Aislado, emite eventos puros onSave/onChange" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Cajón flotante estilo GitHub para Contextos Extensos" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Calculadora reactiva en tiempo real de Tokens tipo GPT" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 ExpandedEditor

## 🎯 Propósito
(FC-804). Provee a la interfaz una vista en Modal Crudo (Estilo editor GitHub) preparada para la ingestión y revisión de bloques masivos de texto. Fundamentalmente encomendada a manipular "Contextos para IA" que requieran alta precisión. Soporta dos vistas intercambiables: Editor Lineal Textual e intérprete de Renderizado `Preview` amigable.

## 📦 Estado y Datos
**Buffer Local y Métricas en Tiempo Real:**
- Absorbe `initialContent`, pero se desvincula de él manipulando mutaciones puramente mediante su estado interno `<textarea>` asincrónico.
- Posee sistema reactivo calculador (Vía `useMemo`) que inspecciona milisegundo a milisegundo la matriz escrita extirpando: `lines`, `chars`, `words` y una aproximación empírica y dura del coste AI sumando `tokens = Math.ceil(chars / 4)`.

## 🔄 Flujos de Interacción
1. **Dicotomía de Tablero (Code vs Preview):** Manteniendo el botón accionado en la barra, si se invoca `code`, despliega un Grid lateral simétrico que pinta con `Array.from` los números lógicos por cada salto de línea reconocido. Si salta a `preview`, el componente destruye la interfaz cruda pintando clases ricas de Tailwind Typography (`prose prose-invert`) facilitando lectura de informes largos.
2. **Deflector Anti-Cierre (Unsaved Trap):** Si el hook detector de suciedad constata `hasChanges = true`, secuestra intencionalmente la invocación `onClose()` mediante un pararrayos nativo del Navegador (`window.confirm()`), evitando la purga y pérdida de miles de caracteres redactados por equivocación mecánica.
3. **Descarga Archival (`handleDownload`):** Brinda al usuario una exportación instantánea instanciando en Memoria del DOM un Blob estático puro (`text/plain`), inyectándolo en una ancla fantasma virtual y gatillando un clic en nombre del usuario emitiendo el resultado crudo como `contexto-ia.txt`.

## 💡 Ejemplo de Uso
```tsx
import { ExpandedEditor } from '../../components/editors/ExpandedEditor';

if (isEditingContext) {
  return (
    <ExpandedEditor
      title="Edición de Personalidad del Asistente"
      content={systemPrompt}
      onSave={async (newText) => await deployNewPrompt(newText)}
      onClose={() => setIsEditingContext(false)}
    />
  );
}
```
