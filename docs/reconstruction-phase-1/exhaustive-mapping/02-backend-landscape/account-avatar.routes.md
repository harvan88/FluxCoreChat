---
id: "account-avatar-routes"
type: "core"
status: "needs_review"
criticality: "high"
location: "apps/api/src/routes/account-avatar.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Account Service, Asset Gateway, Asset Registry, Auth Middleware" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestión de Identidad Visual con Autenticación Fuerte" }
  operations: { status: "complete", completed_date: "2026-03-25", confidence: 100, notes: "Multi-step upload (Session -> Commit) con authMiddleware, Avatar update con validación UUID" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
last_update: "2026-03-25"
update_reason: "Desacoplamiento de kernelContext y migración a authMiddleware fuerte"
---

# 🚀 AccountAvatarRoutes

## 🎯 Propósito
Expone los endpoints necesarios para gestionar la imagen de perfil (Avatar) de las cuentas en FluxCore. Utiliza el motor de activos soberanos para garantizar que las imágenes se almacenen, validen y sirvan de forma segura. **IMPORTANTE:** Ahora utiliza `authMiddleware` en lugar de `kernelContext` para autenticación fuerte y validación UUID garantizada.

## 🔄 Flujo de Upload (Protocolo Seguro con Autenticación)
No permite subidas directas de archivos para evitar inyecciones maliciosas. Sigue un flujo de dos pasos con autenticación requerida:
1.  **`POST /upload-session`**: Solicita permiso para subir una imagen. **Requiere autenticación JWT válida**. Valida tipos MIME (PNG, JPEG, WEBP, GIF), tamaño máximo (5MB), y acepta `sizeBytes` del frontend. Devuelve un ID de sesión efímero (15 min).
2.  **`POST /upload/:sessionId/commit`**: Una vez subido el archivo al temporal, solicita que el sistema lo registre formalmente como un activo de perfil (`profile_avatar`) y lo vincule a la cuenta. **Requiere autenticación JWT válida**.

## � **Cambios Críticos (2026-03-25)**
### **Desacoplamiento de KernelContext**
- **ANTES:** `const uploadedBy = kernelContext.actorId` (podía ser undefined)
- **DESPUÉS:** `const uploadedBy = user.id` (UUID garantizado por JWT)

### **Autenticación Fuerte**
- **Guard:** `.guard({ isAuthenticated: true })` en todos los endpoints
- **Validación:** `if (!user) { set.status = 401; return { success: false, message: 'Unauthorized' }; }`
- **UUID Garantizado:** `user.id` siempre es un UUID válido desde `authMiddleware`

### **Schema Actualizado**
- **Body:** Ahora acepta `sizeBytes` opcional del frontend
- **Uso:** `totalBytes: body?.sizeBytes` en `createUploadSession`

## �🛠️ Endpoints
- **`PATCH /:accountId/avatar`**: Permite cambiar el avatar actual de una cuenta utilizando un `assetId` ya existente en el sistema. **Requiere autenticación JWT válida**.

## 🧪 Validaciones
- **Autenticación:** Todos los endpoints requieren JWT válido (`authMiddleware`)
- **UUID Garantizado:** `uploadedBy` siempre es UUID válido desde `user.id`
- **Restricción de Tipo:** Solo acepta formatos de imagen estándar compatibles con la mayoría de navegadores y dispositivos móviles.
- **Límite de Tamaño:** Protege contra ataques de denegación de servicio por agotamiento de almacenamiento físico.
- **Body Schema:** Acepta `fileName`, `mimeType`, y `sizeBytes` opcionales

## 💡 Integración con Asset System
Este componente es un ejemplo perfecto de cómo una ruta de negocio utiliza el `AssetGateway` y el `AssetRegistry` para delegar la complejidad del almacenamiento y centrarse únicamente en la relación "Cuenta <-> Imagen". **Ahora con autenticación fuerte y sin dependencias de KernelContext.**

## 🔍 **Dudas Técnicas (Needs Review)**
1. **Impacto Frontend:** ¿El frontend necesita actualizar cómo maneja los errores 401?
2. **Testing:** ¿Se necesitan tests adicionales para validar el flujo con authMiddleware?
3. **Logs:** ¿Los logs actuales muestran suficiente información para debugging de auth?

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './account-avatar.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/account/avatar', router);
```
