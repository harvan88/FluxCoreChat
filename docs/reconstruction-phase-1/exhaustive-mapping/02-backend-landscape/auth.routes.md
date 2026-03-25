---
id: "auth-routes"
type: "backend-route"
status: "stable"
criticality: "critical"
location: "apps/api/src/routes/auth.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Auth Service, JWT Middleware, Account Service" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gateway de Identidad y Acceso" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Registration, Login, PW Recovery, Token Verification" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🚀 AuthRoutes

## 🎯 Propósito
Punto de entrada único para la gestión de sesiones de usuario en FluxCore. Implementa un sistema de autenticación moderno basado en **JWT (JSON Web Tokens)**, manejando desde el registro inicial hasta la recuperación de contraseñas olvidadas.

## 📍 Endpoints
- **`POST /register`**: Crea un usuario nuevo y le asigna automáticamente su primera cuenta personal.
- **`POST /login`**: Valida credenciales y emite el JWT necesario para todas las peticiones protegidas.
- **`POST /logout`**: Notifica el cierre de sesión (aunque en JWT el control real reside en el cliente mediante el borrado del token).

## 🛡️ Seguridad y Verificación
- **`GET /me`**: Endpoint crucial de hidratación que devuelve el perfil del usuario autenticado y la lista de cuentas a las que tiene acceso.
- **`POST /verify-password`**: Permite re-verificar al usuario antes de realizar acciones críticas (ej: borrar cuenta o cambiar configuraciones sensibles).

## 🔑 Recuperación de Cuenta
- **`POST /forgot-password`**: Dispara el flujo de recuperación. Genera un token único y seguro enviado por un canal externo.
- **`POST /reset-password`**: Permite establecer una nueva contraseña validando el token de recuperación generado previamente.

## 🛡️ Middlewares/Auth
Utiliza el plugin de `jwt` nativo de Elysia, interceptando las peticiones protegidas para extraer el bearer token y desencriptarlo con `FLUXCORE_SIGNING_SECRET`, propagando el ID del usuario al contexto mediante `set.user`.

## 🔗 Dependencias
- **AuthService**: Delega todo el trabajo pesado criptográfico e interaccional.
- **AccountService**: Invocado durante el registro para hacer bootstrapping de account.
- **Elysia JWT**: Middleware para parseo/verificación.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './auth.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/auth', router);
```
