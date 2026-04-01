---
id: "00-INDEX"
type: "core"
status: "stable"
criticality: "high"
location: "docs/reconstruction-phase-1/exhaustive-mapping/00-INDEX.md"
---

# 🤖 00-INDEX — Índice Maestro de Documentación Exhaustiva

## 🎯 Propósito
Centraliza el acceso a todos los paisajes documentados (UI, Backend, Database) y proporciona métricas reales del estado de cobertura del proyecto FluxCore.

**Última actualización:** 2026-04-01 (Actualizado con cambios de template-registry y prompt-builder)
**Validador:** `DocumentationQualityService` (backend)

---

## 📊 Métricas Globales de Cobertura

| Paisaje | Documentos | Estado | Fase |
| :--- | :--- | :--- | :--- |
| **01-ui-landscape** | 162 docs | ✅ Completado | Fase 1 |
| **02-backend-landscape** | 182 docs | ✅ Completado | Fase 2 |
| **03-database-landscape** | 33 docs | ✅ Completado | Fase 3 |
| **04-end-to-end-flows** | 1 doc | ⏳ Pendiente | Fase 4 |
| **05-configuration-state** | 2 docs | ⏳ Parcial | Fase 5 |
| **TOTAL** | **380 docs** | 🏗️ 3/5 Fases | — |

---

## 🖥️ 1. UI Landscape — Componentes React (162 docs)

**Ubicación:** `01-ui-landscape/`
**Nomenclatura:** `PascalCase.md` (basado en convención React)
**Estado:** Fase 1 completada (~95% de componentes detectados).

### Subsistemas Críticos UI:

```
📦 Asset & Media UI
├── AssetPreview.md
├── MessageBubble.md
└── useChatUnified.md
```

---

⚙️ 2. Backend Landscape — Servicios y Rutas (190+ docs)

**Ubicación:** `02-backend-landscape/`
**Nomenclatura:** `kebab-case.md` (basado en convención Node/Bun)
**Estado:** ✅ Fase 2 COMPLETADA y Consolidada (v8.3).

### Subsistemas Críticos Documentados:

```
🤖 AI Response Pipeline (FluxCore)
├── cognitive-dispatcher.service.md
├── tracer.md
├── runtime-input-factory.service.md
├── runtime-gateway.service.md
├── action-executor.service.md
└── cognition-worker.md

🛠️ Capabilities Platform (v8.3 Canon)
├── capability-registry.service.md
├── capability-offer.service.md
├── capability-translation.service.md
├── capability-execution.service.md
├── capability-deps-factory.service.md
├── capability-argument-normalizer.service.md
└── capability-openai-compat.service.md

📝 Template & Prompt Services
├── template-registry.service.md (needs_review)
├── prompt-builder.service.md (needs_review)
└── template-parsing-problem.md (Issue Crítico)

🧠 Kernel Architecture
├── kernel.md
├── base.projector.md
├── chat-projector.md
└── projector-runner.md

🔌 Runtime Adapters (Consumidores)
├── fluxi.runtime.md
├── asistentes-local.runtime.md (Consumidor Caps)
├── asistentes-openai.runtime.md (Consumidor Caps)
└── template-parsing-problem.md (Issue Crítico)

📦 Asset Management System
├── asset-audit-service.md
├── asset-policy.service.md
└── assets-routes.md
```

---

## 🗄️ 3. Database Landscape — Persistencia (33 docs)

**Ubicación:** `03-database-landscape/`
**Nomenclatura:** `kebab-case.md`
**Estado:** ✅ Fase 3 COMPLETADA — 100% de tablas exportadas en `index.ts` documentadas.

### Organización por Dominio:

