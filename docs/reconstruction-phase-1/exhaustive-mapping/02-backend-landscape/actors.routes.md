---
id: "actors-routes"
type: "backend-route"
status: "stable"
criticality: "medium"
location: "apps/api/src/routes/actors.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Auth Middleware, JWT, Drizzle (actors)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestión de Identidades de Comunicación" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Public token generation, Actor retrieval" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🚀 ActorsRoutes

## 🎯 Propósito
Expone endpoints para la gestión de **Actores**, la entidad central de identidad en el sistema de mensajería. Su función principal es permitir la identificación de sujetos (usuarios, cuentas, bots) y proporcionar mecanismos de autenticación pública para visitantes.

## 🛡️ Public Tokens (Modo Visitante)
- **`GET /:id/public-token`**: Genera un JWT efímero (7 días) que permite a un cliente (ej: un widget de chat en una web externa) operar en nombre de un actor de tipo `account`.
- **Seguridad:** Solo los actores vinculados a una cuenta real pueden emitir tokens públicos. Estos tokens otorgan permisos limitados de `send_messages` y `receive_messages`.

## 🛠️ Endpoints
- **`GET /:id`**: Recupera los metadatos de un actor (tipo, cuenta vinculada, nombre público, fecha de creación).

## 💡 Modelo de Actor
En FluxCore, un `Actor` es la representación abstracta de una identidad. A diferencia de un `User` (que es una entidad de login) o un `Account` (entidad comercial), el Actor es el que "habla" en las conversaciones. Estas rutas permiten puentear la identidad interna hacia el mundo exterior de forma controlada.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './actors.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/actors', router);
```
