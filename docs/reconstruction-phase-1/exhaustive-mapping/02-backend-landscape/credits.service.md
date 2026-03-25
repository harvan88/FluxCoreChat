---
id: "credits-service"
type: "logic-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/credits.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (Wallets, Ledger, Policies, Sessions), PG Advisory Locks" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Sistema de Billetera y Billing de IA (RAG-010)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Credit granting, Session opening (24h window), Ledger transactioning, Atomic balance updates, Token consumption" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ CreditsService

## 🎯 Propósito
Este servicio es el motor económico de FluxCore. Gestiona la billetera virtual de créditos de cada cuenta, asegurando que el uso de la IA esté debidamente pagado o autorizado según las políticas de suscripción.

## 🚥 Modelo de Consumo por Sesión
A diferencia del billing por token puro, FluxCore utiliza un modelo de **Sesiones de Conversación**:
1.  **Apertura de Sesión**: Cuando se inicia un turno de IA, el sistema busca una sesión activa para ese par (Cuenta, Conversación, Feature).
2.  **Costo Fijo**: Si no existe sesión, se debita `N` crédito(s) de la billetera y se abre una ventana (ej. 24 horas) con un presupuesto de tokens (ej. 120,000).
3.  **Consumo**: Durante la ventana, los mensajes no cuestan créditos adicionales hasta agotar el presupuesto de tokens o el tiempo.
4.  **Atocimidad**: Utiliza `pg_advisory_xact_lock` para evitar que peticiones concurrentes debiten créditos doblemente al abrir una misma sesión.

## 📊 Ledger (Libro Mayor)
Cada movimiento de saldos (`delta`) se registra en `credits_ledger` como:
-   **`grant`**: Carga de créditos por administrador o pago.
-   **`spend`**: Gasto vinculado a una `sessionId` específica para trazabilidad total.

## 🛡️ Seguridad Financiera
-   **Transacciones**: Todo el proceso de Apertura + Débito + Ledger ocurre dentro de una transacción de base de datos.
-   **Validación de Saldo**: El update de balance incluye un check `balance >= costCredits` a nivel de SQL para prevenir saldos negativos.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { creditsService } from 'apps/api/src/services/credits.service.ts';

// Ejemplo de invocación típica
const result = await creditsService.execute(params);
```
