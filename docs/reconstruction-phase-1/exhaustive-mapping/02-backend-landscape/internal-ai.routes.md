---
id: "internal-ai-routes"
type: "api-routes"
status: "stable"
criticality: "medium"
location: "apps/api/src/routes/internal-ai.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "AIEntitlementsService" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API Interna de Permisos de IA" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Internal key validation (x-internal-key), AI provider upsert (Groq/OpenAI), Account-level AI enablement" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Internal AI Routes

## 🎯 Propósito
Las `Internal AI Routes` proporcionan una interfaz para que otros servicios de la infraestructura de Meetgar (fuera del API de cliente) gestionen las capacidades de IA de las cuentas. Se utiliza principalmente para aprovisionar permisos de modelos (entitlements) tras procesos de compra o suscripción.

## 🚥 Seguridad de Llave Interna
Debido a que estos endpoints pueden otorgar acceso a infraestructuras de coste elevado, implementan una validación de seguridad estricta:
-   **Header `x-internal-key`**: Debe coincidir exactamente con la variable de entorno `INTERNAL_API_KEY`.
-   **Aislamiento**: No pasan por el workflow de autenticación de usuarios normales, permitiendo la comunicación Server-to-Server.

## 🧬 Gestión de Entitlements
El endpoint fundamental es el `PATCH /entitlements/:accountId`, que permite:
-   **Habilitar/Deshabilitar IA**: Control maestro de acceso a la funcionalidad agéntica.
-   **Allowed Providers**: Definir qué nubes de IA puede usar la cuenta (ej: permitir Groq por velocidad, OpenAI por calidad).
-   **Default Provider**: Establecer el proveedor por defecto para asistentes nuevos.

## 🛡️ Integridad de Configuración
Este servicio actúa como la capa de control que previene que un usuario con acceso al panel de administración salte sus límites de suscripción y use modelos o proveedores que no están autorizados para su nivel de servicio.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './internal-ai.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/internal/ai', router);
```
