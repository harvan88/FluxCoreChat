---
id: "auth-middleware"
type: "infrastructure-middleware"
status: "stable"
criticality: "critical"
location: "apps/api/src/middleware/auth.middleware.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Elysia JWT, AccountService" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Guardia de Identidad y Seguridad" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "JWT verification, Polymorphic identity parsing (User/PublicActor/PublicProfile), Context derivation (Derive), Security macro (isAuthenticated)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🛡️ Auth Middleware

## 🎯 Propósito
El `AuthMiddleware` es el guardián central de seguridad de FluxCore. Su función es interceptar cada petición HTTP, validar el token de autenticación y derivar un objeto de identidad que los controladores posteriores pueden usar de forma transparente para aplicar lógica de negocio.

## 🚥 Identidades Polimórficas
A diferencia de sistemas de autenticación simples, FluxCore maneja tres tipos de actores en el mismo middleware:
1.  **User (Regular User)**: Usuarios autenticados del sistema (dueños de cuenta e integrantes de equipo).
2.  **Public Actor**: Identidades temporales para interacciones públicas con permisos acotados (`send_messages`, `receive_messages`).
3.  **Public Profile**: Específico para visitantes de perfiles públicos (Webchat), vinculando un `visitorToken` con una `ownerAccountId`.

## 🧬 Mecanismo de Derivación (Derive)
El middleware inyecta en el contexto de la petición (`context`) uno de los tres objetos de identidad. Si no hay token o es inválido, devuelve los tres como `null`. Esto permite que las rutas "públicas pero enriquecidas" (como perfiles públicos) decidan cómo actuar basándose en la presencia o ausencia de estos objetos.

## 🛡️ Macro isAuthenticated
Provee una macro de Elysia (`isAuthenticated`) que permite marcar una ruta como protegida con una sola línea de código. Si se activa, el middleware aborta automáticamente la petición con un error 401 si no se encuentra un objeto `user` válido en el contexto.

## 💡 Ejemplo de Uso
```typescript
// Aplicar middleware en la cadena de request
import { authMiddleware } from 'apps/api/src/middleware/auth.middleware.ts';

// Se aplica antes de las rutas protegidas
app.use('/api/*', authMiddleware);
```
