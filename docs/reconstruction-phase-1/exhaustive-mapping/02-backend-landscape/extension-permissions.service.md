---
id: "extension-permissions-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/extension-permissions.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (extension_installations, workspace_members)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Permisos Granulares y Herencia (v2.0)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Permission granting/revocation, Ownership validation, Sharing capability enforcement" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ ExtensionPermissionsService

## 🎯 Propósito
Implementa el sistema de control de acceso granular para las extensiones. Define quién puede otorgar permisos y qué capacidades tiene una extensión dentro de un espacio de trabajo compartido. Se apoya en los principios de **TOTEM** para la delegación de autoridad.

## 🤝 Delegación de Autoridad
- **Auto-concesión:** El propietario de una cuenta recibe automáticamente todos los permisos definidos en el manifiesto de la extensión al instalarla.
- **Herencia e Intercambio:** Utiliza el flag `canSharePermissions` para permitir que un usuario delegue sus propios permisos a colaboradores de su workspace.
- **Validación de Jerarquía:** Verifica la membresía en `workspace_members` para determinar si un actor tiene el rol `owner` sobre una instalación específica.

## 📜 Gestión de Scope
Permite otorgar o revocar permisos específicos de forma individual (ej: conceder permiso de 'lectura_chats' pero no de 'ejecutar_pagos'), proporcionando una seguridad mucho más fina que un simple "activado/desactivado".

## 🛡️ Verificación de Capacidades (`hasPermission`)
Es el método principal utilizado por el middleware de API para proteger endpoints específicos de extensiones. Antes de ejecutar cualquier tarea, el sistema consulta este servicio para confirmar que la extensión tiene el permiso requerido otorgado explícitamente por un humano autorizado.

## 💡 Regla de Oro
Ningún usuario puede otorgar permisos que él mismo no posea previamente, evitando escaladas de privilegios no autorizadas dentro de organizaciones complejas.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { extensionPermissionsService } from 'apps/api/src/services/extension-permissions.service.ts';

// Ejemplo de invocación típica
const result = await extensionPermissionsService.execute(params);
```
