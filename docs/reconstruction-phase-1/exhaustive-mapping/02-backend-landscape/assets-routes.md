---
id: "assets-routes"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/routes/assets.routes.ts"
---

# 🤖 assets.routes

## 🎯 Propósito
Este componente orquestra la exposición de servicios de activos vía HTTP. Es el único punto de entrada oficial (Source of Truth) para interactuar con el sistema de registro, firma y subida de archivos de FluxCore.

## 📐 Arquitectura e Interacción
El componente utiliza el framework Elysia y está estructurado en torno a un `.group('/api/assets')`.
- **Integración de Seguridad:** Las rutas son agnósticas a si el actor es un usuario autenticado o un visitante anónimo, delegando la responsabilidad de la identificación y autorización a los servicios subyacentes (`AssetPolicyService`).
- **Orquestación de Firma:** La ruta `POST /:assetId/sign` coordina la validación de acceso (`evaluateAccess`), el registro del auditor (`logUrlSigned`) y la generación de la URL pública (`signAsset`).
- **Flujos de Subida:** Gestiona el ciclo de vida de las sesiones de carga (`upload-session`) y su posterior confirmación (`confirm-upload`).
- **Bulletproof Integration:** Implementa manejo de errores granular (`try/catch`) y logging específico con prefijo `[AssetsRoutes]` para facilitar la trazabilidad en desarrollo.

## 🚥 Rutas Principales
- **`POST /upload-session`:** Inicia el proceso de subida de archivos con `accountId` requerido.
- **`POST /confirm-upload`:** Finaliza la subida, vinculando el archivo al registro oficial.
- **`POST /:assetId/sign`:** Punto crítico para visualización y descarga con firma temporal.
- **`GET /download/:key`:** Endpoint para descarga física validado por firma de token.

## 🔗 Dependencias
- **AssetRegistryService:** para el registro y búsqueda física de archivos.
- **AssetPolicyService:** para la seguridad y firma de URLs.
- **AssetAuditService:** para el registro inmutable de operaciones.
- **KernelContext:** utiliza el contexto derivado del servidor para identificar al actor en el flujo de ejecución.
