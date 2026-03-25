---
id: "credits-routes"
type: "api-routes"
status: "stable"
criticality: "high"
location: "apps/api/src/routes/credits.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "CreditsService, SystemAdminService, AccountService" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API de Economía de Créditos y Políticas de IA" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Admin Credit Search/Grant, Credit Policy CRUD, User balance retrieval, Premium session monitoring (token budget/expiry)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Credits Routes

## 🎯 Propósito
Las `Credits Routes` gestionan la capa económica y de límites de uso del sistema. Controlan tanto el saldo de créditos de las cuentas (para facturación y acceso a modelos premium) como las políticas técnicas que definen cuánto cuesta cada interacción de IA en términos de tokens y tiempo.

## 🚥 Panel de Administración
Ofrece herramientas para moderadores del sistema:
-   **Grant Credits**: Permite asignar créditos manualmente a una cuenta (con rastro de auditoría de quién lo hizo).
-   **Policy Management**: CRUD para las políticas de crédito que mapean modelos (GTP-4, Llama-3) a costes específicos por uso.
-   **Search**: Buscador de cuentas enriquecido con balance de saldos.

## 🧬 Sesiones Premium
El endpoint `/session` permite monitorizar el estado de una "Sessión de IA" activa para una conversación. Provee información sobre:
-   **Token Budget**: Cuántos tokens se asignaron a esta interacción.
-   **Tokens Used/Remaining**: Uso en tiempo real.
-   **Expira**: Cuándo caduca la ventana de contexto premium.

## 🛡️ Autorización Escopada (Scopes)
Utiliza el `systemAdminService` para verificar permisos específicos (`credits`, `policies`). Esto permite que un usuario sea administrador del sistema pero solo tenga permiso para ver saldos de créditos sin poder alterar las políticas globales de coste de la infraestructura.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './credits.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/credits', router);
```
