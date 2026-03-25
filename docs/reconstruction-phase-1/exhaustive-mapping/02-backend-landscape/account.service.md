---
id: "account-service"
type: "logic-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/account.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "ActorService, CoreEventBus, ContextLimits (utils), Drizzle (accounts, actors)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Identidad y Perfil (COR-001)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Account creation with alias validation, Profile updates, Search (alias/email), Business conversion, Avatar management, Domain event emission" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AccountService

## 🎯 Propósito
El `AccountService` gestiona el ciclo de vida de las cuentas en FluxCore. Una cuenta representa la identidad operativa de un usuario o negocio, actuando como el contenedor principal para sus agentes, chats y configuraciones de IA.

## 🚥 Validación de Alias y Límites
El servicio aplica reglas estrictas para asegurar que las cuentas sean rastreables y seguras:
-   **Validación de Alias**: Verifica formato regex (`[a-z0-9_-]`), longitud (3-30) y previene el uso de nombres reservados (`admin`, `api`, `system`, etc.).
-   **Control de Límites (COR-006)**: Utiliza utilidades centralizadas para validar la longitud del `displayName` y del `privateContext`, evitando ataques de overflow o almacenamiento excesivo.

## 🧬 Tipos de Cuenta
-   **Personal**: Cuenta por defecto creada al registrarse un usuario.
-   **Business**: Cuentas optimizadas para colaboración (vinculadas a Workspaces), que permiten gestión administrativa avanzada. El servicio permite la conversión unidireccional de Personal a Business.

## 📢 Integración con el Bus de Eventos
Cada actualización de perfil (especialmente cambios en `allowAutomatedUse`) emite el evento `account.profile.updated`. Este evento es crítico para el **Policy Engine**, ya que gatilla la invalidación de contextos de seguridad y recalculación de permisos en tiempo real.
 village.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { accountService } from 'apps/api/src/services/account.service.ts';

// Ejemplo de invocación típica
const result = await accountService.execute(params);
```
