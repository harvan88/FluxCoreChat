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

**Última actualización:** 2026-05-10 (Hidratación Soberana & Human Schedules)
**Validador:** `DocumentationQualityService` (backend)

---

## 📊 Métricas Globales de Cobertura

| Paisaje | Documentos | Estado | Fase |
| :--- | :--- | :--- | :--- |
| **01-ui-landscape** | 173 docs | ✅ Completado | Fase 1 |
| **02-backend-landscape** | 202 docs | ✅ Completado | Fase 2 |
| **03-database-landscape** | 33 docs | ✅ Completado | Fase 3 |
| **04-end-to-end-flows** | 1 doc | ⏳ Pendiente | Fase 4 |
| **05-configuration-state** | 2 docs | ⏳ Parcial | Fase 5 |
| **TOTAL** | **411 docs** | 🏗️ 3/5 Fases | — |

---

## 🖥️ 1. UI Landscape — Componentes React (173 docs)

**Ubicación:** `01-ui-landscape/`
**Nomenclatura:** `PascalCase.md`

### Subsistemas Críticos UI (Actualizado):

```
📦 Shared & Layout UI
├── CollectionView.md (Actualizado)
├── Table.md (Actualizado)
├── ViewHeader.md (NUEVO)
└── LoadingState.md

⏰ Schedule System UI (NUEVO)
├── ScheduleEditor.md (Estable)
├── ScheduleSection.md (Estable)
├── ScheduleSummary.md
└── SedeScheduleView.md

📝 Template System UI
├── TemplateList.md (Actualizado)
├── TemplateEditor.md (Actualizado)
├── TemplateManager.md
└── ConversationRowAIStatus.md (NUEVO)

🔗 UI Logic & Context Hooks (NUEVO)
├── UseProfile.md (NUEVO)
├── UseContextSync.md (NUEVO)
└── UseContextRefresh.md (NUEVO)
```

---

## ⚙️ 2. Backend Landscape — Servicios y Rutas (202 docs)

**Ubicación:** `02-backend-landscape/`

### 🧠 FluxCore Kernel:
```
🏗️ Core Engines
├── kernel.md (Estable)
├── kernel-message-core.md (Actualizado - Hidratación Soberana)
├── kernel-dispatcher.md
└── core-workresolver.md
```

### Sistema Universal de Horarios (Fase 3):
```
⏰ Schedules Engine
├── schedule-service.md (Actualizado - Human Format)
├── schedules-routes.md (Estable)
├── location-service.md (Estable)
├── locations-routes.md (Estable)
├── distributed-event-bus.md (NUEVO)
└── ws-handler.md (NUEVO)
```

---

## 🗄️ 3. Database Landscape — Persistencia (33 docs)

**Ubicación:** `03-database-landscape/`

### Sistema Universal de Horarios (Fase 3):
```
📅 Universal Schedule Tables
├── weekly-schedules.md (NUEVO)
├── weekly-intervals.md (NUEVO)
├── special-dates.md (NUEVO)
└── special-intervals.md (NUEVO)

🔑 Core Identity & Locations
├── accounts.md (Actualizado)
└── locations.md (NUEVO)
```

---

## 🔗 Referencias
- **Estándar:** [00-STANDARD.md](./00-STANDARD.md)
- **Snapshot:** [00-SNAPSHOT.md](./00-SNAPSHOT.md)
- **Dashboard:** `DocumentationQualityPanel` (monitor en tiempo real)
