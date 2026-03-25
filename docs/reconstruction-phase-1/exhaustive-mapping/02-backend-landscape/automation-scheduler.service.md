---
id: "automation-scheduler-service"
type: "reliability-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/automation-scheduler.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Croner, Automation Controller, Drizzle (automation_rules)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Ejecución Temporal de Reglas" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Cron job lifecycle management, Timezone-aware scheduling, Account-level hot-refresh" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AutomationSchedulerService

## 🎯 Propósito
Este servicio es el **Reloj Biológico** de las automatizaciones en FluxCore. Se encarga de instanciar y gestionar la vida de los trabajos programados (Cron Jobs) definidos en las reglas de automatización. Permite que el sistema ejecute acciones de IA o notificaciones de forma autónoma en momentos específicos del tiempo, sin necesidad de un mensaje entrante como disparador.

## ⏰ Gestión de Trabajos (`Croner`)
Utiliza la librería `Croner` para manejar expresiones cron complejas con soporte nativo para **Timezones**. Esto es crítico para negocios que operan en diferentes regiones geográficas y necesitan que sus automatizaciones (ej: saludos de buenos días o reportes) se ejecuten en la hora local del cliente/negocio.

## 🔄 Hot-Refresh de Configuración
Implementa una lógica de actualización granular para evitar reiniciar todos los cron jobs del sistema cuando solo cambia una regla:
- **`refreshAccount`**: Detiene y reinicia únicamente los trabajos pertenecientes a un `accountId` específico. Esto minimiza el impacto en el rendimiento global y previene la interrupción de tareas en otras cuentas.
- **`clearJobsForRule`**: Limpia específicamente los disparadores vinculados a una regla modificada o eliminada.

## 🚥 Ciclo de Ejecución Seguro
Cuando el reloj alcanza el tiempo programado, el scheduler no ejecuta la acción a ciegas; realiza una validación final:
1.  **Evaluación de Trigger**: Llama al `AutomationController` para verificar que la regla sigue habilitada y que cumple las condiciones actuales.
2.  **Workflow Execution**: Solo si la evaluación es positiva, dispara el flujo de trabajo correspondiente (`generate_response`, `notify`, etc.).

## 🛡️ Resiliencia y Manejo de Errores
El servicio está diseñado para ser autocurativo:
- Loggea errores en expresiones cron inválidas sin detener el servicio global.
- Captura excepciones durante la ejecución de los workflows programados, asegurando que un fallo en una tarea específica no "mate" el hilo del scheduler.
- **Bootstrap Robusto**: Durante el arranque del servidor (`init`), escanea toda la base de datos de reglas para reconstruir el estado de programación en memoria.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { automationSchedulerService } from 'apps/api/src/services/automation-scheduler.service.ts';

// Ejemplo de invocación típica
const result = await automationSchedulerService.execute(params);
```
