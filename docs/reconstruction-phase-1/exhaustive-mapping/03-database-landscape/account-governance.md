---
id: "db-account-governance"
type: "core"
status: "stable"
criticality: "high"
location: "packages/db/src/schema/account-runtime-config.ts, packages/db/src/schema/fluxcore-account-policies.ts, packages/db/src/schema/account-deletion.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Schema Cluster: Account Governance

## 🎯 Propósito
Agrupa las tablas que gobiernan el comportamiento y ciclo de vida de una cuenta: qué runtime usa, cómo opera su IA, y cómo se destruye de forma segura.

## 🚥 Componentes (Discovery)

### 1. `account_runtime_config`
Centraliza la selección de runtime por cuenta.
- **PK**: `account_id` (1:1 con accounts).
- `active_runtime_id`: `@fluxcore/wes` o `@fluxcore/fluxcore`. Define quién procesa la cognición.
- `config`: JSONB para parámetros específicos del runtime (ej: `{ assistantId: 'uuid' }`).

### 2. `fluxcore_account_policies` (Canon v8.3)
Gobierna el CÓMO y CUÁNDO opera la IA.
- `mode`: `auto` / `suggest` / `off`.
- `response_delay_ms`, `turn_window_ms`, `turn_window_typing_ms`, `turn_window_max_ms`: Timing fino para la experiencia de chat.
- `off_hours_policy`: Política fuera de horario (`ignore`, `autorespond`, etc.).

### 3. `account_deletion_jobs` + `account_deletion_logs` + `protected_accounts`
Sistema GDPR-compliant de eliminación de cuentas con:
- **Snapshot antes de borrar**: Genera un archivo descargable con todos los datos.
- **Protección**: Cuentas marcadas como `protected_accounts` no pueden ser eliminadas por el flujo estándar.
- **Auditoría total**: Cada paso del proceso queda en `account_deletion_logs`.

## 🧬 Relaciones (Connections)
- `account_runtime_config` decide qué runtime se usa → afecta al `CognitiveDispatcher`.
- `fluxcore_account_policies` alimenta al `FluxPolicyContextService` para resolver `PolicyContext`.
- `account_deletion_jobs` es procesado por un worker de fondo que ejecuta las fases de borrado.

## 🔗 Dependencias
- **Kernel & Runtimes**: Para ejecución cognitiva.
- **Workflow Controller**: Para instanciar workflows.

## 🛡️ Invariantes (Operations)
1. **Runtime Sovereignty**: El `active_runtime_id` seleccionado por el usuario manda sobre cualquier lógica predefinida (Canon v8.3).
2. **Deletion Safety**: Una cuenta no puede eliminarse si tiene una entrada en `protected_accounts`.
3. **Policy Defaults**: Si no existe registro en `fluxcore_account_policies`, el sistema asume `mode: 'off'` (fail-safe).

## 💡 Ejemplo de Uso
```typescript
// Leer configuración de runtime activo
import { db, accountRuntimeConfig } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

const [config] = await db.select()
  .from(accountRuntimeConfig)
  .where(eq(accountRuntimeConfig.accountId, accountId))
  .limit(1);
```
