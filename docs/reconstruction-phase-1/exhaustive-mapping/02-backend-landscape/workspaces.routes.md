---
id: "workspaces-routes"
type: "api-routes"
status: "stable"
criticality: "medium"
location: "apps/api/src/routes/workspaces.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "WorkspaceService, AuthMiddleware" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API de Colaboración Grupal" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Workspace CRUD, Role-based member management (Owner/Operator), Invitation lifecycle (Token-based email invites), Permission verification (canManage), Personal invitation discovery (FC-531)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Workspaces Routes

## 🎯 Propósito
Esta API habilita la naturaleza colaborativa de FluxCore, permitiendo que múltiples usuarios compartan el acceso a cuentas, contactos y automatizaciones dentro de un entorno seguro y jerárquico llamado "Workspace".

## 🚥 Jerarquía de Roles
Implementa una segregación de funciones clara en las rutas:
-   **Owner (Dueño)**: Único con permiso para eliminar el workspace o degradar a otros dueños.
-   **Operator (Operador)**: Puede interactuar con los recursos pero tiene limitaciones en la gestión de miembros.
-   **Invitado**: En espera de aceptación de invitación.

## 🧬 Sistema de Invitaciones (Token-based)
Maneja el flujo de incorporación de nuevos colaboradores:
1.  **Creación**: Generación de un registro de invitación vinculado a un email.
2.  **Descubrimiento (FC-531)**: Un usuario recién registrado puede ver qué invitaciones tiene pendientes consultando por su email.
3.  **Aceptación**: El endpoint `/accept` canjea el token por una membresía oficial en el workspace, heredando los permisos pre-asignados.

## 🛡️ Verificación de Membresía
Todas las rutas de detalle (`/:id`) incluyen guardias de pertenencia: No basta con estar autenticado, el servicio valida explícitamente que el `userId` de la sesión sea un miembro activo del workspace solicitado antes de devolver cualquier dato, garantizando el aislamiento de información entre diferentes grupos de trabajo.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './workspaces.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/workspaces', router);
```
