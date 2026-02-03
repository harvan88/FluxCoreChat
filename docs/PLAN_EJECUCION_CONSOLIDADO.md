# Plan de Ejecución Consolidado

> Basado en TOTEM.md, 1. EXECUTION_PLAN.md, PROTOCOLO_PROGRAMACION.md y CREACION DE HITOS.md (solo lectura). Documento actualizado al 2026-02-02.

---

## 1. Mandatos y Metodología

1. **Principio rector:** *ChatCore gobierna, extensiones inyectan.* Toda ejecución respeta TOTEM y el aislamiento del núcleo.
2. **Secuenciación estricta:** Se sigue la metodología definida en `3. CREACION DE HITOS.md`.
3. **Fuentes permitidas:** Solo se actualizan `1. EXECUTION_PLAN.md` y `docs/ESTADO_PROYECTO.md` cuando corresponda. El resto es inmutable (lectura).
4. **Reglas de programación:**
   - "NO asumir – VERIFICAR" (`2. PROTOCOLO_PROGRAMACION.md`).
   - Cada estado debe tener evidencia o marcarse como "no verificado".
5. **Notación de estado:** ⬜ No iniciado · 🟡 En progreso · ✅ Completado · 🔴 Bloqueado · 📋 Documentado pendiente ejecución.

---

## 2. Resumen Ejecutivo de Hitos

| Nº | Hito / Track | Objetivo | Estado (2026-02-02) | Dependencias clave | Notas rápidas |
|----|--------------|----------|----------------------|--------------------|---------------|
| 0 | Bootstrap del Monorepo | Infraestructura base Bun/Turbo/DB | 📋 (no evidencia reciente) | N/A | Requiere verificación para marcar ✅ |
| 1 | Fundamentos de Identidad | Users/Accounts/Auth | 📋 | H0 | Confirmar migraciones / endpoints |
| 2 | Chat Core | MessageCore sin IA embebida | 📋 | H1 | Revisar `MessageCore` actual y WS |
| 3 | Workspace UI | ActivityBar/Sidebar/ViewPort | 📋 | H2 | Alineado con `UI_PROTOCOL_STRICT.md` |
| 4 | Sistema de Extensiones | ExtensionHost + permisos | 📋 | H2 | Parcialmente aplicado, revisar `extension_installations` |
| 5 | @fluxcore/fluxcore | Extensión IA por defecto | 🟡 (FC-REALIGN) | H4 | Backend debe ejecutar extensión real |
| 6 | Contexto Relacional | Editor estructurado (2000 chars) | 📋 | H2 | Componentes ContactDetail & ContextEditor |
| 7 | Extensión de Turnos | Automations appointments | ⬜ | H4 | Espera completitud del sistema extensión |
| 8 | Adaptadores (WhatsApp) | Canal externo prioritario | ⬜ | H2/H4 | Integración futura |
| 9 | Workspaces colaborativos | Roles / miembros | ⬜ | H1/H3 | No iniciado |
| 10 | Production Ready | CI/CD/tests/deploy | ⬜ | Todos previos | Define cierre |
| 11 | Madurez Operativa Extensiones | Paralelismo + enrichments | ⬜ | H4 | Incluye FC-300 a FC-305 |
| 12 | Frontend de Enrichments | Visualización en tiempo real | ⬜ | H11 | Incluye FC-306 a FC-309 |
| 13 | Component Library & UI Unification | Sistema UI canónico | ✅ (94% completo) | H3 | Falta FC-417 (guía diseño extensiones) |
| 14 | Testing E2E & Hardening | Playwright + QA final | ⬜ | H10 | FC-500+ |
| AD | Account Deletion Agent | Guardianes/Autorización/Portal | 🟡 (AD-110) | Base legal | FC-AD plan en ejecución |
| PC | Automation Triggers Avanzados | PC-3 (Triggers) | 📋 | PC-1/2 | Próximo hito operativo |

---

## 3. Detalle por Hito

### Hito 0 – Bootstrap del Monorepo
- **Objetivo:** Infraestructura mínima (Bun workspaces, Turbo, packages base, apps api/web, linting, envs).
- **Estado:** 📋 (no evidencia reciente que confirme ✅).
- **Acciones pendientes:** Reconstruir lista de verificación y validar que todos los paquetes sigan compilando tras auditorías recientes.

### Hito 1 – Fundamentos de Identidad
- **Objetivo:** Schemas `users`, `accounts`, `actors` y auth end-to-end.
- **Estado:** 📋 (estructuras existen pero falta verificación formal).
- **Dependencias:** H0.
- **Próximos pasos:** Ejecutar smoke tests de login/registro y confirmar límites de `private_context`.

### Hito 2 – Chat Core
- **Objetivo:** Conversaciones, mensajes, MessageCore delegando a extensiones.
- **Estado:** 📋 (MessageCore ya delega; falta checklist completo de endpoints/WS).
- **Dependencias:** H1.
- **Próximos pasos:** Revalidar `relationships`, `conversations`, `messages` schemas y flujos WS.

