---
id: "account-deletion-admin-service"
type: "admin-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/account-deletion.admin.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Deletion Queue, Feature Flags, Postgres Monitoring Functions, Drizzle (jobs, logs, accounts)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Panel de Control de Purga y Cumplimiento" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Job monitoring, Phase retries, Orphan detection, SQL-based reference checking" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AccountDeletionAdminService

## 🎯 Propósito
Es el centro de operaciones para administradores del sistema encargado de supervisar el ciclo de vida de eliminación de cuentas. Proporciona visibilidad total sobre los procesos de purga, permitiendo auditoría técnica y recuperación ante fallos en fases específicas.

## 🕵️ Auditoría de Integridad (Postgres In-Depth)
Utiliza funciones avanzadas de base de datos en el esquema `monitoring` para garantizar que la purga sea real y completa:
- **`findAccountReferences`**: Escanea dinámicamente el esquema de la base de datos buscando cualquier fila vinculada al `accountId` que haya sobrevivido a la purga local.
- **`listAccountReferenceOrphans`**: Detecta inconsistencias en la base de datos donde existen claves foráneas apuntando a cuentas que ya no existen, identificando "fugas de datos" potenciales.

## 🚥 Control de Jobs y Fases
Permite gestionar la cola de procesamiento de eliminaciones:
- Lista el estado de los trabajos (pending, in_progress, completed, failed).
- **Retry Logic:** Permite re-encolar fases específicas fallidas (como `external_cleanup`) sin tener que reiniciar todo el proceso de eliminación desde cero.

## 📊 Telemetría de Purga
Se integra con `featureFlags` para consultar el estado de la cola de BullMQ en tiempo real, proporcionando métricas de cuántos trabajos están en espera, fallidos o procesándose activamente.

## 📜 Logs de Cumplimiento
Gestiona el acceso a `accountDeletionLogs`, que registran cada paso del proceso (Snapshot, Purga Local, Purga Externa) con timestamp y evidencias, esencial para cumplir con normativas de protección de datos (GDPR/ARCO).

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { accountDeletion.adminService } from 'apps/api/src/services/account-deletion.admin.service.ts';

// Ejemplo de invocación típica
const result = await accountDeletion.adminService.execute(params);
```
