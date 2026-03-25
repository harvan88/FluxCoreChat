---
id: "website-routes"
type: "api-routes"
status: "stable"
criticality: "medium"
location: "apps/api/src/routes/website.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "WebsiteService, StaticGeneratorService, AuthMiddleware" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Extensión Karen - Generador de Sitios" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Website configuration (Config/Pages), Multi-page CRUD (Wildcard path matching), Static build triggering (BuildHash), Selective publishing, Public URL resolution (Alias-based)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Website Routes (Karen)

## 🎯 Propósito
Estas rutas gestionan la capacidad de FluxCore para generar sitios web estáticos y perfiles públicos (vía la extensión Karen). Permiten definir no solo la apariencia (config) sino el árbol completo de contenidos (páginas) de un sitio.

## 📍 Endpoints
### Gestión de Páginas Dinámicas
Utiliza un sistema de rutas wildcard (`/pages/*`) para manejar árboles de contenido arbitrarios:
-   Permite crear sub-rutas anidadas (ej: `/servicios/automatizacion`).
-   Maneja la Home (`/`) mediante endpoints especializados para evitar ambigüedad en el router de Elysia.
-   Cada página soporta `frontmatter` personalizado para control SEO u opciones de renderizado local.

## 🧬 Ciclo de Publicación
Define estados claros para la visibilidad del sitio:
1.  **Build**: Dispara el `staticGenerator` para producir los archivos físicos. Devuelve un `BuildHash` para verificar la versión generada.
2.  **Publish**: Hace que el sitio sea accesible públicamente basado en el alias del usuario.
3.  **Unpublish**: Retira el acceso público manteniendo la configuración y páginas intactas en el backend.

## 🛡️ Resolución de URL Pública
Implementa una lógica inteligente para detectar el entorno de ejecución (`getPublicSiteBaseUrl`):
-   Utiliza variables de entorno (`PUBLIC_SITE_URL`) o deriva la dirección del host y protocolo de la petición actual (`x-forwarded-host`).
## 🛡️ Middlewares/Auth
Las operaciones de `Build` y `Publish` están protegidas por el `AuthMiddleware`, verificando que el usuario autenticado sea el dueño del `accountId` al que pertenece el sitio. Las rutas wildcard (`/pages/*`) que sirven contenido final actúan como endpoints públicos de solo lectura y no exigen Bearer token.

## 🔗 Dependencias
- **WebsiteService**: Contiene la lógica profunda CRUD para interactuar con la DB sobre entidades del sitio.
- **StaticGeneratorService**: Motor que ensambla físicamente el contenido MDX/HTML al emitir un Build.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './website.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/website', router);
```