### Hito 3 – Workspace UI
- **Objetivo:** ActivityBar, Sidebar, DynamicContainer, aislamiento por cuenta.
- **Estado:** 📋 (UI existe, auditada en 13R).
- **Dependencias:** H2.
- **Notas:** `docs/UI_PROTOCOL_STRICT.md` es la referencia oficial.

### Hito 4 – Sistema de Extensiones
- **Objetivo:** `extension_installations`, `extension_contexts`, `IExtension`, ExtensionHost.
- **Estado:** 📋 (implementado parcialmente; falta permiso granular y health checks).
- **Dependencias:** H2.
- **Próximos pasos:** Terminar permisos de contexto y validaciones runtime.

### Hito 5 – `@fluxcore/fluxcore`
- **Objetivo:** Extensión IA por defecto.
- **Estado:** 🟡 (FC-REALIGN en progreso; ejecutar extensión real via `IExtension` pendiente).
- **Tareas clave:** FC-170 a FC-179, más FC-REALIGN-110/114.
- **Archivos:** `extensions/fluxcore/*`, `apps/api/src/services/ai.service.ts`, `apps/web/src/components/fluxcore/*`.

### Hito 6 – Contexto Relacional
- **Objetivo:** Editor estructurado, prompt builder extendido.
- **Estado:** 📋.
- **Tareas:** FC-130 a FC-136.
- **Notas:** Límite 2000 chars, tipos note/preference/rule.

### Hito 7 – Extensión de Turnos
- **Objetivo:** Automation appointments (PC-180+).
- **Estado:** ⬜ (no iniciado).
- **Dependencias:** H4 + base automations.

### Hito 8 – Adaptadores (WhatsApp)
- **Objetivo:** Primer canal externo productivo.
- **Estado:** ⬜.
- **Notas:** Debe heredar límites de canal definidos recientemente.

### Hito 9 – Workspaces colaborativos
- **Objetivo:** Miembros, roles, invitaciones.
- **Estado:** ⬜.

### Hito 10 – Production Ready
- **Objetivo:** CI/CD, monitoreo, documentación.
- **Estado:** ⬜.

### Hito 11 – Madurez Operativa de Extensiones
- **Objetivo:** Paralelismo seguro, persistencia de enrichments, health/stats.
- **Estado:** ⬜.
- **Tareas:** FC-300 a FC-305 (Promise.allSettled con timeout, persistencia en `message_enrichments`, evento WS `enrichment:batch`).

### Hito 12 – Frontend de Enrichments
- **Objetivo:** Mostrar enrichments en tiempo real.
- **Estado:** ⬜.
- **Tareas:** FC-306 a FC-309 (store Zustand, IndexedDB, handler WS, UI `EnrichmentBadge`).

### Hito 13 – Component Library & UI Unification
- **Objetivo:** UI canónica.
- **Estado:** ✅ (94% – falta FC-417).
- **Notas:** Componentes `Button`, `Input`, `Card`, `Badge`, `SidebarLayout`, etc.; auditoría de 2026-01-14.

### Hito 14 – Testing E2E & Production Hardening
- **Objetivo:** Playwright + QA final.
- **Estado:** ⬜.
- **Tareas iniciales:** FC-500 (setup Playwright), FC-501 (auth), FC-502+ (flujos críticos).

### Track AD – Account Deletion Agent
- **Estado actual:**
  - AD-100 ✅ (guardianes).
  - AD-110 🟡 (middleware auth + seeds + pruebas).
  - AD-120 ✅ (snapshot + portal).
- **Próximo foco:** Completar AD-110 antes de avanzar.

### Track PC – Automation Triggers
- **Estado:** pendiente hito PC-3 "Automation Triggers Avanzados" con tareas PC-120 (schedule), PC-121 (webhook), PC-122 (UI). Ejecutar secuencialmente.

---

## 4. Próximos Pasos Prioritarios (Q1 2026)

1. **Cerrar AD-110** para liberar Account Deletion Agent.
2. **Ejecutar PC-3** siguiendo CREACION DE HITOS.
3. **Completar FC-REALIGN (Hito 5)**: extensión IA funcionando 100% vía ExtensionHost.
4. **Documentar estado real de Hitos 0-4** (marcar ✅ solo con evidencia actualizada).
5. **Publicar plan en `docs/ESTADO_PROYECTO.md`** tras verificación y aprobación del usuario.

---

## 5. Referencias
- `1. EXECUTION_PLAN.md`
- `docs/UI_PROTOCOL_STRICT.md`
- `docs/PLAN_TEMPLATE_MANAGER.md`
- `PROTOCOL_PROGRAMACION.md`
- `3. CREACION DE HITOS.md` (solo metodología)
