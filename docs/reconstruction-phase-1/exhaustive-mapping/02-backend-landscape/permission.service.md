---
id: "permission-service"
type: "logic-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/permission.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (assetPermissions, vectorStores, instructions, toolDefinitions)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Sistema de Activos Compartidos (RAG-002)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Hierarchical access check (Ownership > Public > Shared), Asset sharing/revocation, Cache management (5m TTL), Accessible assets discovery" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ PermissionService

## 🎯 Propósito
El `PermissionService` es el pilar del acceso granular en FluxCore. Gestiona cómo se comparten y heredan los permisos entre cuentas para activos compartidos (Vector Stores, Instrucciones y Herramientas), permitiendo a las organizaciones colaborar de forma segura.

## 🚥 Jerarquía de Acceso
El servicio valida permisos siguiendo un orden de prioridad descendente:
1.  **Ownership**: Si la cuenta es la dueña del asset, tiene permisos de `admin`.
2.  **Visibility**: Si el asset está marcado como `public`, cualquier cuenta tiene permiso de `read`.
3.  **Explicit Grant**: Verifica si existe un registro en la tabla de permisos compartidos para la cuenta solicitante, comprobando el nivel (`read`, `write`, `admin`) y la expiración.

## 🧬 Optimización con Cache
Debido a que las verificaciones de permiso ocurren frecuentemente (ej. por cada chunk recuperado en RAG), el servicio implementa un **Simple Memory Cache** con un TTL de 5 minutos. Cualquier cambio en los permisos (share/revoke) invalida automáticamente todas las entradas del cache asociadas al asset modificado para garantizar consistencia.

## 🛡️ Niveles de Permiso
-   **Read**: Permite usar el asset para inferencia (IA).
-   **Write**: Permite modificar el contenido o configuración del asset.
-   **Admin**: Permite gestionar permisos, compartir con otros y eliminar el activo.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { permissionService } from 'apps/api/src/services/permission.service.ts';

// Ejemplo de invocación típica
const result = await permissionService.execute(params);
```
