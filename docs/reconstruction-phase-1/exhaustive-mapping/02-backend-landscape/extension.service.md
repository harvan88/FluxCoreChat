---
id: "extension-service"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/extension.service.ts"
---

# ⚙️ extension.service

## 🎯 Propósito
El `extension.service` gestiona el ecosistema de complementos de FluxCore. Administra el ciclo de vida de las extensiones (instalación, configuración, habilitación y desinstalación), garantizando el aislamiento de datos entre cuentas y un control granular de permisos.

## 🚀 Funcionalidades Clave

### 🛠️ Gestión de Instalación (FC-154/155)
El servicio permite instalar extensiones con un estado inicial específico (habilitada o deshabilitada). Esto es fundamental para la **instalación silenciosa** de FluxCore en nuevas cuentas, donde la extensión existe pero no es visible hasta que el usuario decide activarla.

### 🚥 Control de Activación
Proporciona métodos deterministicos para habilitar (`enable`) o deshabilitar (`disable`) una instalación existente. Un cambio en este estado se propaga al sistema de UI (Activity Bar) para mostrar/ocultar los puntos de entrada de la extensión.

### 🧹 Persistencia y Limpieza
Gestiona la configuración personalizada de cada extensión por cuenta y asegura la eliminación en cascada de contextos y datos relacionados durante la desinstalación.

## 💡 Ejemplo de Uso

### Instalación de una extensión (deshabilitada por defecto)
```typescript
await extensionService.install({
  accountId: "acc_123",
  extensionId: "@fluxcore/asistentes",
  version: "1.0.0",
  enabled: false, // Instalación silenciosa
  config: { mode: "suggest" },
  grantedPermissions: ["send:messages", "read:context.public"]
});
```

### Cambio de estado
```typescript
await extensionService.toggleEnabled("acc_123", "@fluxcore/asistentes", true);
```

## 🏗️ Arquitectura
Interactúa directamente con `@fluxcore/db` (tabla `extension_installations`) y es consumido por las rutas de la API en `extensions.routes.ts` y servicios de orquestación como `account.service.ts`.
