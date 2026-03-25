---
id: "public-profile-routes"
type: "api-routes"
status: "stable"
criticality: "high"
location: "apps/api/src/routes/public-profile.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "AssetPolicyService, ConversationService, ActorResolver, Elysia JWT" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API de Perfiles Públicos y Webchat" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Alias availability check, Public session creation (JWT), Anonymous visitor actor resolution, Avatar signing for public view, Message history exposure (Visitor perspective)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Public Profile Routes

## 🎯 Propósito
Las `Public Profile Routes` manejan la cara pública de FluxCore. Permiten que usuarios anónimos (visitantes) interactúen con cuentas del sistema mediante URLs personalizadas (`alias`), gestionando la identidad temporal y la persistencia de esas charlas sin requerir una cuenta de usuario tradicional.

## 🚥 Gestión de Alias
Incluye el endpoint `/check-alias/:alias` para la reserva de nombres:
-   **Validación**: Asegura formatos legibles y seguros (regex).
-   **Palabras Reservadas**: Protege alias críticos (`admin`, `support`, `system`) para evitar suplantaciones.

## 🧬 Sesiones de Visitante (JWT Público)
El endpoint `/session` es el más crítico del flujo público:
1.  **Actor Resolution**: Crea o recupera un actor de tipo `visitor` vinculado al `visitorToken` y a la cuenta del dueño.
2.  **Ensure Conversation**: Establece el hilo de chat si no existe.
3.  **Token Issuance**: Firma un JWT de tipo `public_profile` con permisos acotados, que el frontend usará para autenticar llamadas posteriores de envío de mensajes.

## 🛡️ Seguridad de Perfil
-   **Búsqueda por Alias**: Resuelve la información básica del perfil (bio, nombre, avatar) para la landing page.
-   **Firmado de Imagen**: Utiliza `assetPolicyService` para generar URLs temporales de visualización del avatar, protegiendo el almacenamiento físico del activo contra accesos directos masivos.
-   **Historial con Perspectiva**: Al listar mensajes, transforma los datos técnicos del backend a una vista amigable (`visitor` vs `account`), ocultando metadatos internos innecesarios para el usuario final.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './public-profile.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/public/profile', router);
```
