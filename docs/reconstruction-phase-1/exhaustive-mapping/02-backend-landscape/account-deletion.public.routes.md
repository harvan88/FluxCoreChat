---
id: "account-deletion-public-routes"
type: "backend-route"
status: "stable"
criticality: "medium"
location: "apps/api/src/routes/account-deletion.public.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Account Deletion Service, Bun File System" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Portal Público de Portabilidad de Datos" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Status polling by token, Snapshot secure download, Download event logging" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🚀 AccountDeletionPublicRoutes

## 🎯 Propósito
Expone los endpoints públicos (protegidos por tokens efímeros) que permiten a un usuario descargar su backup de datos (Snapshot) una vez que el proceso de borrado de cuenta ha comenzado pero aún no se ha purgado el almacenamiento de snapshots.

## 🛡️ Seguridad por Token
A diferencia de otras rutas, estos endpoints no requieren un token de sesión de usuario (JWT tradicional), ya que el usuario puede haber perdido el acceso a su cuenta durante el borrado. En su lugar, utiliza un **Snapshot Token** único enviado por email o almacenado en el Job:
- **Validación Estricta:** El token debe ser válido, pertenecer al `jobId` y no haber expirado.
- **Códigos de Error:** Maneja estados específicos como 410 (Gone) si el snapshot ya no existe o el token expiró.

## 🛠️ Endpoints
- **`GET /:jobId/status`**: Permite al cliente consultar si el snapshot ZIP ya está listo para ser descargado.
- **`GET /:jobId/download`**: Sirve el archivo ZIP binario directamente desde el sistema de archivos de Bun.

## 📊 Registro de Descarga
Al completarse la descarga, la ruta invoca a `markSnapshotDownloaded`, registrando metadatos como el `User-Agent` del navegador. Esto sirve como prueba de cumplimiento de que el usuario efectivamente recibió sus datos antes de la purga final.

## 💡 Flujo de Usuario
Este componente es el que alimenta la "página de confirmación de borrado" que ve el usuario final, permitiéndole obtener su archivo de portabilidad antes de que su identidad desaparezca del sistema.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './account-deletion.public.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/account/deletion.public', router);
```
