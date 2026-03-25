---
id: "permissions-routes"
type: "api-routes"
status: "stable"
criticality: "high"
location: "apps/api/src/routes/permissions.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "PermissionService, AuthMiddleware" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API de Gestión de Assets Compartidos (CRM de Permisos)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Access checking (read/write/admin), Accessible asset listing (Owned/Shared/Marketplace), Asset sharing workflow, Permission revocation, Expiry monitoring" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Permissions Routes

## 🎯 Propósito
Las `Permissions Routes` gestionan la compartición selectiva de activos digitales entre diferentes cuentas dentro del ecosistema FluxCore. Es el componente que permite que el sistema de conocimiento (RAG) escale, permitiendo que un Vector Store o una Instrucción sea "prestada" a otra cuenta manteniendo el control del dueño original.

## 🚥 Niveles de Acceso
Soporta una jerarquía de permisos sobre los assets (`vector_store`, `instruction`, `tool`):
1.  **Read**: Capacidad de usar el asset en asistentes (ej: buscar en el conocimiento).
2.  **Write**: Permiso para modificar el contenido del asset.
3.  **Admin**: Control total, incluyendo la capacidad de borrar el asset o compartirlo con terceros.

## 🧬 Descubrimiento de Activos
La ruta `/accessible` es fundamental para el frontend del "Explorador de Conocimiento". Permite filtrar assets por su origen:
-   **Owned**: Creados por la cuenta actual.
-   **Shared**: Recibidos desde otras cuentas.
-   **Public/Marketplace**: Disponibles para toda la plataforma.

## 🛡️ Seguridad y Auditoría
-   **Share Workflow**: Todas las operaciones de "compartir" requieren que el emisor tenga nivel `admin` sobre el recurso solicitado.
-   **Caducidad (Expiry)**: Permite definir permisos temporales que el sistema filtra automáticamente una vez superada la fecha de expiración, ideal para accesos temporales de consultoría o soporte técnico.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './permissions.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/permissions', router);
```
