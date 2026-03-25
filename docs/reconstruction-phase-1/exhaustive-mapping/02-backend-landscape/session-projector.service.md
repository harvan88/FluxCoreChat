---
id: "session-projector-service"
type: "projection-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/session-projector.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Kernel BaseProjector, Drizzle (session_projection, signals)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Proyector de Estado de Identidad y Sesiones" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Identity event resolution, Upsert session state (Pending/Active/Invalidated), sequenceNumber tracking" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ SessionProjector (Identity Core)

## 🎯 Propósito
Este servicio implementa el patrón de **Event Sourcing** para el dominio de identidades. Observa las señales de audit-log crudas del Kernel y las proyecta en una tabla optimizada para lectura (`fluxcore_session_projection`), permitiendo saber en tiempo real quién está conectado y desde qué dispositivo.

## 🚥 Eventos Observados
El proyector reacciona a tres hitos críticos del ciclo de vida de identidad:
1.  **`Identity.LoginRequested`**: Marca una sesión en estado `pending`. Registra el método de autenticación y el hash del dispositivo.
2.  **`Identity.LoginSucceeded`**: Eleva la sesión a estado `active`. Vincula formalmente el `sessionId` con un `accountId` y `actorId`.
3.  **`Identity.SessionInvalidated`**: Marca la sesión como `invalidated` (Logout o Expiración), prohibiendo accesos futuros.

## 🛠️ Mecanismo de Proyección
-   **Idempotencia**: Utiliza `onConflictDoUpdate` contra el `sessionId` para asegurar que procesar la misma señal dos veces no duplique registros.
-   **Sequence Tracking**: Mantiene el `lastSequenceNumber` en cada fila. Esto permite que el proyector sepa exactamente por qué punto del stream de señales debe retomar en caso de reinicio del servicio.
-   **Evidence Extraction**: Posee lógica para "limpiar" los datos crudos (`evidenceRaw`) de las señales, mapeando campos variables (`accountPerspective`, `identifier`) de diferentes proveedores de identidad a un esquema canónico interno.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { sessionProjectorService } from 'apps/api/src/services/session-projector.service.ts';

// Ejemplo de invocación típica
const result = await sessionProjectorService.execute(params);
```
