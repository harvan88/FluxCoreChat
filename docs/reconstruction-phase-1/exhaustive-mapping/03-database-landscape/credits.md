---
id: "db-credits"
type: "database-table"
status: "stable"
criticality: "critical"
location: "packages/db/src/schema/credits.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Sistema de billetera y contabilidad de uso" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FK a Accounts, Conversations. Centro de control de costos" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Billing & Resource Quotas" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Atomic balance updates, Ledger-based auditing, Policy-driven pricing, Token-budget management (Session-based)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Tables: credits_system

## 🎯 Propósito
Este sistema de tablas gestiona la economía interna de FluxCore. Se encarga de tarificar el uso de modelos de IA, la ejecución de flujos y el acceso a funciones premium mediante una billetera virtual de créditos.

## 🚥 Estructura del Ledger (Discovery)

### `credits_wallets`
Almacena el saldo actual (`balance`) de cada cuenta. Es el punto de control para permitir o denegar ejecuciones costosas.

### `credits_ledger`
El libro contable inmutable. Cada cambio en el balance genera un registro aquí con el `delta` (positivo o negativo), el `entry_type` y metadatos del motivo (ej: "Mensaje IA", "Recarga de saldo").

### `credits_policies`
Define el "precio" de cada recurso:
-   `cost_credits`: Cuántos créditos cuesta la operación.
-   `token_budget`: Cuántos tokens se otorgan por ese costo.
-   `duration_hours`: Ventana de tiempo de validez del presupuesto (ej: 24h para una sesión de chat).

## 🧬 Gestión de Sesiones (Connections)
La tabla `credits_conversation_sessions` es una optimización para el chat:
1.  Cuando la IA responde en una conversación, el sistema "cobra" una vez y abre una sesión de 24h.
2.  Posteriores mensajes en la misma conversación consumen contra el `token_budget` de la sesión activa en lugar de cobrar créditos adicionales, hasta que se agotan los tokens o expira el tiempo.

## 🛡️ Reglas Financieras (Operations)
1.  **Balance Atómico**: Los updates al saldo se realizan mediante SQL (`balance = balance + delta`) para evitar condiciones de carrera en ráfagas de mensajes.
2.  **Auditoría Total**: Ningún crédito puede desaparecer o aparecer sin una entrada correspondiente en el `ledger`. El `account_id` y `created_at` están indexados para reportes rápidos de facturación.
3.  **Default Deny**: Si una cuenta no tiene registro en `credits_wallets`, el sistema asume saldo 0 para prevenir consumos no autorizados.

## 💡 Ejemplo de Uso
```typescript
// Cobrar créditos atómicamente (evita race conditions)
import { db, creditsWallets } from '@fluxcore/db';
import { eq, sql } from 'drizzle-orm';

await db.update(creditsWallets)
  .set({ balance: sql`balance - ${cost}` })
  .where(eq(creditsWallets.accountId, accountId));
```
