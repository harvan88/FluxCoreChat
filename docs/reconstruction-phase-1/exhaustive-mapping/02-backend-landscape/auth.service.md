---
id: "auth-service"
type: "logic-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/auth.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "AccountService, SystemAdminService, Bcrypt, Drizzle (users, accounts, passwordResetTokens)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Autenticación y Seguridad" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "User registration with auto-account setup, Password hashing, Login with multi-account retrieval, Reset token lifecycle" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AuthService

## 🎯 Propósito
El `AuthService` es la entrada al sistema, gestionando la identidad de los usuarios y su validación mediante credenciales. No solo maneja la autenticación, sino que coordina la creación de la infraestructura inicial para cada nuevo usuario.

## 🚥 Registro con Infraestructura Automática
Al registrar un nuevo usuario (`register`), el servicio realiza tres acciones atómicas:
1.  **Validación**: Verifica la unicidad del email.
2.  **Cifrado**: Hashea la contraseña usando Bcrypt con 10 rondas de salting.
3.  **Bootstrapping**: Llama al `AccountService` para crear automáticamente una **Cuenta Personal** inicial con un alias derivado del email, asegurando que el usuario pueda empezar a chatear de inmediato.

## 🧬 Recuperación de Credenciales
Implementa un flujo de recuperación de contraseña basado en tokens seguros (UUIDs) con una validez estricta de 1 hora. El servicio gestiona el estado de `used` del token para prevenir ataques de reutilización.

## 🛡️ Scopes Administrativos
Durante el proceso de login, el servicio consulta al `SystemAdminService` para inyectar los privilegios de administrador (`systemAdminScopes`) en el objeto de sesión del usuario, permitiendo el acceso granular a las herramientas de supervisión de FluxCore.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { authService } from 'apps/api/src/services/auth.service.ts';

// Ejemplo de invocación típica
const result = await authService.execute(params);
```
