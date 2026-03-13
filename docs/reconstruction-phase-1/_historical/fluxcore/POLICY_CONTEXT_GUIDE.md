# **FLUXCORE — POLICY CONTEXT (CANON)**

## 0. Definición

> **PolicyContext** es la materialización estructurada, autorizada y computable del entorno operativo de una cuenta almacenado en ChatCore.
> Es el contrato de exposición mediante el cual cualquier runtime puede conocer el mundo autorizado de la cuenta sin acceder a la base original.

El PolicyContext:

* no define comportamiento
* no define estrategia
* no define prompts
* no configura la IA

El PolicyContext únicamente describe:

**qué existe y qué está permitido operar automáticamente.**

---

## 1. Principios operativos

1. Se resuelve una sola vez por mensaje o trigger antes de invocar runtimes.
2. Es completamente reconstruible; puede eliminarse y generarse nuevamente sin pérdida.
3. Todo dato incluido debe corresponder a un recurso humano existente en ChatCore.
4. Todo valor debe trazarse a una autorización explícita otorgada por la cuenta.
5. Ningún runtime puede acceder directamente a ChatCore. Toda información externa proviene exclusivamente del PolicyContext.
6. El PolicyContext no contiene decisiones de ejecución ni selección de runtime.
7. Debe poder generarse sin inferencia ni modelos de IA.

> El PolicyContext no es memoria del asistente; es proyección autorizada del mundo.

---

## 2. Responsabilidades sistémicas

| Sistema      | Responsabilidad                                                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **ChatCore** | Custodia los datos humanos (perfil, plantillas, horarios, catálogo, notas). Permite marcar “uso automatizado”. No conoce IA ni runtimes. |
| **FluxCore** | Construye el PolicyContext a partir de recursos autorizados, mantiene cache e invalidación por eventos y lo entrega a los runtimes.      |
| **Runtimes** | Consumen el PolicyContext y deciden cómo actuar. Nunca determinan qué recursos existen.                                                  |

---

## 3. Naturaleza del contexto

El PolicyContext no provee inteligencia.
Provee **realidad autorizada**.

Describe:

* identidad operativa
* disponibilidad
* conocimiento institucional
* recursos delegables

No describe:

* comportamiento conversacional
* estrategia
* estilo del asistente
* decisiones automáticas

---

## 4. Dominios del PolicyContext

| Dominio          | Propósito                             | Tipo        |
| ---------------- | ------------------------------------- | ----------- |
| **identity**     | Describe quién es la entidad          | Descriptivo |
| **presence**     | Describe cuándo y dónde existe        | Descriptivo |
| **conversation** | Conocimiento institucional autorizado | Descriptivo |
| **commercial**   | Información comercial válida          | Descriptivo |
| **resources**    | Capacidades delegables operables      | Operable    |

Los dominios son independientes y pueden invalidarse de forma granular.

---

### 4.1 Dominios descriptivos

Son contexto puro. El runtime solo los lee.

Incluyen:

* nombre
* bio
* idioma
* zona horaria
* horarios
* sucursales
* FAQs
* notas CRM
* reglas comunicacionales
* catálogo

Regla:

> Todo dominio descriptivo debe poder generarse sin inferencia de IA.

No pertenecen aquí:

* resúmenes automáticos
* embeddings
* interpretaciones del modelo

---

### 4.2 Dominio operable: `resources` 

Contiene **posibilidades de acción autorizadas**.

No son herramientas.
No son ejecuciones.

Son recursos humanos que pueden materializarse computacionalmente.

Ejemplos:

* plantillas aprobadas
* mensajes oficiales
* handoff a humano
* acciones manuales delegables

El runtime convierte estos recursos en acciones concretas.

---

## 5. Slots (definición canónica)

Un **slot** no es un permiso ni un campo en base de datos.

Un slot aparece cuando convergen simultáneamente:

1. Existe un recurso humano en ChatCore.
2. La cuenta autorizó su uso automatizado.
3. Existe un runtime capaz de ejecutarlo.

```
recurso humano
+ autorización
+ capacidad computacional
= slot
```

Los slots viven exclusivamente en FluxCore.
ChatCore nunca crea herramientas.

El PolicyContext enumera recursos; el runtime materializa slots.

---

## 6. Autorización (“uso automatizado”)

La cuenta no configura IA.
La cuenta **autoriza delegación operativa**.

Cada recurso puede marcarse:

> Permitir uso automatizado

Esto significa:

La cuenta permite que sistemas automáticos actúen usando ese recurso en su nombre.

Toda información presente en el PolicyContext debe corresponder a una autorización explícita.

