---
id: "account-avatar-routes"
type: "backend-route"
status: "stable"
criticality: "medium"
location: "apps/api/src/routes/account-avatar.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Account Service, Asset Gateway, Asset Registry" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestión de Identidad Visual" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Multi-step upload (Session -> Commit), Avatar update" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🚀 AccountAvatarRoutes

## 🎯 Propósito
Expone los endpoints necesarios para gestionar la imagen de perfil (Avatar) de las cuentas en FluxCore. Utiliza el motor de activos soberanos para garantizar que las imágenes se almacenen, validen y sirvan de forma segura.

## 🔄 Flujo de Upload (Protocolo Seguro)
No permite subidas directas de archivos para evitar inyecciones maliciosas. Sigue un flujo de dos pasos:
1.  **`POST /upload-session`**: Solicita permiso para subir una imagen. Valida tipos MIME (PNG, JPEG, WEBP, GIF) y tamaño máximo (5MB). Devuelve un ID de sesión efímero (15 min).
2.  **`POST /upload/:sessionId/commit`**: Una vez subido el archivo al temporal, solicita que el sistema lo registre formalmente como un activo de perfil (`profile_avatar`) y lo vincule a la cuenta.

## 🛠️ Endpoints
- **`PATCH /:accountId/avatar`**: Permite cambiar el avatar actual de una cuenta utilizando un `assetId` ya existente en el sistema.

## 🧪 Validaciones
- **Restricción de Tipo:** Solo acepta formatos de imagen estándar compatibles con la mayoría de navegadores y dispositivos móviles.
- **Límite de Tamaño:** Protege contra ataques de denegación de servicio por agotamiento de almacenamiento físico.

## 💡 Integración con Asset System
Este componente es un ejemplo perfecto de cómo una ruta de negocio utiliza el `AssetGateway` y el `AssetRegistry` para delegar la complejidad del almacenamiento y centrarse únicamente en la relación "Cuenta <-> Imagen".

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './account-avatar.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/account/avatar', router);
```
