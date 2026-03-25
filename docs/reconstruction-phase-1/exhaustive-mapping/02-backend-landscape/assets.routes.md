---
id: "assets-routes"
type: "backend-route"
status: "stable"
criticality: "critical"
location: "apps/api/src/routes/assets.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Asset Gateway, Policy Service, Audit, Deletion Service" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API Unificada de Gestión de Assets" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Upload Management, URL Signing, Metadata Search, Audit Inspection" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🚀 AssetsRoutes

## 🎯 Propósito
Es la puerta de entrada principal para todas las operaciones relacionadas con archivos en FluxCore. Expone una interfaz RESTful robusta que oculta la complejidad del motor de políticas, el almacenamiento asincrónico y el sistema de auditoría inmutable.

## 📡 Endpoints de Flujo de Upload
- **`POST /upload-session`**: Inicia el protocolo de subida. Valida derechos de cuenta y emite un `sessionId`.
- **`PUT /upload/:sessionId`**: Stream de datos crudos. Utiliza `t.File()` para ingesta eficiente.
- **`POST /upload/:sessionId/commit`**: Finaliza el upload, calcula metadatos finales y "nace" el `Asset` en la base de datos.
- **`GET /upload/:sessionId/progress`**: Permite a la UI mostrar barras de carga precisas.

## 📂 Endpoints de Consumo y Gestión
- **`POST /:assetId/sign`**: El endpoint más usado. Devuelve la URL firmada temporal para visualizar/descargar un archivo tras validar permisos.
- **`POST /search`**: Buscador avanzado con filtros por mimeType, scope y texto libre en el nombre original.
- **`DELETE /:assetId`**: Ejecuta el borrado lógico (`soft delete`) y dispara las tareas de limpieza programada.

## 🕵️ Monitoreo y Debug (Admin)
- **`GET /debug/logs`**: Visualización en tiempo real de los eventos de auditoría (quién está descargando qué).
- **`GET /debug/stats/:accountId`**: Resumen de uso de disco y conteo de archivos por cuenta para facturación y cuotas.

## 🛡️ Seguridad
Implementa una validación estricta de **UUIDs** para el campo `uploadedBy`, evitando que clientes malformados inyecten strings arbitrarios y asegurando que la trazabilidad de autoría sea siempre fidedigna.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './assets.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/assets', router);
```
