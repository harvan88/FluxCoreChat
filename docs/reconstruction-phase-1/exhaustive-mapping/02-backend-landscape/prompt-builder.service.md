---
id: "prompt-builder-service"
type: "logic-service"
status: "needs_review"
criticality: "high"
location: "apps/api/src/services/fluxcore/prompt-builder.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "CognitiveDispatcher" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Arquitecto de Prompts (Canon §4.10)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "System prompt assembly, Business identity injection, Policy directive prioritization (Tone/Rules), Technical instructions merging, Knowledge resource mapping (Templates/Services)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ PromptBuilderService

## 🎯 Propósito
El `PromptBuilderService` es el arquitecto del "pensamiento" de la IA. Su responsabilidad es fusionar los objetivos técnicos del asistente con las restricciones comerciales del negocio (Canon §4.10), garantizando que la IA responda siempre bajo la identidad y reglas de la empresa.

**Actualización 2026-04-01:** Se modificó para instruir explícitamente el uso de marcadores `CALL_TEMPLATE:` en lugar del tool `send_template` para el runtime local. Esto busca simplificar el protocolo de plantillas pero ha generado un problema crítico: el LLM ahora genera marcadores mezclados con texto conversacional, y el runtime no logra separarlos correctamente.

## 🚥 Priorización de Capas
El prompt generado sigue un orden estricto de precedencia:
1.  **Identidad del Negocio**: Define quién habla (DisplayName/Bio).
2.  **Directivas de Política (VOICE OF BUSINESS)**: Prioridad máxima. Define el tono, uso de emojis, idioma y reglas específicas para el contacto actual.
3.  **Instrucciones Técnicas**: El conocimiento experto del asistente.
4.  **Recursos de Conocimiento**: Catálogo de plantillas y servicios disponibles para ser referenciados.
5.  **Directivas de Ejecución (2026-04-01)**: Instrucciones específicas para el runtime local sobre el uso de `CALL_TEMPLATE:`. Esta sección se agregó para soportar el nuevo protocolo de plantillas.

## 🧬 Contexto Progresivo
El servicio inyecta dinámicamente las `contactRules` (Notas y Preferencias) en el prompt de sistema. Esto permite que el LLM "recuerde" detalles específicos del usuario (ej: "Prefiere ser contactado por la tarde") sin necesidad de que el desarrollador gestione el guardado manual de cada preferencia en el prompt.

## 🛡️ Función Pura e Inocua
Siguiendo las mejores prácticas, este servicio es una **función pura**. No tiene efectos secundarios, no lee de la base de datos y no emite eventos. Recibe el contexto resuelto por el Dispatcher y devuelve un objeto `BuiltPrompt`, facilitando las pruebas unitarias y garantizando la predictibilidad del comportamiento de la IA.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { promptBuilderService } from 'apps/api/src/services/fluxcore/prompt-builder.service.ts';

// Ejemplo de invocación típica
const result = await promptBuilderService.execute(params);
```
