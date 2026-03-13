# ChatCore — assets como subsistema de primera clase

## Objetivo de este documento

Documentar el subsistema de `assets` dentro de la carpeta activa, porque hoy ya es una infraestructura real y crítica del producto: afecta chat, perfiles, plantillas, planes, ingesta documental y consumo posterior por otros dominios.

## 1. Definición canónica recuperada

Un asset no debe entenderse como una URL pegada dentro de un mensaje. En el sistema actual, el asset debe entenderse como una entidad propia con:

- identidad estable
- ownership por cuenta
- storage desacoplado
- ciclo de vida
- deduplicación
- relaciones reutilizables con otras entidades

Esta definición está sostenida por la implementación actual, aunque todavía conviva con huellas transicionales de flujos legacy.

## 2. Por qué assets pertenece a ChatCore

Aplicando el test ontológico del sistema:

> **¿Este dato existiría si no hubiera IA en el sistema?**

La respuesta es sí.

Los archivos, adjuntos, avatars, multimedia, PDFs, audios y material operativo del negocio existirían aunque FluxCore no estuviera activo. Por eso la infraestructura base de assets pertenece a ChatCore.

FluxCore puede consumirlos, autorizarlos o proyectarlos para RAG, tools o runtimes, pero no es el dueño del asset como entidad primaria.

## 3. Implementación base validada en el código actual

### Tablas principales

- `packages/db/src/schema/assets.ts`
  - tabla principal de assets
  - define `accountId`, `workspaceId`, `scope`, `status`, `version`, `checksumSHA256`, `storageKey`, `storageProvider`
- `packages/db/src/schema/message-assets.ts`
  - relación `message ↔ asset`
- `packages/db/src/schema/template-assets.ts`
  - relación `template ↔ asset`
- `packages/db/src/schema/plan-assets.ts`
  - relación `plan ↔ asset`
- `packages/db/src/schema/asset-upload-sessions.ts`
  - sesiones efímeras de upload con TTL
- `packages/db/src/schema/asset-audit-logs.ts`
  - trazabilidad y auditoría
- `packages/db/src/schema/asset-policies.ts`
  - políticas y límites del subsistema

### Servicios principales

- `apps/api/src/services/asset-gateway.service.ts`
  - gestiona sesiones de upload, validación y paso al storage
- `apps/api/src/services/asset-registry.service.ts`
  - registra assets, aplica deduplicación, controla status y ubicación final
- `apps/api/src/services/asset-relations.service.ts`
  - vincula assets con mensajes, templates y plans
- `apps/api/src/services/asset-audit.service.ts`
  - registra eventos auditables
- `apps/api/src/services/asset-policy.service.ts`
  - políticas de acceso y límites
- `apps/api/src/services/asset-deletion.service.ts`
  - soft delete, purge y eliminación física controlada

### Superficie HTTP

- `apps/api/src/routes/assets.routes.ts`
  - crear sesiones de upload
  - subir binarios
  - hacer commit del upload y crear asset
  - consultar assets y operaciones derivadas

## 4. Modelo actual del asset

### Ownership

El asset pertenece primariamente a una cuenta:

- `assets.accountId`

Además puede tener:

- `workspaceId` opcional
- `uploadedBy` para trazabilidad del actor que subió
- `scope` para indicar el tipo de uso

### Lifecycle

Estados observables en el esquema actual:

- `pending`
- `ready`
- `archived`
- `deleted`

Esto confirma que el asset ya no es un blob sin semántica: tiene lifecycle explícito.

### Storage desacoplado

El asset no guarda un path hardcodeado como único contrato de uso. Guarda:

- `storageKey`
- `storageProvider`

y la escritura física la resuelve el adapter de storage.

### Deduplicación

La tabla `assets` mantiene:

- `checksumSHA256`
- restricción única por `(accountId, checksumSHA256)`

`AssetRegistryService` usa ese dato para reaprovechar un asset existente cuando la política lo permite.

## 5. Flujo operativo actual de ingesta

### Paso 1: crear sesión de upload

- `POST /api/assets/upload-session`
- `AssetGatewayService.createUploadSession()`

La sesión define:

- `accountId`
- `uploadedBy`
- límites de tamaño
- mime types permitidos
- TTL

### Paso 2: upload binario

- `PUT /api/assets/upload/:sessionId`
- `AssetGatewayService.uploadComplete()` o upload por chunks

Durante este paso el archivo vive con una key temporal en storage.

### Paso 3: commit del upload

