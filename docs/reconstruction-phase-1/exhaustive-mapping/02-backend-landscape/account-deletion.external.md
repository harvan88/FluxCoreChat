---
id: "account-deletion-external"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/account-deletion.external.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FluxCore Service, Snapshot Service, OpenAI Sync Service, Drizzle (jobs, assistants, vector_stores)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Purga en Proveedores Externos (vía Adapters)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Stateful phase processing, HMAC token generation, OpenAI cleanup orchestration, Exponential backoff retry" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AccountDeletionExternalService

## 🎯 Propósito
Gestiona la limpieza de datos en infraestructuras fuera de nuestro control directo (OpenAI, Pincone, etc.). Es un servicio **Stateful** que rastrea el progreso de la purga fase por fase para asegurar que nada quede olvidado en la nube del proveedor externo.

## 🚥 Fases de Procesamiento
Divide la purga externa en tres etapas incrementales:
1.  **`assistants`**: Elimina perfiles de IA remotos.
2.  **`files`**: Borra archivos físicos en el storage del proveedor (ej: OpenAI Files).
3.  **`vectorStores`**: Elimina las estructuras de memoria remota (ej: Vector Stores de OpenAI).

## 🛡️ Tokens de Seguridad HMAC
Genera tokens de eliminación efímeros (`generateDeletionToken`) firmados con HMAC-SHA256. Estos tokens contienen evidencias de que el snapshot ya fue descargado/reconocido, sirviendo como "Certificado de Autorización" para que los adaptadores ejecuten el borrado final en el extremo externo.

## 🔄 Resiliencia y Retries
Implementa una política de reintentos inteligente:
- **`runWithRetry`**: Ejecuta cada borrado con esperas exponenciales configurables (5s, 15s, 45s).
- **`benignNotFound`**: Reconoce errores 404 de los proveedores externos como "éxitos implícitos" (si no existe, se considera borrado), evitando bloqueos en la cola por recursos que el usuario borró manualmente en el dashboard del proveedor.

## 📂 Integración con Snapshots
Antes de iniciar cualquier purga externa, verifica si el usuario solicitó un respaldo. Si la configuración de `dataHandling` no es `delete_all`, el servicio invoca atómicamente a `AccountDeletionSnapshotService` antes de proseguir con el borrado irreversible.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: account-deletion.external
import { accountDeletion.external } from 'apps/api/src/services/account-deletion.external.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await accountDeletion.external.process(input);
```
