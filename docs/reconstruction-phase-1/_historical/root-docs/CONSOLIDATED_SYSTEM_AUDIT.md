# AUDITORÍA CONSOLIDADA DEL SISTEMA FLUXCORE

**Fecha:** 2024-12-09  
**Estado:** ANÁLISIS COMPLETO

---

## MODELO DE DATOS FUNDAMENTAL

### Principio Arquitectónico
```
┌─────────────────────────────────────────────────────────────────┐
│  USUARIOS (users) = Solo para autenticación                     │
│                                                                 │
│  CUENTAS (accounts) = Identidad en el sistema                   │
│       ↓                                                         │
│  RELACIONES (relationships) = Entre CUENTAS (no usuarios)       │
│       ↓                                                         │
│  CONVERSACIONES (conversations) = Entre CUENTAS vía relación    │
│       ↓                                                         │
│  MENSAJES (messages) = Dentro de conversación                   │
└─────────────────────────────────────────────────────────────────┘
```

**Clarificación:**
- `users` → Solo login/autenticación
- `accounts` → Identidad (personal o business)
- `relationships` → Entre `accounts`, NO entre `users`
- `conversations` → Pertenecen a una `relationship`
- Los usuarios pueden tener múltiples cuentas vía `actors`

---

## PARTE 1: ESTADO REAL DE POSTGRESQL (17 TABLAS)

### ✅ Tablas Confirmadas en DB

| # | Tabla | Registros | Estado |
|---|-------|-----------|--------|
| 1 | `users` | - | ✅ OK |
| 2 | `accounts` | - | ✅ OK |
| 3 | `actors` | - | ✅ OK |
| 4 | `relationships` | - | ✅ OK |
| 5 | `conversations` | - | ✅ OK |
| 6 | `messages` | - | ✅ OK |
| 7 | `message_enrichments` | - | ✅ OK |
| 8 | `automation_rules` | - | ✅ OK |
| 9 | `extension_installations` | - | ✅ OK |
| 10 | `extension_contexts` | - | ✅ OK |
| 11 | `extensions` | - | ⚠️ migrate-all (legacy) |
| 12 | `workspaces` | - | ✅ OK |
| 13 | `workspace_members` | - | ✅ OK |
| 14 | `workspace_invitations` | - | ✅ OK |
| 15 | `appointments` | - | ✅ OK |
| 16 | `appointment_services` | - | ✅ OK |
| 17 | `appointment_staff` | - | ✅ OK |

### Campos Verificados (migraciones manuales aplicadas)

| Campo | Tabla | Estado |
|-------|-------|--------|
| `owner_user_id` | accounts | ✅ EXISTE (Drizzle) |
| `profile` | accounts | ✅ EXISTE |
| `alias` | accounts | ✅ EXISTE (migration-009) |
| `perspective_a/b` | relationships | ✅ EXISTEN |
| `actor_type` | actors | ✅ EXISTE (migration-008) |
| `extension_id` | actors | ✅ EXISTE (migration-008) |
| `status` | messages | ✅ EXISTE (migration-007) |
| `from_actor_id` | messages | ✅ EXISTE (migration-008) |
| `to_actor_id` | messages | ✅ EXISTE (migration-008) |
| `generated_by` | messages | ✅ EXISTE |

---

## PARTE 2: INDEXEDDB (4 TABLAS) - OFFLINE-FIRST

### Tablas IndexedDB

| Tabla | Propósito | Sincroniza con |
|-------|-----------|----------------|
| `messages` | Mensajes locales | `messages` (PostgreSQL) |
| `conversations` | Conversaciones locales | `conversations` (PostgreSQL) |
| `relationships` | Relaciones locales | `relationships` (PostgreSQL) |
| `syncQueue` | Cola de sincronización | N/A (solo local) |

### Campos EXCLUSIVOS de IndexedDB (NO en PostgreSQL)

Estos campos son **INTENCIONALES** para el sistema offline-first:

| Campo | Tabla IDB | Propósito |
|-------|-----------|-----------|
| `syncState` | messages, conversations, relationships | Estado de sync: local_only, pending_backend, synced, conflict |
| `pendingOperation` | messages, conversations, relationships | Operación pendiente: create, update, delete |
| `localCreatedAt` | messages, conversations, relationships | Timestamp de creación local |
| `serverCreatedAt` | messages, conversations, relationships | Timestamp del servidor (después de sync) |
| `contextSummary` | relationships | Resumen de contexto (local) |

**NOTA:** Estos campos NO deben existir en PostgreSQL. Son para gestión local del estado offline.

---

## PARTE 3: ANÁLISIS FRONTEND → BACKEND

### Servicios Frontend y Endpoints que Usan