- `POST /api/assets/upload/:sessionId/commit`
- `AssetRegistryService.createFromUpload()`

Aquí ocurre:

- cálculo/uso de checksum
- deduplicación cuando corresponde
- creación del registro en `assets`
- link de la sesión con el asset
- movimiento a key final
- transición de `pending` a `ready`

## 6. Integración actual con mensajes

### Contrato del contenido del mensaje

En `packages/db/src/schema/messages.ts`, `MessageContent.media[]` ya usa este shape:

- `assetId`
- `type`
- `mimeType?`

Esto es muy importante porque muestra que el camino canónico actual ya no depende de una URL incrustada como fuente de verdad.

### Persistencia del vínculo

En `apps/api/src/services/message.service.ts`:

- el mensaje se inserta en `messages`
- luego se recorren los `content.media[]`
- por cada `assetId` se crea relación en `message_assets`

Esto confirma que hoy existe un camino real y activo para tratar multimedia de mensaje como referencia a asset.

## 7. Integración con templates y plans

### Templates

`template_assets` permite reutilizar el mismo asset dentro de plantillas, con `slot` y `version`.

### Plans

`plan_assets` permite vincular assets a execution plans, con:

- `stepId`
- `dependencyType`
- `isReady`

Eso confirma que el asset ya no es solo chat media: también participa en estructuras operativas reutilizables.

## 8. Relación con FluxCore

FluxCore no es dueño del asset base, pero sí tiene estructuras para compartir o autorizar ciertos recursos derivados.

Ejemplo visible:

- `packages/db/src/schema/fluxcore-asset-permissions.ts`

Ese esquema no redefine el asset base del sistema. Regula acceso a recursos consumidos por FluxCore, como:

- vector stores
- instructions
- tool definitions

Por eso conviene distinguir dos niveles:

- **Asset base de ChatCore**
- **Permisos y consumo derivado desde FluxCore**

## 9. Multi-tenant y seguridad operativa

El subsistema ya refleja que el producto es multi-cuenta:

- el asset nace bajo `accountId`
- la verificación de ownership ocurre al vincularlo con mensajes, templates o plans
- `AssetRelationsService.verifyAssetOwnership()` evita vincular assets ajenos sin autorización

Esto vuelve a los assets parte del corazón multitenant del sistema, no un módulo accesorio.

## 10. Relación con avatares y perfil de cuenta

La tabla `accounts` ya contiene:

- `avatarAssetId`

Esto confirma otra idea importante:

- los assets no pertenecen solo al chat
- también son infraestructura de perfil y presentación pública del sistema

## 11. Trazabilidad y auditoría

La infraestructura actual ya prevé:

- log de uploads iniciados y completados
- link/unlink con entidades
- delete y purge auditables
- eliminación física controlada

Por eso `assets` no debe documentarse como simple almacenamiento. Es un subsistema con trazabilidad propia.

## 12. Invariantes canónicos vigentes para assets

- **Todo binario relevante del sistema debe tender a materializarse como asset.**
- **Los mensajes deben referenciar assets, no depender de URLs hardcodeadas como verdad principal.**
- **El ownership primario del asset vive en ChatCore.**
- **FluxCore puede consumir assets o recursos relacionados, pero no redefine la entidad asset base.**
- **El lifecycle del asset debe preservarse como parte del modelo.**
- **La deduplicación y el storage desacoplado son parte del diseño vigente, no solo de una propuesta teórica.**

## 13. Matices y deuda documental honesta

Hay que documentar este capítulo sin inventar perfección que todavía no existe.

Lo que sí está sostenido hoy:

- tabla `assets`
- sesiones de upload
- deduplicación
- relaciones a mensajes/templates/plans
- `content.media[].assetId`
- avatar por `avatarAssetId`

Lo que debe seguir tratándose como transición o zona a consolidar:

- coexistencia de flujos legacy o anteriores de media/upload en partes del repositorio
- documentación vieja que todavía mezcla asset de primera clase con adjunto simple
- falta de capítulo actualizado sobre consumo frontend completo del asset system

## 14. Papel de este documento dentro de la carpeta activa

Este documento debe funcionar como capítulo base de assets para la documentación futura.

Los siguientes capítulos que naturalmente deberían desprenderse de aquí son:

1. ingestión y upload end-to-end
2. assets en mensajes y frontend de chat
3. assets en templates
4. assets en planes y execution plans
5. storage adapters, retención y borrado físico
6. relación entre assets, vector stores y consumo cognitivo
