 # FluxCore — Equipo de Desarrollo para implementar WOS/WES

 **Objetivo:** Que un equipo (humano + IA de codificación económica) pueda implementar el **WOS** (FluxCore como sistema operativo de trabajo) y su **WES** (motor transaccional) sin ambigüedades, respetando `TOTEM.md` y usando el código/DB como fuentes de verdad.

**Inmutables:**
- `TOTEM.md` (principios)
- `3. CREACION DE HITOS.md` (metodología)

**Documentos base del WOS/WES:**
- `docs/FLUXCORE_WES_CANON.md`
- `docs/FLUXCORE_WES_HITOS.md`

---

## Nota canónica (decisión vs ejecución)

- MUST: El WES **no decide**; verifica/commitea/ejecuta.
- MAY: La decisión es externa (Agents/IA) y puede ser no determinista.
- MUST: Existe **Modo Conversacional** fuera del WES para mensajes no convertibles en Work.
- MUST: Un usuario **no “conversa”** con FluxCore; el usuario **completa una estructura de datos (Work/slots)** usando lenguaje natural.

---

## 1) Roles mínimos recomendados (5 personas)

### 1. Tech Lead / Arquitecto (Backend Senior)
- **Ownership**:
  - Invariantes WES
  - Contratos (WorkDefinition, Tool Contract, auditoría)
  - Decisiones de concurrencia/idempotencia
- **Responsabilidades**:
  - Diseñar el modelo de datos WES (tenant-first) y su estrategia de migraciones
  - Definir y proteger los invariantes canónicos (WOS/WES):
    - el WES no decide
    - el usuario completa Work/slots mediante lenguaje natural
    - por defecto: a lo sumo 1 Work activo por conversación
    - ante ambigüedad: desambiguación explícita, nunca “adivinar”
    - orden causal obligatorio: `Message → DecisionEvent → ProposedWork → Gate → Work`
    - Gate determinista: no abrir Work sin `bindingAttribute` + `evidence` no vacía
    - `SemanticContext/SemanticCommit`: confirmaciones resueltas sin LLM y consumibles 1 vez
    - `ExternalEffectClaim`: claim persistente ANTES de tool irreversible (exactly‑once)
    - delta estándar y auditoría reproducible
    - expiración declarada por WorkDefinition y aplicada por Scheduler
  - Revisar PRs críticos (DB, Core, seguridad)
  - Mantener consistencia con el Core y con el sistema de extensiones
- **Capacidades**:
  - Postgres, transacciones, locking/optimistic concurrency
  - Arquitectura TS/Bun
  - Modelado enterprise (auditoría, compliance, observabilidad)

### 2. Backend Engineer (Core + ExtensionHost)
- **Ownership**:
  - `apps/api/src/core/message-core.ts`
  - `apps/api/src/services/extension-host.service.ts`
  - permisos/contexto: `permission-validator` + `context-access`
- **Responsabilidades**:
  - Separar “automation IA” de “procesamiento de extensiones” (hito WES-110)
  - Definir resultado canónico de `onMessage` (handled/stopPropagation) (WES-120)
  - Garantizar orden determinista del pipeline de extensiones
- **Capacidades**:
  - Diseño de contracts
  - Seguridad capability-based

### 3. Backend Engineer (Work Engine)
- **Ownership**:
  - Implementación del WES como extensión `@fluxcore/work-engine` (recomendado)
- **Responsabilidades**:
  - FSM + slot validator + commit firewall
  - Persistencia y auditoría de eventos
  - Integración con Executor + Tools
  - Implementar `SemanticContext` + `SemanticCommit` (no LLM para "sí/ok/dale")
  - Implementar `ExternalEffectClaim` antes de tools irreversibles + manejo de conflicto
- **Capacidades**:
  - State machines
  - Testing y determinismo
  - Idempotencia y retry

### 4. Frontend Engineer (Enterprise UI)
- **Ownership**:
  - Work Inspector (UI operativa)
  - flujos Human-in-the-loop
- **Responsabilidades**:
  - UI para listar Works, ver slots/events/effects
  - UX consistente con `docs/DESIGN_SYSTEM.md` y lineamientos del repo