| Servicio Frontend | Endpoint Backend | Tabla PostgreSQL | Estado |
|-------------------|------------------|------------------|--------|
| `api.register()` | POST /auth/register | users, accounts, actors | ✅ |
| `api.login()` | POST /auth/login | users | ✅ |
| `api.getAccounts()` | GET /accounts | accounts | ✅ |
| `api.createAccount()` | POST /accounts | accounts, actors | ✅ |
| `api.updateAccount()` | PATCH /accounts/:id | accounts | ✅ |
| `api.searchAccounts()` | GET /accounts/search | accounts | ✅ |
| `api.convertToBusiness()` | POST /accounts/:id/convert-to-business | accounts | ✅ |
| `api.getRelationships()` | GET /relationships | relationships | ✅ |
| `api.createRelationship()` | POST /relationships | relationships | ✅ |
| `api.getConversations()` | GET /conversations | conversations | ✅ |
| `api.createConversation()` | POST /conversations | conversations | ✅ |
| `api.getConversationMessages()` | GET /conversations/:id/messages | messages | ✅ |
| `api.sendMessage()` | POST /messages | messages | ✅ |
| `workspacesApi.getAll()` | GET /workspaces | workspaces, workspace_members | ✅ |
| `workspacesApi.create()` | POST /workspaces | workspaces, workspace_members | ✅ |
| `workspacesApi.getMembers()` | GET /workspaces/:id/members | workspace_members | ✅ |
| `workspacesApi.getInvitations()` | GET /workspaces/:id/invitations | workspace_invitations | ✅ |

### ✅ Resultado: Frontend NO consulta tablas inexistentes

Todas las llamadas del frontend mapean a:
- Endpoints que existen en el backend
- Tablas que existen en PostgreSQL

---

## PARTE 4: DISCREPANCIAS IDENTIFICADAS

### 4.1 Schema Drizzle vs DB Real

Los schemas de Drizzle en `packages/db/src/schema/` NO reflejan todos los campos:

| Archivo Schema | Campo Faltante | Origen |
|----------------|----------------|--------|
| `messages.ts` | `status` | migration-007 |
| `messages.ts` | `from_actor_id` | migration-008 |
| `messages.ts` | `to_actor_id` | migration-008 |
| `actors.ts` | `actor_type` | migration-008 |
| `actors.ts` | `extension_id` | migration-008 |
| `actors.ts` | `display_name` | migration-008 |
| `accounts.ts` | `alias` | migration-009 |

### 4.2 IndexedDB vs PostgreSQL (INTENCIONAL)

| Campo IndexedDB | ¿En PostgreSQL? | Razón |
|-----------------|-----------------|-------|
| `syncState` | ❌ NO | Solo local para offline-first |
| `pendingOperation` | ❌ NO | Solo local para offline-first |
| `localCreatedAt` | ❌ NO | Solo local para offline-first |
| `serverCreatedAt` | ❌ NO | Solo local para offline-first |

**ESTO ES CORRECTO.** IndexedDB tiene campos adicionales para gestionar sincronización local.

### 4.3 Endpoints sin Implementación Completa

| Endpoint | Problema |
|----------|----------|
| `PATCH /automation/rules/:ruleId` | Devuelve 501 Not Implemented |
| `GET /workspaces/invitations/pending` | No implementado en backend |

---

## PARTE 5: HITOS DE RESOLUCIÓN

### HITO 16: Reconciliación de Schemas (Prioridad ALTA)

**Objetivo:** Sincronizar schemas Drizzle con estado real de DB

**Tareas:**

| ID | Tarea | Archivo | Estimación |
|----|-------|---------|------------|
| FC-500 | Añadir `status` a schema messages | `packages/db/src/schema/messages.ts` | 30min |
| FC-501 | Añadir `from_actor_id`, `to_actor_id` a messages | `packages/db/src/schema/messages.ts` | 30min |
| FC-502 | Añadir `actor_type`, `extension_id`, `display_name` a actors | `packages/db/src/schema/actors.ts` | 30min |
| FC-503 | Hacer `user_id`, `account_id`, `role` nullable en actors | `packages/db/src/schema/actors.ts` | 30min |
| FC-504 | Añadir `alias` a accounts | `packages/db/src/schema/accounts.ts` | 15min |
| FC-505 | Regenerar tipos TypeScript | `bun run db:generate` | 15min |
| FC-506 | Verificar que código compila | Tests | 30min |

**Duración estimada:** 3 horas

---

### HITO 17: Limpieza de Migraciones (Prioridad MEDIA)

**Objetivo:** Unificar sistema de migraciones

**Tareas:**

| ID | Tarea | Descripción | Estimación |
|----|-------|-------------|------------|
| FC-510 | Deprecar `migrate-all.ts` | Marcar como legacy, no usar | 15min |
| FC-511 | Crear migración Drizzle para appointments | Tablas appointment_* | 1h |
| FC-512 | Documentar estado de migraciones | Actualizar README de packages/db | 30min |
| FC-513 | Crear script de verificación de DB | Expandir audit-database.ts | 1h |

