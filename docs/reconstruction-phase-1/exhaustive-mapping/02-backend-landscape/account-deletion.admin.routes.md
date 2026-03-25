---
id: "account-deletion-admin-routes"
type: "backend-route"
status: "stable"
criticality: "high"
location: "apps/api/src/routes/account-deletion.admin.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Account Deletion Admin Service, System Admin Service" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Panel de Control Forense y de Borrado" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Job listing, Retry logic, Orphan lookup, Resource monitoring" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🚀 AccountDeletionAdminRoutes

## 🎯 Propósito
Endpoints de uso interno y administrativo para supervisar el complejo proceso de eliminación de cuentas. Proporciona visibilidad total sobre los "Jobs" de borrado, permitiendo resolver atascos técnicos y auditar la integridad de la base de datos tras las purgas.

## 🛡️ Seguridad Crítica
- **Scope `ACCOUNT_DELETE_FORCE`**: Todas las rutas requieren este permiso de administrador de sistema explícito. Sin él, los endpoints devuelven un 403, incluso para otros administradores de nivel inferior.

## 📊 Capacidades de Monitoreo
- **Listado de Jobs (`/`)**: Permite ver el estado en tiempo real (wip, completed, failed) de las solicitudes de borrado.
- **Métricas (`/stats`)**: Resumen de carga de la cola de borrado y salud del worker.
- **Audit Logs (`/logs`)**: Acceso detallado a cada paso ejecutado por los servicios de purga (Local y External).

## 🔍 Herramientas Forenses
- **References (`/references`)**: Permite saber EXACTAMENTE cuántos registros de qué tablas están vinculados a un `accountId` antes de ejecutar el borrado.
- **Orphans (`/orphans`)**: Localiza registros que han quedado "huérfanos" (sin padre activo) en la base de datos, vital para el mantenimiento preventivo del esquema.

## 🔄 Operaciones de Recuperación
- **Retry Phase (`/:jobId/retry-phase`)**: Permite reiniciar manualmente una fase fallida (ej: si la limpieza de OpenAI falló por un problema temporal de red), sin tener que volver a empezar todo el proceso de borrado.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './account-deletion.admin.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/account/deletion.admin', router);
```
