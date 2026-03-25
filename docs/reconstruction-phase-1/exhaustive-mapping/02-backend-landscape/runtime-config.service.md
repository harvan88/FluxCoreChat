---
id: "runtime-config-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/runtime-config.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (account_runtime_config)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Soberanía de Ejecución por Cuenta" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Runtime selection (@fluxcore/asistentes default), Hot-swapping (setRuntime), Config object persistence" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ RuntimeConfigService

## 🎯 Propósito
Este servicio define "Quién" procesa la lógica de una cuenta de negocio. Permite alternar entre diferentes paradigmas de ejecución (ej: Sistema de Asistentes Clásico vs Motor de Automatización WES) de forma independiente para cada cliente.

## 🚥 Soberanía de Runtime
-   **Default Strategy**: Si una cuenta no tiene una configuración explícita, el servicio siempre devuelve `@fluxcore/asistentes` como runtime activo.
-   **Configuración Dinámica**: El campo `config` permite almacenar parámetros específicos para el runtime elegido (p. ej., endpoints de Webhooks o flags de experimentación).

## 🔄 Operaciones de Cambio (Hot-Swap)
-   **`setRuntime`**: Utiliza una operación de **Upsert** (`onConflictDoUpdate`) para cambiar instantáneamente el motor de ejecución sin necesidad de reiniciar el backend. El cambio es observado por el `RuntimeGateway` en el siguiente mensaje recibido.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { runtimeConfigService } from 'apps/api/src/services/runtime-config.service.ts';

// Ejemplo de invocación típica
const result = await runtimeConfigService.execute(params);
```
