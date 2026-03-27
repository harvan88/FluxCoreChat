---
id: "asset-audit-service"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/asset-audit.service.ts"
---

# 🤖 asset-audit.service

## 🎯 Propósito
Este servicio proporciona un registro inmutable y detallado de todas las interacciones con los activos (assets) del sistema. Es la pieza central para cumplimiento (compliance), seguridad y auditoría de acceso a archivos.

## 📐 Arquitectura e Interacción
El servicio opera como un colector de eventos puramente acumulativo (Append-only).
- **Core Strategy:** Utiliza un helper de sanitización de UUIDs (`sanitizeUuid`) para prevenir fallas de base de datos (Postgres Error: invalid input syntax) cuando recibe identidades parcialmente inicializadas desde el frontend.
- **Actor Support:** Totalmente compatible con actores de tipo `user`, `assistant`, `system` y el tipo `visitor` (incorporado mediante migración manual al ENUM `asset_actor_type` de Postgres en Fase 1). Sin esta correspondencia en BD, el servicio lanzaba errores 500 al intentar loguear eventos de perfiles públicos.
- **Runtime Safety:** Si el tipo de actor no es reconocido o el ID es inválido, el sistema aplica un fallback a `system` / `null` en lugar de fallar la operación principal (ej: permitir la descarga o visualización).
- **Integridad de Datos:** No se permite la edición ni eliminación de registros (Cumplimiento de Auditoría).

## 💡 Ejemplo de Uso
Loguear una firma de URL para un visitante en un perfil público:
```typescript
await assetAuditService.logUrlSigned({
    assetId: "f07f52c0-...",
    actorId: "812ae592-...", // visitorActorId
    actorType: "visitor",
    context: "preview:web",
    ttlSeconds: 3600,
    accountId: "520954df-...",
});
```

## 🔗 Dependencias
- **Drizzle ORM:** interactúa directamente con la tabla `asset_audit_logs`.
- **AssetPolicyService:** suministra la información de evaluación para el registro inmutable.
- **PostgreSQL Enum (`asset_actor_type`):** Dependencia de bajo nivel en BD. Es CRÍTICO asegurar que el valor `visitor` esté presente en el tipo de la base de datos para evitar colapsos en tiempo de ejecución.
- **AssetRegistryService:** registra eventos de creación y movimiento de archivos.