---

## 7. Flujo de generación

1. El usuario modifica información en ChatCore.
2. Marca recursos con “permitir uso automatizado”.
3. ChatCore persiste y emite un Domain Event.
4. FluxCore invalida el dominio correspondiente en cache.
5. En el próximo mensaje o trigger, FluxCore reconstruye solo los dominios necesarios.
6. El runtime recibe el nuevo PolicyContext.

---

## 8. Eventos e invalidación

El sistema funciona mediante proyección por eventos, no sincronización de bases.

```
ChatCore guarda → emite evento → FluxCore invalida → reconstrucción bajo demanda
```

Propiedades:

* FluxCore no replica la base.
* FluxCore no hace polling.
* FluxCore no necesita sincronización continua.

> El PolicyContext es la proyección válida más reciente autorizada, no un reflejo inmediato.

El sistema es eventualmente consistente por diseño.

---

## 9. Restricciones

El PolicyContext:

* no contiene prompts
* no contiene selección de runtime
* no contiene delays
* no contiene modo automático/supervisado
* no contiene estrategia conversacional
* no contiene estilo

Eso pertenece a **Execution Policy**, no al PolicyContext.

> **NOTA DE UNIFICACIÓN (v8.2):** Aunque teóricamente se separan, el `FluxPolicyContext` de la implementación real unifica ambos dominios (Realidad + Ejecución) para garantizar que el runtime sea 100% soberano y no delegue la resolución de modo o tono. Consultar `FLUXCORE_V8_IMPLEMENTATION_PLAN.md` H2.1 para la interfaz TypeScript vigente.


---

## 10. Forma de referencia (JSON)

```json
{
  "policyContextVersion": "timestamp",
  "accountId": "acc_x",

  "identity": {
    "displayName": "Tienda Flux",
    "username": "tienda_flux",
    "language": "es",
    "bio": "Vendemos hardware industrial"
  },

  "presence": {
    "timezone": "America/Argentina/Buenos_Aires",
    "businessHours": [
      { "days": ["mon","fri"], "open": "09:00", "close": "18:00" }
    ],
    "locations": [
      { "name": "Casa Central", "address": "Av. 123" }
    ]
  },

  "conversation": {
    "rules": ["No enviar precios por chat"],
    "faqs": [
      { "question": "¿Hacen envíos?", "answer": "Sí, a todo el país" }
    ],
    "notes": ["Cliente VIP"]
  },

  "commercial": {
    "catalog": [
      { "sku": "ABC-123", "name": "Kit Flux", "price": 199 }
    ]
  },

  "resources": {
    "templates": [
      { "id": "tpl_x", "name": "Bienvenida", "variables": ["nombre"] }
    ],
    "actions": [
      { "type": "handoff", "label": "Enviar a humano" }
    ]
  }
}
```

Los runtimes deben tolerar dominios ausentes o vacíos.

---

## 11. Garantía sistémica

El PolicyContext permite que múltiples runtimes operen sobre la misma cuenta sin coordinación directa.

Todos comparten:
**el mismo mundo autorizado.**

Sin este contrato:

* dos runtimes podrían actuar sobre realidades distintas
* se perdería auditabilidad
* se rompería la soberanía de ChatCore

---

## 12. Cláusula final

> ChatCore decide qué puede ser conocido.
> FluxCore decide cuándo ejecutar.
> El runtime decide cómo actuar.

El PolicyContext es el puente entre la voluntad humana y la ejecución automática.
Mantener esta separación es lo que evita que FluxCore se degrade a un chatbot.

---

## Apéndice A — Auditoría actual de slots y runtime

### 1. Slot operativo vigente: Plantillas

**Flujo actual**

1. ChatCore crea y mantiene plantillas en `templates` junto con sus assets (`template.service.ts`).
2. El equipo marca autorizaciones en `fluxcore_template_settings` (`authorizeForAI`, instrucciones de uso) mediante `fluxCoreTemplateSettingsService`.
3. `templateRegistryService` construye la lista autorizada y genera bloques de instrucciones que los runtimes inyectan cuando la tool `templates` está habilitada.
4. Durante la inferencia, los runtimes llaman a `aiTemplateService`, que valida con el registry (`canExecute`) y delega la ejecución final al servicio central de plantillas de ChatCore.

**Datos que requieren `allowAutomatedUse`**

- Plantillas activas (`templates.isActive`) y sus assets asociados.
- Configuración de autorización existente (`fluxcore_template_settings.authorizeForAI`).
- Variables e instrucciones de uso (`aiUsageInstructions`).

**Eventos mínimos**

