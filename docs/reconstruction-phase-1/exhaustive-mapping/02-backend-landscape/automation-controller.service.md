---
id: "automation-controller-service"
type: "orchestration-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/automation-controller.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (automationRules), AutomationScheduler, AI Service" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Reglas y Disparadores (COR-007)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Effective mode resolution (Hierarchical), Trigger matching (Keywords/Schedules/Webhook), Workflow execution, Scheduler notification" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AutomationControllerService (COR-007)

## 🎯 Propósito
El `AutomationController` es el cerebro táctico que decide **cuándo** y **cómo** debe intervenir la IA. Implementa el estándar `TOTEM 9.9.1` para gestionar la autonomía del sistema, permitiendo que las cuentas definan reglas precisas para la IA.

## 🚥 Jerarquía de Modos
El servicio resuelve el modo de operación siguiendo una prioridad estricta:
1.  **Relationship Rule**: Regla específica para un contacto.
2.  **Global Account Rule**: Regla para toda la cuenta.
3.  **System Default**: Sugerencia supervisada (`suggest`).

## 🛠️ Motor de Triggers y Filtros
Decide si un evento califica para procesamiento basado en:
-   **Palabras Clave**: Dispara acciones si el mensaje entrante contiene términos específicos.
-   **Horarios**: Integración con cron para acciones periódicas.
-   **CondicionesContextuales**: Evalúa el tipo de mensaje, el remitente o la hora del día antes de permitir que la IA responda.

## 🔄 Webhooks y Workflows
Permite la ejecución de "Flujos de Trabajo" (Workflows) disparados externamente vía Webhooks. Cada Webhook tiene un token único que el controlador valida para ejecutar acciones automáticas (ej. enviar una respuesta o una notificación) de forma asíncrona.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { automationControllerService } from 'apps/api/src/services/automation-controller.service.ts';

// Ejemplo de invocación típica
const result = await automationControllerService.execute(params);
```
