# FluxCore — Especificación Normativa: Sistema de Plantillas (Templates)

**Scope:** definición formal del sistema de plantillas del núcleo + enriquecimiento FluxCore para uso por IA.  
**Fuentes de verdad:** el código y el schema DB del repo.

---

## 1. Definición

Una **Plantilla (Template)** es un recurso persistido en DB, scope por `accountId`, que contiene:
- Un `content` (texto) con placeholders tipo `{{variable}}`.
- Una lista declarativa `variables[]` (metadatos: nombre/tipo/etc).
- Vínculos a `assets` (archivos) mediante una tabla de relación.
- Estado `isActive`.

La ejecución de plantillas **no es responsabilidad de la IA**:
- El envío de la plantilla se ejecuta centralmente en [TemplateService.executeTemplate()](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:108:2-175:3) (núcleo).
- FluxCore agrega autorización + reglas de uso por IA mediante settings separados.

---

## 2. Modelo de datos (DB)

### 2.1 Tabla core: `templates`
**Archivo:** [packages/db/src/schema/templates.ts](cci:7://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/packages/db/src/schema/templates.ts:0:0-0:0)  
**Migración base:** [packages/db/migrations/031_template_crud.sql](cci:7://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/packages/db/migrations/031_template_crud.sql:0:0-0:0)

Campos relevantes:
- `id` (uuid)
- `accountId` (uuid, FK accounts, cascade)
- `name` (varchar)
- `content` (text)
- `category` (varchar nullable)
- `variables` (jsonb, default `[]`)
- `tags` (jsonb, default `[]`)
- `isActive` (bool default true)
- `usageCount` (int default 0)
- `createdAt`, `updatedAt`

**Invariante core:** una plantilla pertenece a una cuenta (`accountId`). Cualquier operación debe validar ese scope.

---

### 2.2 Relación con assets: `template_assets`
**Archivo:** [packages/db/src/schema/template-assets.ts](cci:7://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/packages/db/src/schema/template-assets.ts:0:0-0:0)

Campos:
- `templateId` (uuid)
- `assetId` (uuid)
- `version` (int default 1)
- `slot` (varchar default 'default')
- `linkedAt` (timestamptz)

PK compuesta:
- (`templateId`, `assetId`, `slot`)

---

### 2.3 Settings FluxCore: `fluxcore_template_settings`
**Archivo:** `packages/db/src/schema/fluxcore-template-settings.ts`  
**Migración:** [packages/db/migrations/034_fluxcore_template_refactor.sql](cci:7://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/packages/db/migrations/034_fluxcore_template_refactor.sql:0:0-0:0)

Campos:
- `templateId` (uuid, PK, FK templates.id cascade)
- `authorizeForAI` (bool default false)
- `aiUsageInstructions` (text nullable)
- `updatedAt`

**Nota histórica (importante):**
- Existió `templates.authorize_for_ai` (migración [033_template_ai_authorization.sql](cci:7://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/packages/db/migrations/033_template_ai_authorization.sql:0:0-0:0)).
- Luego se migró su valor a `fluxcore_template_settings` y se eliminó esa columna del core ([034_fluxcore_template_refactor.sql](cci:7://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/packages/db/migrations/034_fluxcore_template_refactor.sql:0:0-0:0)).
- Por lo tanto, **la autorización IA no vive en `templates`**.

---

## 3. Servicios core (núcleo)

### 3.1 CRUD core + assets adjuntos
**Archivo:** [apps/api/src/services/template.service.ts](cci:7://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:0:0-0:0)

Métodos:
- [listTemplates(accountId)](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:32:2-40:3) → retorna templates del core + assets adjuntos ([attachAssets](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:217:2-260:3)).
- [getTemplate(accountId, templateId)](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:42:2-48:3) → valida scope y retorna assets con metadata.
- [createTemplate(accountId, data)](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:50:2-66:3)
- [updateTemplate(accountId, templateId, data)](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:68:2-96:3)
- [deleteTemplate(accountId, templateId)](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:99:2-106:3)
- [linkAsset(accountId, templateId, assetId, slot?)](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:261:2-276:3)
- [unlinkAsset(accountId, templateId, assetId, slot?)](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:278:2-290:3)

### 3.2 Ejecución (envío) core: [executeTemplate()](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:108:2-175:3)
**Archivo:** [apps/api/src/services/template.service.ts](cci:7://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:0:0-0:0)

Contrato:
- Input:
  - `accountId` (senderAccountId al enviar)
  - `templateId`
  - `conversationId`
  - `variables?: Record<string,string>`
  - `generatedBy?: 'human' | 'ai'` (default 'human')
- Proceso real verificado:
  1. [getTemplate()](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:42:2-48:3) + assets
  2. Reemplazo literal de variables en `content`:
     - Por cada par `{key,value}` hace `finalContent.replace(new RegExp({{key}}, 'g'), value)`
  3. Construye array `media[]` desde assets:
     - Determina `type` por `mimeType` (image/audio/video/document)
  4. Envía el mensaje vía `messageCore.send()` con:
     - `senderAccountId = accountId`
     - `content.text = finalContent`
     - `content.media = media (si hay)`
     - `type = 'outgoing'`
     - `generatedBy = 'human' | 'ai'`
  5. Si el envío fue exitoso, vincula assets en `message_assets` mediante `assetRelationsService.linkAssetToMessage(...)`

**Soberanía core:** toda acción con efectos secundarios (enviar mensaje + link assets al mensaje) está centralizada aquí.

---

## 4. Enriquecimiento FluxCore (IA)

FluxCore agrega dos capacidades sobre el core:
1. **Autorización explícita para IA** (por template).
2. **Instrucciones de uso** para que el modelo sepa cuándo corresponde disparar una plantilla.

### 4.1 Servicio de settings: [FluxCoreTemplateSettingsService](cci:2://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/fluxcore/template-settings.service.ts:7:0-87:1)
**Archivo:** [apps/api/src/services/fluxcore/template-settings.service.ts](cci:7://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/fluxcore/template-settings.service.ts:0:0-0:0)

Regla de autorización para que una template sea “usable por IA”:
- `templates.accountId == accountId`
- `templates.isActive == true`
- `fluxcore_template_settings.authorizeForAI == true`

### 4.2 Registro normativo (Single Source of Truth IA): `templateRegistryService`
**Archivo:** [apps/api/src/services/fluxcore/template-registry.service.ts](cci:7://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/fluxcore/template-registry.service.ts:0:0-0:0)

Responsabilidades:
- [getAuthorizedTemplates(accountId)](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/fluxcore/template-registry.service.ts:32:4-37:5):
  - delega al settings service (JOIN core + settings).
- [buildInstructionBlock(accountId)](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/fluxcore/template-registry.service.ts:39:4-96:5):
  - si no hay templates autorizadas → `null`
  - si hay → retorna un bloque de texto “SISTEMA DE PLANTILLAS OFICIALES” que incluye:
    - reglas: si coincide intención → llamar `send_template` y NO agregar texto adicional
    - tabla: `template_id`, nombre, instrucciones (`aiUsageInstructions`), variables (solo nombres)
    - directiva adicional para runtime local: `CALL_TEMPLATE:<template_id> {"var":"..."}`
- [canExecute(templateId, accountId)](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/fluxcore/template-registry.service.ts:98:4-108:5):
  - requiere `authorizeForAI = true`
  - y que el template esté dentro de [getAuthorizedTemplates(accountId)](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/fluxcore/template-registry.service.ts:32:4-37:5)

### 4.3 Ejecución “desde IA”: `aiTemplateService`
**Archivo:** [apps/api/src/services/ai-template.service.ts](cci:7://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/ai-template.service.ts:0:0-0:0)

Contrato:
- [sendAuthorizedTemplate({ templateId, accountId, conversationId, variables? })](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/ai-template.service.ts:17:4-43:5)
  1. valida con [templateRegistryService.canExecute(...)](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/fluxcore/template-registry.service.ts:98:4-108:5)
  2. si OK → delega en core [templateService.executeTemplate({ ..., generatedBy: 'ai' })](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:108:2-175:3)

**Invariante de seguridad:** la IA no puede “enviar cualquier template” si no fue autorizada en settings + scope.

---

## 5. API HTTP (Backend)

### 5.1 API core de plantillas: [templates.routes.ts](cci:7://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/routes/templates.routes.ts:0:0-0:0)
**Archivo:** [apps/api/src/routes/templates.routes.ts](cci:7://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/routes/templates.routes.ts:0:0-0:0)

Notas verificadas:
- [listTemplates](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:32:2-40:3) y [getTemplate](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:42:2-48:3) devuelven **respuesta enriquecida**:
  - `authorizeForAI`
  - `aiUsageInstructions`
  (provienen de `fluxcore_template_settings`)

- [createTemplate](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:50:2-66:3)/[updateTemplate](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:68:2-96:3):
  - si el body incluye `authorizeForAI` o `aiUsageInstructions`, se persiste en `fluxcore_template_settings`.

- [executeTemplateHandler](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/routes/templates.routes.ts:178:0-204:1):
  - ejecuta con `generatedBy: 'human'`.

---

### 5.2 API runtime FluxCore (tools): [fluxcore-runtime.routes.ts](cci:7://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/routes/fluxcore-runtime.routes.ts:0:0-0:0)
**Archivo:** [apps/api/src/routes/fluxcore-runtime.routes.ts](cci:7://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/routes/fluxcore-runtime.routes.ts:0:0-0:0)

Endpoints relevantes:
- `POST /fluxcore/runtime/tools/list-templates`
  - Input: `{ accountId }`
  - Output: lista simplificada de templates autorizadas para IA:
    - `{ id, name, category, variables: string[], instructions }`

- `POST /fluxcore/runtime/tools/send-template`
  - Input: `{ accountId, conversationId, templateId, variables? }`
  - Acción: llama [aiTemplateService.sendAuthorizedTemplate(...)](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/ai-template.service.ts:17:4-43:5)

---

## 6. Tools en la Extensión FluxCore (function calling)

**Archivo:** [extensions/fluxcore/src/tools/registry.ts](cci:7://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/extensions/fluxcore/src/tools/registry.ts:0:0-0:0)

Definiciones de tools ofrecidas al modelo cuando `hasTemplatesTool` es true:
- `list_available_templates`
  - sin parámetros
  - retorna JSON con `templates` (lista)
- `send_template`
  - parámetros:
    - `template_id` (string, requerido)
    - `variables` (object string->string opcional)

Ejecución real:
- La extensión no implementa la lógica de templates; depende de [ToolRegistryDeps](cci:2://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/extensions/fluxcore/src/tools/registry.ts:30:0-39:1):
  - [listTemplates(accountId)](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:32:2-40:3)
  - `sendTemplate({ accountId, conversationId, templateId, variables })`

---

## 7. Resumen de invariantes (lo “normativo”)

- La plantilla es **core** (`templates`, `template_assets`); FluxCore agrega settings (`fluxcore_template_settings`).
- La ejecución (enviar mensaje + link assets) está centralizada en core ([TemplateService.executeTemplate](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/template.service.ts:108:2-175:3)).
- La IA solo dispara plantillas a través de:
  - endpoint runtime `/fluxcore/runtime/tools/*` y
  - validación [templateRegistryService.canExecute](cci:1://file:///c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/services/fluxcore/template-registry.service.ts:98:4-108:5).
- “Autorizada para IA” significa:
  - template activa (`isActive = true`)
  - de la cuenta (`accountId`)
  - settings `authorizeForAI = true`

---

## 8. No-alcances (explícitos)

Este documento NO define:
- límites por canal (WhatsApp/Telegram/etc)
- validación estricta de variables vs `TemplateVariable.type`
- versionado de template content
- autosave/UX de editor en frontend

(Esos temas están fuera de la lógica verificada del backend/runtime actual.)