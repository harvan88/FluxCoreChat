---
id: "account-deletion-service"
type: "backend-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/account-deletion.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Job Queue, Snapshot Service, WS Broadcast" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Borrado Seguro y GDPR Compliance" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Manejo de Ciclo de Vida del Job (Pending -> Snapshot -> Cleanup -> Completed)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AccountDeletionService

## 🎯 Propósito
Es el orquestador del "Derecho al Olvido". FluxCore no borra datos con un simple `DELETE`. Inicia un proceso complejo de múltiples etapas que incluye la generación de un "Snapshot" (paquete de datos descargable para el usuario antes de morir) y la limpieza coordinada de proveedores externos (OpenAI, S3, Bases de Datos vectoriales).

## 📦 Estado y Datos (Machine States)
Gestiona la tabla `account_deletion_jobs` con los siguientes estados clave:
- `pending`: El usuario pidió el borrado.
- `snapshot_ready`: El backup ZIP está listo para descarga.
- `external_cleanup`: Estamos borrando datos en nubes externas.
- `completed`: El rastro de la cuenta ha sido eliminado.

## 🔄 Flujos de Interacción
1. **Preparación de Snapshot (`prepareSnapshot`):** Invoca al `accountDeletionSnapshotService` para empaquetar todo el historial del chat.
2. **Confirmación con Consentimiento (`confirmDeletion`):** Requiere que el usuario haya descargado el snapshot o aceptado explícitamente la pérdida de datos. Dispara el evento `account:deletion_confirmed` vía WebSockets.
3. **Cola de Trabajo (`enqueueAccountDeletionJob`):** Delega la limpieza física a un Worker de segundo plano para no bloquear el API.

## 💡 Detalles Críticos
- **Token TTL:** Los enlaces de descarga del backup expiran en 48 horas por seguridad.
- **Audit Log:** Registra UserAgent y Timestamps de cada paso del consentimiento legal.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { accountDeletionService } from 'apps/api/src/services/account-deletion.service.ts';

// Ejemplo de invocación típica
const result = await accountDeletionService.execute(params);
```
