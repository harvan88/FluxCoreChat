---
id: "system-admin-routes"
type: "api-routes"
status: "stable"
criticality: "high"
location: "apps/api/src/routes/system-admin.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "SystemAdminService, Elysia" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Panel de Gestión de Super-Administradores" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Super-admin scope enforcement (*), Privilege escalation protection (No auto-revocation), Admin listing, Selective scope updates (Credits/Policies)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ System Admin Routes

## 🎯 Propósito
Estas rutas internas gestionan el círculo más alto de privilegios en FluxCore. Permiten a los super-administradores del sistema gestionar a otros administradores, definiendo sus áreas de influencia (créditos, políticas, etc.).

## 🚥 El Scope Soberano (`*`)
Toda la ruta está protegida por un guardia de lógica estricta:
-   Solo usuarios con el scope `*` (asterisco) pueden realizar peticiones.
-   Esto garantiza que solo los administradores de infraestructura tengan acceso a la gestión de permisos administrativos.

## 🧬 Operaciones de Privilegio
-   **Listar**: Visibilidad de quién tiene acceso administrativo en el sistema.
-   **Otorgar (Grant)**: Ascenso de usuarios a roles administrativos con scopes granulares (ej: solo puede gestionar créditos).
-   **Revocar (Delete)**: Remoción total de privilegios.
-   **Actualizar Scopes (Patch)**: Modificación fina de los permisos asignados a un administrador existente.

## 🛡️ Protecciones de Seguridad
El sistema incluye salvaguardas contra errores humanos catastróficos:
-   **No Auto-Revocación**: Un super-admin no puede eliminarse a sí mismo a través de esta API. Esto previene un estado de "huérfano" donde el sistema se queda sin posibilidad de ser administrado.
-   **Validación de Tipo (T-Schema)**: Todas las entradas están validadas mediante Schemas de Elysia para asegurar que los scopes inyectados tengan la forma correcta.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './system-admin.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/system/admin', router);
```
