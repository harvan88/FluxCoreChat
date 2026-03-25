---
id: "metrics-service"
type: "infrastructure-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/metrics.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (System Metrics Tables), PostgreSQL (Recalculate Stats functions)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Métricas y Salud del Sistema" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Buffered metric collection, Periodic DB flush (30s), Timing decorators (@timed), Health check aggregation, Vector store stats calculation, Cache cleanup" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ MetricsService (Error Tracking & Performance)

## 🎯 Propósito
El `MetricsService` es el núcleo de monitoreo operacional de FluxCore (RAG-011). No solo rastrea errores, sino que mide el rendimiento y la salud estructural del sistema, permitiendo optimizaciones basadas en datos reales de uso de base de datos y recuperación semántica.

## 🚥 Colección de Métricas
Soporta tres tipos fundamentales de telemetría:
1.  **Counter**: Incremental (ej: `retrieval.query`).
2.  **Gauge**: Valor instantáneo (ej: uso de disco).
3.  **Histogram**: Distribución estadística, usado principalmente para latencias vía el decorador `@timed`.

## 🧬 Estrategia de Flush Eficiente
Para minimizar la carga en la base de datos principal:
-   **Buffer**: Acumula métricas en memoria.
-   **Flush Periódico**: Escribe en la tabla `fluxcore_system_metrics` cada 30 segundos o cuando llega a 100 registros.
-   **Resiliencia**: Si la base de datos falla, mantiene el buffer hasta un límite seguro antes de descartar métricas antiguas para proteger la memoria del proceso.

## 🛡️ Diagnóstico de Salud (Health Check)
El servicio consolida la vista de "salud" del backend:
-   **DB**: Disponibilidad de PostgreSQL.
-   **Vector Index**: Existencia de índices HNSW críticos para RAG.
-   **Performance**: Calcula promedios de tiempo de respuesta y tasas de acierto de cache (`cacheHitRate`) de los últimos 5 minutos.
-   **Mantenimiento**: Orquestador de la limpieza periódica de cache expirado para mantener el disco limpio.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { metricsService } from 'apps/api/src/services/metrics.service.ts';

// Ejemplo de invocación típica
const result = await metricsService.execute(params);
```
