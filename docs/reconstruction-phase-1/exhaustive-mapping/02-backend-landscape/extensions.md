---
id: "extensions-routes"
type: "api-routes"
status: "stable"
criticality: "high"
location: "apps/api/src/routes/extensions.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "ExtensionService, ManifestLoader, ExtensionPermissionsService, AccountService" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API de Ecosistema de Extensiones" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Extension marketplace (listing), Installation/Uninstallation, Configuration management, Permission grant/revoke/share" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Extensions Routes

## 🎯 Propósito
Las `Extensions Routes` gestionan la modularidad funcional de FluxCore. Permiten a los usuarios descubrir nuevas capacidades (como el Website Builder Karen o integraciones de CRM), instalarlas en sus cuentas y gestionar el nivel de acceso que cada extensión tiene sobre sus datos.

## 🚥 Ciclo de Vida de Instalación
-   **Instalación Inteligente**: Al instalar, el sistema inyecta automáticamente la configuración por defecto definida en el `manifest` de la extensión.
-   **Gestión de Estado**: Permite habilitar o deshabilitar extensiones sin necesidad de desinstalarlas, preservando las configuraciones y datos existentes.

## 🧬 Marketplace y Manifestos
El sistema utiliza el `ManifestLoader` para exponer un catálogo dinámico de extensiones. Cada extensión define sus capacidades de UI, sus permisos requeridos y su versión, permitiendo que el frontend construya interfaces dinámicas basadas en las capacidades instaladas.

## 🛡️ Seguridad y Permisos (Escopado)
Implementa un sistema robusto de permisos:
-   **Grant/Revoke**: Control fino sobre qué APIs puede llamar la extensión.
-   **Permission Sharing**: Permite definir si un instalador puede delegar permisos a otros usuarios de la misma cuenta.
-   **Soberanía de Datos**: Las extensiones operan bajo una sandbox lógica donde sus permisos se validan en cada llamada a los servicios core de FluxCore.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: extensions
import { extensions } from 'apps/api/src/routes/extensions.routes.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await extensions.process(input);
```
