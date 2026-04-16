---
id: "account-service"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/account.service.ts"
---

# ⚙️ account.service

## 🎯 Propósito
El `account.service` gestiona el ciclo de vida de las cuentas en FluxCore. Una cuenta es la unidad fundamental de identidad operativa, conteniendo los perfiles, configuraciones de IA y el historial de actividad de un usuario o negocio.

## 🚀 Funcionalidades Clave

### 🛠️ Creación de Cuentas (v2-4.2)
Además de la creación estándar, el servicio ahora garantiza que todas las nuevas cuentas tengan **preinstaladas las extensiones críticas** (como FluxCore).
- **Instalación Silenciosa:** Las extensiones preinstaladas se registran en estado `enabled: false` para no saturar la UI inicial del usuario.
- **Detección Automática:** Utiliza el `manifestLoader` para encontrar qué extensiones deben incluirse por defecto.

### 🚥 Validación y Seguridad (COR-001/006)
- **Alias Únicos:** Valida formatos, longitud y términos reservados.
- **Límites de Contexto:** Aplica validaciones centralizadas para nombres de pantalla y contextos privados.
- **RBAC Inicial:** Crea automáticamente la relación de `actor` tipo `owner` para el creador de la cuenta.

### 📢 Eventos de Dominio
Emite eventos (`account.profile.updated`) para notificar cambios en la configuración que afectan al motor de políticas (PolicyContext) y a la automatización.

## 💡 Ejemplo de Uso

### Creación de cuenta con auto-instalación
```typescript
const account = await accountService.createAccount({
  ownerUserId: "user_uuid",
  alias: "mi-negocio",
  displayName: "Mi Negocio S.A.",
  accountType: "business"
});
// Internamente gatilla la preinstalación de @fluxcore/asistentes (disabled)
```

## 🏗️ Arquitectura
Es un servicio central que coordina `ExtensionService`, `ActorService` y el bus de eventos. Interactúa con las tablas `accounts` y `actors` en la base de datos.
