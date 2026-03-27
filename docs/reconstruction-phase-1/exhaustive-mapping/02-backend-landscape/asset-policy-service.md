---
id: "asset-policy-service"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/asset-policy.service.ts"
---

# 🤖 asset-policy.service

## 🎯 Propósito
Este servicio es el motor de autorización y seguridad de los activos almacenados. Evalúa si un actor (usuario, asistente, sistema o visitante) tiene permiso para acceder a un recurso basado en el `scope` del activo y el `contexto` de la solicitud.

## 📐 Arquitectura e Interacción
El servicio actúa como el guardián (gatekeeper) de todas las operaciones sobre assets.
- **Acceso Multinivel:** Soporta `DEFAULT_POLICIES` configurables por sistema y políticas persistentes asociadas a cada `accountId` vía base de datos.
- **Identity Support:** Soporta actores `visitor` de perfiles públicos, permitiendo visualización externa sin necesidad de autenticación de usuario completa.
- **NUEVO: Bypass Público ("Google Docs Mode"):** Implementa una flag `isPublic` en el objeto Asset. Si está activa (`true`), el motor salta todas las evaluaciones de permisos y permite el acceso inmediato basándose únicamente en el TTL predefinido por el `scope`.
- **Transparencia en Firma:** El método `signAsset` delega la generación física de la URL firmada al `StorageAdapter` después de validar que el contexto de solicitud (`action` y `channel`) esté permitido para el archivo.
- **Inferencia de Contexto:** Utiliza el `ChatCoreWorldDefiner` para inferir canales y orígenes de solicitud cuando la información es parcial.

## 💡 Ejemplo de Evaluación
Evaluación de acceso para previsualización (preview) en modo público:
```typescript
const evaluation = await assetPolicyService.evaluateAccess({
    assetId: "...",
    actorId: "visitante-123", // visitorActorId
    actorType: "visitor",
    context: { 
        action: "preview", 
        channel: "web" 
    }
});

// return { allowed: true, ttlSeconds: 3600, policyId: "..." }
```

## 🔗 Dependencias
- **AssetRegistryService:** obtiene metadatos del activo para evaluar el scope.
- **AssetAuditService:** registra las evaluaciones exitosas y denegadas.
- **ChatCoreWorldDefiner:** reconcilia el entorno de ejecución para la inferencia de políticas.
- **IStorageAdapter:** genera físicamente la firma una vez aprobada.
