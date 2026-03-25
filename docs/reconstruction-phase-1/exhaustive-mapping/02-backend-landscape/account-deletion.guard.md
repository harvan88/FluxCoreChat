---
id: "account-deletion-guard"
type: "security-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/account-deletion.guard.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (accounts, protected_accounts, logs)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Protector de Cuentas Críticas e Inmunes" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Immunity validation, Protection record automatic creation, Critical attempt logging" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AccountDeletionGuard

## 🎯 Propósito
Actúa como un sistema de **Inmunidad de Cuentas**. Su única misión es prevenir la eliminación accidental o malintencionada de cuentas marcadas como "protegidas" o pertenecientes a dueños críticos del sistema (ej: cuentas de administración central o demostración).

## 🛡️ Mecanismos de Protección
El Guard valida dos niveles de protección:
1.  **Protección por ID de Dueño:** Existen `DEFAULT_PROTECTED_OWNER_IDS` (Hardcoded) que son inmunes por defecto.
2.  **Protección Explícita:** Verifica si el accountId está presente en la tabla `protectedAccounts` con una razón válida.

## 🚥 Auto-Enforcement
Si se detecta un intento de eliminación sobre una cuenta de un dueño protegido que no tenía un registro explícito en `protected_accounts`, el servicio **lo crea automáticamente** con el motivo `protected-owner` antes de lanzar el error. Esto "bloquea" la cuenta para futuras inspecciones visuales en el panel de administración.

## 📜 Registro de Intentos Críticos
Cualquier intento fallido de pasar este guard se registra en `accountDeletionLogs` con el estado `critical_attempt`. Esto permite a los administradores del sistema detectar ataques de negación de servicio (intentar borrar cuentas ajenas) o errores graves en la automatización de purgas.

## 🔌 API de Seguridad
Expone un método `ensureAllowed` que debe ser la primera línea de ejecución en cualquier flujo de borrado. Si la cuenta es protegida, lanza una excepción con el código de error `ACCOUNT_DELETION_PROTECTED`, interrumpiendo cualquier proceso posterior.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: account-deletion.guard
import { accountDeletion.guard } from 'apps/api/src/services/account-deletion.guard.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await accountDeletion.guard.process(input);
```