- `template.updated` (contenido o metadatos).
- `template.authorization.changed` (cambios en autorizaciones).
- `template.asset.linked` / `template.asset.unlinked`.

**Impacto**

- Este slot ya funciona end-to-end (ChatCore expone → FluxCore enriquece → runtime ejecuta). Los cambios deben limitarse a incorporar el nuevo flag/eventos sin romper `aiTemplateService` ni la tool `templates`.

### 2. Asistente por defecto y composición

**Flujo actual**

1. Si una cuenta no tiene asistente activo, `ensureActiveAssistant` genera instrucciones gestionadas y crea un asistente por defecto.
2. `generateManagedInstructionContent` arma el prompt con datos del perfil (`accounts.profile`), contexto privado y reglas de estilo.
3. El runtime (`runtime.service.ts`) inyecta instrucciones, herramientas y bloques dinámicos (e.g. plantillas) antes de invocar al proveedor IA.

**Datos que requieren `allowAutomatedUse`**

- Campos del perfil público (`accounts.profile`, `accounts.displayName`, `accounts.username`).
- Contexto privado utilizado en instrucciones gestionadas.
- Configuraciones automáticas del asistente (modelConfig, timingConfig) cuando se expongan a PolicyContext.

**Eventos mínimos**

- `account.profile.updated`.
- `account.private_context.updated`.
- `assistant.model_config.updated` / `assistant.timing_config.updated` (si alimentan dominios operables/descriptivos).

**Impacto**

- Hoy parte del perfil fluye directo a instrucciones gestionadas. Para mantener la soberanía de ChatCore, esos datos deben pasar por PolicyContext (dominio `identity`/`conversation`) detrás del flag antes de que FluxCore los use para generar prompts.

### 3. Otros componentes identificados

- **Herramientas**: `fluxcoreToolDefinitions` ya incluye la tool `templates` obligatoria; revisar cada tool futura para exigir flag/eventos antes de exponerla como slot.
- **Vector stores y asistentes personalizados**: `fluxcoreAssistantVectorStores` y `fluxcoreAssistantTools` pueden convertirse en slots adicionales; requieren analizar si consumen datos autorizados (catalogs, documentos) o configuraciones privadas.
- **Automatizaciones/Handoffs**: cualquier acción manual delegable que ya esté disponible en UI debe auditarse para confirmar si produce efectos automáticos (llamadas, asignaciones) y, de ser así, someterse al mismo flag/eventos.

### 4. Próximos pasos de auditoría

1. **Conteo por recurso**: ejecutar consultas por cuenta/tablas para cuantificar cuántos registros quedarían marcados con `allowAutomatedUse` y priorizar migraciones.
2. **Mapa de dependencias**: documentar qué servicios/runtimes leen cada recurso para asegurar que, tras la transición, solo lo hagan vía PolicyContext.
3. **Checklist por dominio**: para `identity`, `presence`, `conversation`, `commercial` y `resources`, enumerar los campos de origen en ChatCore y confirmar que cada uno tenga flag + evento antes de exponerlo.
4. **Validación cruzada**: simular apagado/encendido de FluxCore verificando que plantillas, asistente por defecto y demás slots se reconstruyan únicamente desde eventos autorizados.

---

## Apéndice B — Estrategia de flags y eventos por dominio

| Dominio | Origen en ChatCore | Campo/estructura que requiere `allowAutomatedUse` | Evento(s) a emitir | Notas de implementación |
| --- | --- | --- | --- | --- |
| **identity** | `accounts` (`displayName`, `username`, `profile.*`, `privateContext`) | `accounts.profile.allowAutomatedUse` (por sección) + bandera para cada bloque del perfil y contexto privado | `account.profile.updated`, `account.private_context.updated`, `account.identity.authorization.changed` | El asistente gestionado debe leer solo los campos autorizados vía PolicyContext; mantener fallback seguro cuando no haya flag. |
| **presence** | Módulos de horarios (`appointments`, configuraciones de sucursal) | banderas sobre cada rango horario/ubicación (`businessHours`, `locations`) | `presence.schedule.updated`, `presence.location.updated` | Ajustar caches de disponibilidad para regenerar dominios sin mezclar configuraciones internas. |
| **conversation** | `relationships.context`, notas CRM, FAQs (`conversation_service`), reglas de comunicación | flags por recurso (FAQ, nota, regla) expuestos en UI usando `Switch` | `conversation.note.updated`, `conversation.faq.updated`, `conversation.policy.updated` | El runtime solo puede citar reglas/notas con flag activo; sin flag permanecen privadas. |
| **commercial** | catálogos, inventario, pricing (`catalog_service`, `products`) | bandera por SKU/lista de precios para habilitar automatización | `catalog.updated`, `catalog.pricing.updated`, `catalog.authorization.changed` | Si un SKU pierde flag, se invalida dominio `commercial` y se recalcula. |
| **resources** | plantillas (`templates`), handoffs, herramientas | `templates.allowAutomatedUse` (se deriva de `fluxcore_template_settings.authorizeForAI`), flags equivalentes para handoffs/actions | `template.updated`, `template.authorization.changed`, `handoff.updated`, `handoff.authorization.changed` | Mantener `TemplateRegistry` como única fuente, solo que ahora consulta el flag desde ChatCore antes de exponer recursos. |

