---
id: "error-tracking"
type: "middleware-service"
status: "stable"
criticality: "high"
location: "apps/api/src/middleware/error-tracking.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Logger, Process Events (SIGTERM/SIGINT), External Error API" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Observabilidad y Resiliencia" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Error buffering (batch sending), Operational vs Programming error distinction, Fatal error flushing, Uncaught exception handling, Graceful shutdown synchronization" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🛡️ Error Tracking

## 🎯 Propósito
El `ErrorTracker` es el guardián de la estabilidad del sistema. Su función es capturar, categorizar y reportar fallos en tiempo real, permitiendo que el equipo de desarrollo reaccione ante incidentes antes de que afecten masivamente a los usuarios.

## 🚥 Gestión de Errores Operacionales
Distingue explícitamente entre:
-   **Errores Operacionales**: Fallos esperados en tiempo de ejecución (ej: stock agotado, token expirado). Se marcan con `isOperational = true` y no disparan alarmas críticas.
-   **Errores de Programación**: Bugs reales o fallos de infraestructura (ej: `null reference`, `DB connection lost`). Estos disparan el protocolo de flush inmediato y alertas de alta prioridad.

## 🧬 Estrategia de Buffering
Para proteger el rendimiento en producción:
1.  Los errores se acumulan en un buffer interno (máx 100 entradas).
2.  Un intervalo de 30 segundos vacía el buffer hacia un servicio externo (Sentry/Custom API).
3.  **Excepción**: Los errores de severidad `fatal` disparan un flush instantáneo, ignorando el buffer.

## 🛡️ Cierre de Ciclo de Vida (Graceful Shutdown)
El tracker está integrado con los eventos del sistema operativo:
-   **SIGTERM/SIGINT**: Antes de que el proceso muera, el tracker fuerza un flush final para asegurar que los últimos errores (posiblemente la causa del cierre) queden registrados.
-   **Uncaught Exceptions**: Captura el último aliento del proceso, registrando el stack trace completo antes de permitir que Node.js termine la ejecución.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: error-tracking
import { errorTracking } from 'apps/api/src/middleware/error-tracking.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await errorTracking.process(input);
```
