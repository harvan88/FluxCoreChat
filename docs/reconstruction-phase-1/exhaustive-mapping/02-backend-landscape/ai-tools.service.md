---
id: "ai-tools-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/ai-tools.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "AITemplateService" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Ejecución de Funciones (Function Calling)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tool definition exposure, Tool execution routing, Argument validation (JSON), Output formatting" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AIToolService

## 🎯 Propósito
Este servicio gestiona la capacidad de "Function Calling" (Herramientas) de los modelos de lenguaje. Define qué acciones puede tomar la IA dentro del sistema y orquestar su ejecución segura.

## 🚥 Herramientas Disponibles
1.  **`send_template`**: Permite a la IA enviar una plantilla de mensaje pre-autorizada al usuario. Recibe `template_id` y `variables`.
2.  **`list_available_templates`**: Permite a la IA consultar qué plantillas tiene permitido usar antes de intentar enviar una.

## 🛠️ Mecánica de Ejecución
-   **Routing**: El método `executeTool` recibe una petición estructurada del LLM, valida los argumentos (JSON strictly typed) y redirige la llamada al servicio correspondiente (ej. `AITemplateService`).
-   **Error Isolation**: Si una herramienta falla, el servicio captura la excepción y retorna un JSON descriptivo a la IA, permitiéndole "entender" qué salió mal (ej. variables faltantes) y corregir su siguiente paso.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { aiToolsService } from 'apps/api/src/services/ai-tools.service.ts';

// Ejemplo de invocación típica
const result = await aiToolsService.execute(params);
```
