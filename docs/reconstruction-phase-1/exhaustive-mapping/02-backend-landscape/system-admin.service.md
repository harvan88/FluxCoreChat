---
id: "system-admin-service"
type: "logic-service"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/system-admin.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (system_admins, accounts)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Autorización para Operadores de Plataforma" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Scope validation, Grant/Revoke admin, Wildcard scope support (*), Operator listing" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ SystemAdminService

## 🎯 Propósito
Este servicio gestiona los privilegios de los super-usuarios u operadores técnicos de FluxCore. A diferencia de los permisos de cuenta normales, los `system_admins` tienen autoridad sobre la infraestructura global, facturación y mantenimiento de la plataforma.

## 🚥 Sistema de Scopes (RBAC)
Define permisos granulares sobre áreas críticas:
-   **`credits`**: Capacidad de añadir/restar créditos manualmente a cualquier cuenta.
-   **`monitoring`**: Acceso al panel de telemetría y logs de sistema.
-   **`wildcard (*)`**: Un administrador con el flag `*` activo tiene automáticamente todos los permisos presentes y futuros.

## 🔄 Operaciones Administrativas
-   **`grantAdmin`**: Convierte a un usuario normal en administrador. Si el usuario ya era admin, realiza un merge/sobrescritura de sus scopes. Registra quién otorgó el permiso (`createdBy`) para auditoría forense.
-   **`hasScope`**: Guarda de seguridad principal usada en los controladores de la API administrativa. Soporta la validación de un scope específico o la validación del wildcard.
-   **`listAdmins`**: Genera una vista de auditoría uniendo la tabla de administradores con la de cuentas para mostrar nombres y correos de los operadores.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { systemAdminService } from 'apps/api/src/services/system-admin.service.ts';

// Ejemplo de invocación típica
const result = await systemAdminService.execute(params);
```