```
🔑 Core Identity
├── users.md                    # Identidad base (email + hash)
├── accounts.md                 # Personas de negocio
├── actors.md                   # Ontología unificada (humanos, bots, extensiones)
├── workspaces.md               # Colaboración + RBAC
└── account-ai-entitlements.md  # Feature flags de IA

💬 Messaging & Social
├── conversations.md            # Hilos de chat
├── messages.md                 # Mensajes inmutables + versionado
├── conversation-participants.md # Participantes y roles
└── relationships.md            # Grafo social bilateral

🧠 Kernel (Sovereign Reality — RFC-0001)
├── kernel-journal.md           # 🔴 CRITICAL: Journal inmutable, Reality Adapters, Fact Types
├── fluxcore-identity.md        # 🔴 CRITICAL: Actors, Addresses, Identity Links (Projector Space)
├── cognition-queue.md          # Cola de turnos cognitivos (at-least-once)
└── outbox-pattern.md           # Transactional Outbox (chatcore + fluxcore)

🤖 AI Infrastructure
├── fluxcore-assistants.md      # Configuración de asistentes
├── fluxcore-instructions.md    # System prompts versionados
├── fluxcore-vector-stores.md   # RAG (Local + OpenAI dual-backend)
├── fluxcore-agents.md          # Orquestación de flujos multi-asistente
└── ai-observability.md         # Traces + Signals semánticos

⚡ Automation & Business
├── automation-rules.md         # Modos auto/suggest/off (PolicyContext)
├── account-governance.md       # Runtime config + Policies + Account deletion
├── wes-system.md               # Work Execution System (FSM transaccional)
├── credits.md                  # Wallets, Ledger, Sessions
├── extensions.md               # Plugin system (FC-150/151)
├── appointments.md             # Sistema de citas/turnos
└── templates.md                # Plantillas de respuesta + variables

📦 Assets & Media
└── assets.md                   # Gestión de archivos + deduplication SHA256

🛡️ Support & Audit
├── support-tables.md           # system_admins, password_reset, website_configs, ai_suggestions, etc.
├── database-audit-rationale.md # 🔴 CRITICAL: Auditoría de tablas huérfanas y deuda técnica
└── database-audit-report.md    # Reporte de estado

📋 Reference (Pre-existentes)
├── schemas-directory.md        # Directorio general de schemas
├── table-relationships.md      # Relaciones entre tablas
├── indexes-constraints.md      # Índices y constraints
└── migrations-history.md       # Historial de migraciones
```

---

## 🔄 4. End-to-End Flows — Flujos Completos (1 doc)

**Ubicación:** `04-end-to-end-flows/`
**Estado:** ⏳ Pendiente (1/5 flujos prometidos).

```
04-end-to-end-flows/
├── cognitive-pipeline-flow.md   # ✅ Flujo cognitivo completo
├── MESSAGE_LIFECYCLE.md         # ⏳ Mensaje desde input hasta persistencia
├── AUTHENTICATION_FLOW.md       # ⏳ Login → JWT → Validación
├── REALTIME_UPDATES.md          # ⏳ WebSocket broadcasting
└── FILE_UPLOAD_FLOW.md          # ⏳ Avatar upload, etc.
```

---

## ⚙️ 5. Configuration State — Configuración (2 docs)

**Ubicación:** `05-configuration-state/`
**Estado:** ⏳ Parcial.

```
05-configuration-state/
├── environment-variables.md    # ✅ Variables .env completas
└── feature-flags.md            # ✅ Control de funcionalidades
```

---

## 🚀 Próximos Pasos

### Inmediato
- [x] ✅ Completar Fase 1: UI Landscape (162 docs)
- [x] ✅ Completar Fase 2: Backend Landscape (180 docs)
- [x] ✅ Completar Fase 3: Database Landscape (33 docs)
- [ ] Iniciar Fase 4: End-to-End Flows (4 flujos pendientes)

### Corto plazo
- [ ] Completar End-to-End Flows (MESSAGE_LIFECYCLE, AUTH, REALTIME, FILE_UPLOAD)
- [ ] Workers Landscape (workers de fondo y procesos asíncronos)
- [ ] Cross-reference validation (docs vs código vs DB real)

---

## 🔗 Referencias
- **Estándar:** [00-STANDARD.md](./00-STANDARD.md)
- **Snapshot:** [00-SNAPSHOT.md](./00-SNAPSHOT.md)
- **Prompt:** [00-PROMPT.md](./00-PROMPT.md)
- **Dashboard:** `DocumentationQualityPanel` (monitor en tiempo real)

## 💡 Ejemplo de Uso
```typescript
// Acceder a la documentación programáticamente
import { readdirSync } from 'fs';

const landscapes = readdirSync('docs/reconstruction-phase-1/exhaustive-mapping/')
  .filter(d => d.match(/^\d{2}-/));
console.log('Paisajes:', landscapes);
// => ['01-ui-landscape', '02-backend-landscape', '03-database-landscape', ...]
```
