---
id: "usage-service"
type: "logic-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/usage.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (usageLogs, accountCredits, creditTransactions)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Billing y Gestión de Créditos (RAG-010)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Token-to-credit conversion, Plan logic (Free/Starter/Pro), Transaction auditing, Daily/Monthly usage resets, Limit enforcement" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ UsageService

## 🎯 Propósito
El `UsageService` es el guardián de la economía del sistema. Gestiona el ciclo de vida de los créditos de las cuentas, rastreando el consumo de recursos de IA (tokens) y asegurando que las operaciones se mantengan dentro de los límites del plan contratado.

## 🚥 Modelo de Créditos
FluxCore opera bajo una moneda virtual ("Créditos"). El servicio traduce el uso técnico a costo financiero:
-   **Embeddings**: Costo por token según el proveedor (OpenAI vs Cohere).
-   **Retrieval**: Costo flat por consulta exitosa.
-   **Processing**: Costo por chunk procesado en el pipeline de ingesta.

## 🧬 Gestión de Planes
Implementa niveles de suscripción con límites duros (`PLAN_LIMITS`):
-   **Free**: 10 créditos diarios / 100 mensuales.
-   **Starter/Pro**: Límites escalados para uso profesional.
-   **Enterprise**: Uso ilimitado basado en contrato.

## 🛡️ Transaccionalidad
Cada consumo genera dos registros atómicos:
1.  **Usage Log**: Detalle técnico (qué se usó, cuántos tokens, qué modelo).
2.  **Credit Transaction**: Detalle contable (cuánto se descontó y cuál es el saldo restante). Esto permite una auditoría financiera transparente del uso de la IA.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { usageService } from 'apps/api/src/services/usage.service.ts';

// Ejemplo de invocación típica
const result = await usageService.execute(params);
```
