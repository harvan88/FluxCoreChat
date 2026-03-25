---
id: "templates-capability"
type: "agentic-capability"
status: "stable"
criticality: "medium"
location: "apps/api/src/core/capabilities/templates.capability.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "AITemplateService, MessageCore" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Herramientas de Plantillas para Agentes" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "list_available_templates (discovery), send_template (execution), Variable mapping, Authorization enforcement" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Templates Capability

## 🎯 Propósito
La `Templates Capability` permite que los agentes de FluxCore utilicen mensajes pre-autorizados y estructurados. Esto es vital para entornos de atención al cliente donde la IA debe mantener un tono oficial o enviar información compleja (ej: tarjetas de pago, confirmaciones de reserva) sin variaciones creativas innecesarias.

## 🚥 Herramientas Disponibles
1.  **list_available_templates**: Permite que el agente "lea la biblioteca" de mensajes disponibles para su cuenta. Devuelve IDs, nombres y variables esperadas.
2.  **send_template**: La herramienta de ejecución. El agente proporciona un `template_id` y un objeto de variables, y el sistema se encarga de inyectar los datos en la plantilla y enviarla.

## 🧬 Dinámica de Uso
El flujo esperado para un agente inteligente es:
1.  Identificar la necesidad de enviar una información formal.
2.  Llamar a `list_available_templates` para encontrar el ID adecuado.
3.  Llamar a `send_template` con los datos extraídos de la conversación.

## 🛡️ Seguridad y Control
-   **Aislamiento**: Solo se listan las plantillas explícitamente marcadas como `aiUsageAuthorized` para la cuenta del cliente.
-   **Integridad**: El agente no puede modificar el cuerpo de la plantilla, solo rellenar los "huecos" (variables) predefinidos, asegurando que la comunicación crítica del negocio se mantenga inalterada.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: templates.capability
import { templates.capability } from 'apps/api/src/core/capabilities/templates.capability.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await templates.capability.process(input);
```
