---
id: "ai-rate-limiter-service"
type: "infrastructure-service"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/ai-rate-limiter.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "LLMClient (consumers), AccountEntitlements (config)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Control de Cuotas por Cuenta" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Sliding window RPM/RPH checks, Burst penalty (cooldown), Per-account overrides, Usage statistics tracking" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AIRateLimiter

## 🎯 Propósito
El `AIRateLimiter` garantiza un uso equitativo de los recursos de IA entre todas las cuentas. Implementa un control de tráfico granular para evitar que una sola cuenta monopolice la capacidad de cómputo o dispare costos imprevistos por procesos automatizados fuera de control.

## 🚥 Ventanas Deslizantes
Utiliza el algoritmo de ventana deslizante en memoria para validar dos límites simultáneos:
-   **RPM (Requests Per Minute)**: Máximo de peticiones permitidas en los últimos 60 segundos (Default: 10).
-   **RPH (Requests Per Hour)**: Máximo de peticiones permitidas en los últimos 60 minutos (Default: 100).

## 🧬 Penalización por Ráfagas (Burst)
Si una cuenta alcanza el límite por minuto, el servicio no solo bloquea la siguiente petición, sino que aplica un `cooldownAfterBurstMs` (Default: 5s). Esto obliga a los sistemas automatizados a "enfriarse", evitando que saturen el backend apenas se libera un slot de tiempo.

## 🛡️ Flexibilidad y Overrides
Aunque el sistema tiene límites globales, el servicio permite registrar `overrides` por cuenta. Esto es fundamental para clientes con planes Enterprise o procesos de carga masiva autorizados, quienes pueden tener límites de RPM/RPH significativamente superiores a la base.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { aiRateLimiterService } from 'apps/api/src/services/ai-rate-limiter.service.ts';

// Ejemplo de invocación típica
const result = await aiRateLimiterService.execute(params);
```
