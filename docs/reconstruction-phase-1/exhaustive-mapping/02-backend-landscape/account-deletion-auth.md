---
id: "account-deletion-auth-middleware"
type: "middleware"
status: "stable"
criticality: "high"
location: "apps/api/src/middleware/account-deletion-auth.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "System Admin Service, Drizzle (accounts)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Middleware de Seguridad para Purga de Datos" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Ownership verification, Force-scope matching, Contextual auth resolution" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🛡️ AccountDeletionAuth (Middleware)

## 🎯 Propósito
Este middleware garantiza que solo los sujetos autorizados puedan iniciar o supervisar el proceso de eliminación de una cuenta. Define dos modos de operación: **Dueño (Owner)** y **Fuerza Bruta/Admin (Force)**.

## 🛂 Modos de Autorización
1.  **Modo `owner`**: Utilizado cuando un usuario intenta borrar su propia cuenta. Requiere que el `userId` autenticado coincida con el dueño real registrado en la base de datos y que el `sessionAccountId` actual coincida con la cuenta a borrar (previene borrados accidentales desde el contexto de otra cuenta).
2.  **Modo `force`**: Utilizado por administradores de sistema. Solo se activa si el usuario posee el scope `ACCOUNT_DELETE_FORCE`. En este modo, las restricciones de ownership se omiten.

## 🛠️ Validación de Seguridad
El middleware es riguroso y arroja errores específicos con códigos de error (`ACCOUNT_DELETION_UNAUTHORIZED`, `ACCOUNT_DELETION_SESSION_MISMATCH`, etc.) que el frontend puede interpretar para mostrar mensajes claros al usuario.

## 🔄 Resolución de Contexto
Proporciona la función `requireAccountDeletionAuthFromContext`, que permite extraer automáticamente los parámetros necesarios (ID de cuenta, ID de sesión) desde la petición de Elysia (params o body), facilitando su integración en rutas REST de forma limpia.

## 💡 Ejemplo de Uso
```typescript
// Aplicar middleware en la cadena de request
import { authMiddleware } from 'apps/api/src/middleware/account-deletion-auth.ts';

// Se aplica antes de las rutas protegidas
app.use('/api/*', authMiddleware);
```
