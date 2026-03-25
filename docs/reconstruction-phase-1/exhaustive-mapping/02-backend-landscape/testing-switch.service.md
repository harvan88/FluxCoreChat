---
id: "testing-switch-service"
type: "infrastructure-service"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/fluxcore/testing-switch.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Legacy Runtimes, New Kernel-based Paths" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Selector de Rutas de Ejecución para Pruebas" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Legacy/New path toggling, Parallel execution with result comparison, Regression detection, Action count validation" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ TestingSwitchService

## 🎯 Propósito
El `TestingSwitchService` es una herramienta de ingeniería diseñada para facilitar la transición segura entre la arquitectura legacy (v8.0) y el nuevo sistema basado en Kernel y Señales de Realidad. Permite a los desarrolladores conmutar o comparar en tiempo real el comportamiento de ambos "caminos" de ejecución.

## 🚥 Modos de Operación
1.  **Switching Puro**: Configura globalmente si el sistema debe procesar señales usando el camino antiguo o el nuevo, facilitando el despliegue gradual (Canary Release).
2.  **Ejecución Paralela**: El método `executeBothPaths` dispara la lógica en ambos sistemas para una misma entrada, permitiendo detectar discrepancias antes de que el código llegue a producción.

## 🧬 Lógica de Comparación
El servicio incluye un motor básico de `compareResults` que analiza:
-   **Count de Acciones**: ¿Ambos sistemas generaron la misma cantidad de respuestas?
-   **Diferencias Estructurales**: Detecta cambios en los payloads de salida que podrían romper la compatibilidad con el frontend o las integraciones.

## 🛡️ Herramienta de Migración
Este servicio es fundamental para la **Fase de Reconstrucción**. Actúa como la red de seguridad que garantiza que las nuevas implementaciones (basadas en proyectores y workers) producen los mismos efectos de negocio que el código legacy, permitiendo una migración con "Zero Regression".

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { testingSwitchService } from 'apps/api/src/services/fluxcore/testing-switch.service.ts';

// Ejemplo de invocación típica
const result = await testingSwitchService.execute(params);
```
