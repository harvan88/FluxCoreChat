---
id: "ai-circuit-breaker-service"
type: "infrastructure-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/ai-circuit-breaker.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "LLMClient (consumers), Admin Dashboard (reset)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Tolerancia a Fallos por Proveedor" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Per-provider state machine (Closed/Open/Half-Open), Consecutive failure tracking, Cooldown enforcement (60s), Success/Failure recording, Manual reset injection" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AICircuitBreaker

## 🎯 Propósito
El `AICircuitBreaker` protege a FluxCore de fallos en cascada provenientes de proveedores de IA externos (OpenAI, Anthropic, etc.). Su función es detectar cuando un servicio está degradado y "abrir el circuito" para evitar latencias excesivas y errores repetitivos.

## 🚥 Estados del Circuito
El servicio implementa tres estados lógicos por proveedor:
1.  **Closed (Cerrado)**: Funcionamiento normal. Todas las peticiones pasan.
2.  **Open (Abierto)**: Tras N fallos consecutivos (default: 3), el circuito se abre. Las peticiones se rechazan instantáneamente durante un periodo de enfriamiento (cooldown).
3.  **Half-Open (Semi-abierto)**: Tras el cooldown, se permite una única petición de prueba ("probe"). Si tiene éxito, el circuito vuelve a *Closed*; si falla, vuelve a *Open*.

## 🧬 Métricas de Integridad
El servicio no solo gestiona el estado, sino que acumula estadísticas de `totalFailures` y `totalSuccesses` por proveedor. Esto permite a los administradores visualizar la estabilidad de cada modelo y tomar decisiones de enrutamiento basadas en datos históricos de confiabilidad.

## 🛡️ Adaptabilidad Administrativa
Permite la configuración dinámica del umbral de fallos y los tiempos de enfriamiento mediante `setConfig`. Además, ofrece un método `reset` manual que los operadores pueden usar para rehabilitar un proveedor inmediatamente después de que se confirme el fin de un incidente externo.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { aiCircuitBreakerService } from 'apps/api/src/services/ai-circuit-breaker.service.ts';

// Ejemplo de invocación típica
const result = await aiCircuitBreakerService.execute(params);
```
