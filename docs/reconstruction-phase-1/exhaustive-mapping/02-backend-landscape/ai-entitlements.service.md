---
id: "ai-entitlements-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/ai-entitlements.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (account_ai_entitlements)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Permisos y Capacidades de IA por Cuenta" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Entitlement retrieval, Upsert logic, Provider whitelisting (Groq/OpenAI), Default provider resolution" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AiEntitlementsService

## 🎯 Propósito
Este servicio centraliza la lógica de "Suscripción" y "Entitlement" de las funciones de IA. Determina qué cuenta tiene permiso para usar la IA, qué proveedores puede elegir y cuál es su proveedor asignado por defecto.

## 🚥 Gobernanza de Proveedores
-   **Whitelisting**: Valida que una cuenta solo pueda configurar proveedores autorizados (`groq`, `openai`).
-   **Enable/Disable**: Permite al equipo de operaciones desactivar globalmente la IA para una cuenta específica sin borrar su configuración.

## 🔄 Persistencia
-   **Source of Truth**: Lee y escribe directamente en la tabla `account_ai_entitlements`.
-   **Defaulting**: Si una cuenta no tiene registro, el sistema asume que la IA está desactivada por defecto para proteger costos.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { aiEntitlementsService } from 'apps/api/src/services/ai-entitlements.service.ts';

// Ejemplo de invocación típica
const result = await aiEntitlementsService.execute(params);
```