- **Capacidades**:
  - React + estado
  - Tablas/colecciones
  - Debug/observabilidad en UI

### 5. Platform/DB Engineer (o Backend con perfil infra)
- **Ownership**:
  - performance, índices, particionado y operación
- **Responsabilidades**:
  - auditoría de DB viva y coherencia con schema ORM
  - métricas/tracing/alerts
  - workers/colas para ejecución asíncrona
- **Capacidades**:
  - Postgres tuning
  - Observabilidad (tracing/metrics)

---

## 2) Alternativas de tamaño de equipo

### MVP (3 personas)
- TL Backend + Backend WES + Frontend.
- Se posterga hardening/infra avanzada a WES-190.

MUST: En MVP, el TL o el Frontend MUST asumir ownership de una suite mínima de smoke/integration tests (ver DoD) para evitar regressions al tocar router/pipeline/WES.

### Enterprise (7–9 personas)
- Agregar:
  - 1 QA/Automation
  - 1 Security/Compliance
  - 1 SRE/Observability

---

## 3) Reglas operativas para trabajar con IA de codificación económica

### 3.1 Responsabilidad de precisión
- MUST: Nunca aceptar comportamiento “probablemente”.
- MUST: Para cada PR:
  - listar archivos tocados
  - declarar invariantes afectadas
  - declarar validación ejecutada (`bun run build`, tests, queries DB si aplica)

### 3.2 Estrategia de ejecución
- El TL define el contrato.
- La IA implementa tareas pequeñas y verificables.
- El humano revisa:
  - cambios de Core
  - migraciones
  - permisos/seguridad

### 3.3 Gate de DB
- Toda migración MUST seguir `6. MIGRATIONS_REASONING_PROTOCOL.md`.
- Si no hay evidencia (DB viva + schema + journal), la tarea se bloquea.

---

## 4) Ownership por módulos (anclas reales del repo)

- **Core (sagrado)**:
  - `apps/api/src/core/message-core.ts`
- **Extension host + permisos**:
  - `apps/api/src/services/extension-host.service.ts`
  - `apps/api/src/services/permission-validator.service.ts`
  - `apps/api/src/services/context-access.service.ts`
- **IA (extensión)**:
  - `apps/api/src/services/ai.service.ts`
  - `apps/api/src/services/ai-execution-plan.service.ts`
  - `extensions/fluxcore/src/index.ts`
- **Agents / runtime de agentes (infra cognitiva)**:
  - `apps/api/src/services/agent-runtime/`
- **Automations**:
  - `apps/api/src/services/automation-controller.service.ts`
  - `apps/api/src/services/automation-scheduler.service.ts`
- **DB**:
  - `packages/db/src/schema/*`

---

## 5) Definition of Done (DoD)

### DoD por PR
- Tests relevantes pasan (unit/integration según el cambio).
- `bun run build` pasa.
- No se violan invariantes de `TOTEM.md`.
- No se violan invariantes de `docs/FLUXCORE_WES_CANON.md` (en particular: decisión vs ejecución; usuario completa Work; no adivinar; 1 Work activo por defecto; ProposedWork/DecisionEvent + Gate; SemanticContext; ExternalEffectClaim; delta/eventos; expiración).
- Si toca DB:
  - evidencia DB viva + schema + journal
  - script/migración registrada

SHOULD: Si el PR toca el pipeline de extensiones o el router (WOS-100/WES-120/WES-175), MUST incluir smoke tests de compatibilidad para extensiones.

SHOULD: Si el PR toca confirmaciones o tools irreversibles (WES-155/WES-158/WES-160), MUST incluir tests de no‑regresión:
- "sí/ok" sin `SemanticContext` pendiente no modifica slots
- `semanticContextId` consumido 1 vez
- ejecución de tool irreversible aborta si no obtiene `ExternalEffectClaim`

### DoD por hito
- Criterios de éxito de `docs/FLUXCORE_WES_HITOS.md` cumplidos.
- Documentación actualizada (contratos + rutas de código).
- Demo reproducible (pasos exactos) usando `QUICK_START.md`.
