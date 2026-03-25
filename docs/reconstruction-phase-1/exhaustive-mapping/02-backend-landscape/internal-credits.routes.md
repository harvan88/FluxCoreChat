---
id: "internal-credits-routes"
type: "api-routes"
status: "stable"
criticality: "high"
location: "apps/api/src/routes/internal-credits.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "CreditsService, SystemAdminService, AccountService" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API Interna de Créditos y Políticas" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Admin scope check (credits/policies), Credit grant by query, Direct account credit grant, Pricing policy creation" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Internal Credits Routes

## 🎯 Propósito
Las `Internal Credits Routes` son las herramientas de administración de "back-office" para el sistema económico de FluxCore. Permiten a los administradores del sistema gestionar el flujo de créditos y definir las políticas de precios sin pasar por las interfaces de usuario estándar orientadas al cliente final.

## 🚥 Autorización por Scopes
A diferencia de los endpoints internos basados en llaves fijas, estas rutas validan la identidad del administrador mediante `systemAdminService`. Requiere permisos específicos:
-   **Scope `credits`**: Necesario para regalar o asignar créditos a cuentas.
-   **Scope `policies`**: Necesario para crear o modificar las tablas de precios de modelos de IA.

## 🧬 Asignación Flexibles (Query Grant)
Implementa una funcionalidad de conveniencia: `grant-by-query`. Permite a un administrador asignar créditos a un usuario simplemente conociendo su correo electrónico o su `@username`. El servicio resuelve internamente la `accountId` correspondiente, facilitando operaciones rápidas de soporte técnico.

## 🛡️ Auditoría y Versionado
-   **Metadata**: Cada transacción interna captura metadatos sobre el motivo o la query original de búsqueda.
-   **Políticas**: Las nuevas políticas de precios se crean de forma versionada, permitiendo que el sistema mantenga la trazabilidad de costes históricos incluso si los precios cambian en el futuro.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './internal-credits.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/internal/credits', router);
```
