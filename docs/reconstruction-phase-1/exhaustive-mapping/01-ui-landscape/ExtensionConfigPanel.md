---
id: "extension-config-panel"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/extensions/ExtensionConfigPanel.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Poder directo sobre panelStore y Configuraciones Subyacentes" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Intérprete Mágico Generador de Formularios" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Sincronizador Cruzado Groq/OpenAI Lógico" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 ExtensionConfigPanel

## 🎯 Propósito
(V2-4). Cajón maestro que no solo expone configuraciones, sino que es un potente *Engine Auto-Generativo de Formularios UI*. Recibe descripciones abstractas tipo "Schema" y compila en caliente botones, selectores o switches de Tailwind sin que el autor del plugin deba codificar HTML. Es primordial para configurar el puente principal "FluxCore IA" gestionando la latencia, modelos NLP disponibles y temperaturas de la Red Neuronal.

## 📦 Estado y Datos
**Dictadura de Esquemas (`ConfigSchema`):**
- Mantiene a fuego en su código fuente el `fluxCoreSchema` oficial dictando la topología universal obligatoria que las IAs exigirán (Ej. Campos como `provider`, `mode`, `temperature`). 
- Clona las preferencias externas de usuario dentro de estado volátil `localConfig` permitiendo editar extensamente sin romper la App, postergando la inyección dura al Backend meramente cuando apreta Guardar (`handleSave`).

## 🔄 Flujos de Interacción
1. **Intérprete Renderer (`renderField`):** Actúa mediante inyección polimórfica `switch(field.type)`. Si detecta "select", monta un tag `<select>` nativo. Si es número, acopla pasos flotantes validando máximos y mínimos (Ej. Temperatura de 0 a 2 max).
2. **Motor Mutágeno de Dependencias (`handleChange`):** Posee inteligencia cruzada específica. Intercepta el Switch Maestro de Proveedor IA. Si un usuario que usaba Groq muta drásticamente a "OpenAI", la función colisiona su elección de Modelos ("Llama y Mixtral ya no son válidos"), obligando destructivamente su selector gemelo adyacente para ser rellenado con `gpt-4o-mini`, salvaguardando contra caídas 500 fatales de APIs de proveedores incompatibles.
3. **Apertura Avanzada de Deep Console (`Prompt Inspector`):** Inyecta en pie de página (Si posee el feature flag `supportsPromptInspector`) un disparadero nativo que altera el `panelStore` empujando violentamente una sub-pestaña nueva enrutada al Inspector abstracto Terminal para observar el Payload plano exacto.

## 💡 Ejemplo de Uso
```tsx
import { ExtensionConfigPanel } from '../../components/extensions/ExtensionConfigPanel';

<ExtensionConfigPanel
   extensionId="ext-ai-flux"
   extensionName="Analizador Documental"
   config={extSettings}
   schema={customExtSchema} 
   onSave={writeConfigToDatabase}
   onClose={() => returnToMarketplace()}
/>
```