**Duración estimada:** 3 horas

---

### HITO 18: Sincronización IndexedDB ↔ PostgreSQL (Prioridad ALTA)

**Objetivo:** Implementar sync bidireccional completa

**Tareas:**

| ID | Tarea | Descripción | Estimación |
|----|-------|-------------|------------|
| FC-520 | Revisar syncManager.ts | Verificar lógica de sincronización | 2h |
| FC-521 | Implementar conflict resolution | Backend prevalece (Dual Source of Truth) | 3h |
| FC-522 | Añadir retry logic a syncQueue | Reintentos con backoff | 2h |
| FC-523 | Implementar sync de relationships | Actualmente solo messages? | 2h |
| FC-524 | Tests E2E de sincronización | Offline → Online scenarios | 3h |

**Duración estimada:** 12 horas

---

### HITO 19: Completar Endpoints Faltantes (Prioridad BAJA)

**Objetivo:** Implementar endpoints con 501

**Tareas:**

| ID | Tarea | Endpoint | Estimación |
|----|-------|----------|------------|
| FC-530 | Implementar PATCH /automation/rules/:ruleId | Update directo de regla | 2h |
| FC-531 | Implementar GET pending invitations for user | Por email del usuario | 2h |

**Duración estimada:** 4 horas

---

## PARTE 6: MATRIZ DE CONSISTENCIA

### PostgreSQL ↔ Drizzle Schema

| Tabla | DB Real | Schema Drizzle | Consistente |
|-------|---------|----------------|-------------|
| users | ✅ | ✅ | ✅ 100% |
| accounts | ✅ + alias | ❌ sin alias | ⚠️ 90% |
| actors | ✅ + actor_type... | ❌ sin campos 008 | ⚠️ 70% |
| relationships | ✅ | ✅ | ✅ 100% |
| conversations | ✅ | ✅ | ✅ 100% |
| messages | ✅ + status, actors | ❌ sin campos 007/008 | ⚠️ 80% |
| automation_rules | ✅ | ✅ | ✅ 100% |
| extension_installations | ✅ | ✅ | ✅ 100% |
| extension_contexts | ✅ | ✅ | ✅ 100% |
| workspaces | ✅ | ✅ | ✅ 100% |
| workspace_members | ✅ | ✅ | ✅ 100% |
| workspace_invitations | ✅ | ✅ | ✅ 100% |
| appointments | ✅ | ❌ NO EXISTE | ❌ 0% |
| appointment_services | ✅ | ❌ NO EXISTE | ❌ 0% |
| appointment_staff | ✅ | ❌ NO EXISTE | ❌ 0% |
| extensions | ✅ (legacy) | ❌ NO EXISTE | ❌ 0% |

### IndexedDB ↔ PostgreSQL

| Tabla IDB | Tabla PG | Campos Sync | Campos Solo Local |
|-----------|----------|-------------|-------------------|
| messages | messages | id, conversationId, senderAccountId, content, type, generatedBy, createdAt | syncState, pendingOperation, localCreatedAt |
| conversations | conversations | id, relationshipId, channel, status, lastMessageAt | syncState, pendingOperation, localCreatedAt |
| relationships | relationships | id, accountAId, accountBId | syncState, pendingOperation, contextSummary |
| syncQueue | N/A | N/A | TODO (solo local) |

### Frontend Types ↔ Backend Response

| Type Frontend | Endpoint | Match |
|---------------|----------|-------|
| `User` | /auth/* | ✅ |
| `Account` | /accounts/* | ✅ |
| `Relationship` | /relationships/* | ✅ |
| `Conversation` | /conversations/* | ✅ |
| `Message` | /messages/* | ✅ |
| `Workspace` | /workspaces/* | ✅ |

---

## RESUMEN EJECUTIVO

| Métrica | Valor | Estado |
|---------|-------|--------|
| Tablas PostgreSQL | 17 | ✅ |
| Tablas IndexedDB | 4 | ✅ |
| Endpoints API | 70+ | ✅ |
| Consistencia Schema Drizzle | 75% | ⚠️ |
| Frontend → Backend | 100% | ✅ |
| Hitos pendientes | 4 | 📋 |
| Tiempo estimado total | ~22 horas | |

### Acciones Inmediatas

1. **URGENTE:** Ejecutar HITO 16 (Reconciliación Schemas) - 3h
2. **IMPORTANTE:** Ejecutar HITO 18 (Sync IDB↔PG) - 12h
3. **PUEDE ESPERAR:** HITO 17 y 19

---

**FIN DEL DOCUMENTO CONSOLIDADO**
