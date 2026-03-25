---
id: "workspace-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/workspace.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (workspaces, workspaceMembers, workspaceInvitations, users, accounts)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Sistema de Colaboración Empresarial" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Workspace lifecycle, RBAC management (Owner/Admin/Member), Invitation workflow with tokens, Permission validation" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ WorkspaceService

## 🎯 Propósito
El `WorkspaceService` gestiona las unidades de trabajo colaborativo. Permite que múltiples usuarios operen dentro del contexto de una cuenta de negocio, compartiendo activos (como agentes, chats y bases de conocimiento) bajo un esquema de permisos centralizado.

## 🚥 Roles y RBAC
Implementa un sistema de control de acceso basado en roles (RBAC) con niveles predefinidos:
-   **Owner**: Control total sobre el workspace y su facturación (un solo dueño por workspace).
-   **Admin**: Gestión de miembros, configuraciones y activos.
-   **Member**: Acceso operativo a las funciones de chat y agentes.

## 🧬 Flujo de Invitaciones
Gestión completa del ciclo de invitación:
1.  **Creación**: Genera un token único de invitación asociado a un email y rol.
2.  **Expiración**: Las invitaciones caducan automáticamente a los 7 días.
3.  **Aceptación**: Al aceptar, el usuario se convierte formalmente en miembro del workspace con los permisos de su rol original en la invitación.

## 🛡️ Validación de Permisos
El servicio proporciona métodos de utilidad para verificar si un usuario tiene capacidades específicas (ej. `canManage`) antes de realizar acciones críticas, sirviendo de base para los guards de las rutas de la API.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { workspaceService } from 'apps/api/src/services/workspace.service.ts';

// Ejemplo de invocación típica
const result = await workspaceService.execute(params);
```