### Pasos secuenciales

1. **Migraciones de datos**
   - Añadir columnas/JSON paths para `allowAutomatedUse` en cada tabla o subdocumento según dominio.
   - Poner default `false` y migrar a `true` únicamente donde hoy ya exista autorización explícita (e.g. `fluxcore_template_settings.authorizeForAI`).

2. **UI + APIs**
   - Incorporar el `Switch` común (`apps/web/src/components/ui/Switch.ts`) en cada formulario para exponer la bandera.
   - Ajustar DTOs/validaciones para aceptar el flag y persistirlo sin introducir lógica de IA (semántica: “permitir uso automatizado”).

3. **Eventos**
   - Implementar publishers por dominio (p. ej. `presenceEventsService.emitScheduleUpdated(accountId, dataVersion)`).
   - Versionar payloads para que FluxCore pueda invalidar dominios específicos sin reinterpretar datos.

4. **FluxCore listeners**
   - Configurar workers/colas para traducir cada evento en invalidaciones del cache de PolicyContext.
   - Recalcular únicamente el dominio afectado y registrar `policyContextVersion` por dominio.

5. **Validaciones**
   - Pruebas unitarias por dominio verificando que retirar un flag elimina el dato del PolicyContext en la siguiente resolución.
   - Test de smoke integrando plantillas y asistente gestionado para asegurar que los runtimes dependen solo del dominio autorizado.

---

## Apéndice C — Permisos Granulares de Perfil (Implementación Febrero 2026)

### 1. Motivación
Para maximizar el control de privacidad, el sistema ahora permite autorizar de forma independiente cada campo principal del perfil de cuenta. Esto permite, por ejemplo, que la IA use el "Contexto Privado" para guiar su comportamiento sin revelar el "Nombre Visible" real de la cuenta o su "Biografía" pública.

### 2. Niveles de Autorización Granular (Perfil)

Se introdujeron tres banderas en la tabla `accounts` que refinan la visibilidad de los datos cuando `allowAutomatedUse` está activo:

| Campo | UI: Interruptor (Sparkles) | Propósito | Impacto en PolicyContext |
| :--- | :--- | :--- | :--- |
| **aiIncludeName** | Junto a "Nombre visible" | Controla la exposición del nombre. | **False**: El nombre se proyecta como `"Redacted"`. |
| **aiIncludeBio** | Junto a "Presentación" | Controla la exposición de la biografía. | **False**: El campo `bio` se proyecta como `undefined`. |
| **aiIncludePrivateContext** | Junto a "Contexto para IA" | Controla el acceso al contexto privado. | **False**: El campo `privateContext` se proyecta como `undefined`. |

### 3. Resolución en PolicyContext

El `FluxPolicyContextService` resuelve estas banderas durante la fase de **Identity Resolution**:

1.  Si `allowAutomatedUse` es **false**, todos los datos (bio, contexto) son omitidos y el nombre es forzado a "Redacted" si `aiIncludeName` es false.
2.  Si `allowAutomatedUse` es **true**, cada campo se incluye o redacta individualmente según su bandera específica.

### 4. Diseño de Interfaz (UI Pattern)
Siguiendo el diseño general de FluxCore, cada campo de entrada en la sección de Perfil cuenta con un icono de **Sparkles** (Chispas) que actúa como toggle de autorización. 
*   **Icono Activo (Color)**: El campo es visible para el Kernel de IA.
*   **Icono Inactivo (Gris)**: El campo está protegido y no se incluye en el PolicyContext.

### 5. Plantillas (Resources)
A diferencia del perfil, las **Plantillas** mantienen un modelo de autorización simplificado:
*   La autorización es por recurso completo.
*   Si una plantilla está autorizada (`allowAutomatedUse = true`), se incluye su nombre, contenido e instrucciones.
*   Este diseño evita la sobre-configuración en recursos operativos masivos, concentrando la privacidad granular en la identidad de la cuenta.

