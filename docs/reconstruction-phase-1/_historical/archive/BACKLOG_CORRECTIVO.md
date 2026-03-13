# BACKLOG CORRECTIVO - FluxCore

> **Fecha:** 2025-12-06  
> **Derivado de:** INFORME_AUDITORIA.md  
> **Objetivo:** Corregir desviaciones del TOTEM y completar funcionalidades faltantes

---

## Resumen de Esfuerzo

| Hito | Descripción | Duración Estimada | Prioridad |
|------|-------------|-------------------|-----------|
| C1 | Correcciones Críticas Backend | 1 semana | CRÍTICA |
| C2 | Panel Stack Manager (Frontend) | 2-3 semanas | CRÍTICA |
| C3 | Offline-First (IndexedDB) | 1.5 semanas | ALTA |
| C4 | Actor Model Completo | 1 semana | ALTA |
| C5 | UI de Extensiones | 1 semana | MEDIA |
| **Total** | | **6-7.5 semanas** | |

---

## Hito C1: Correcciones Críticas Backend

**Objetivo:** Corregir desviaciones que rompen principios inmutables del TOTEM  
**Duración estimada:** 1 semana  
**Prioridad:** CRÍTICA

| ID | Descripción | Prioridad | Componente | Criterios de Aceptación | Dependencias |
|----|-------------|-----------|------------|-------------------------|--------------|
| COR-001 | Integrar ExtensionHost con MessageCore | CRÍTICA | Backend | `MessageCore.receive()` llama a `extensionHost.processMessage()` para mensajes incoming | Ninguna |
| COR-002 | Añadir campo `status` a messages | CRÍTICA | Database | Messages tienen status: `local_only`, `pending_backend`, `synced`, `sent`, `delivered`, `seen` | Ninguna |
| COR-003 | Añadir campos `from_actor_id` y `to_actor_id` a messages | CRÍTICA | Database | Trazabilidad completa de origen/destino | COR-004 |
| COR-004 | Completar Actor Model en tabla actors | ALTA | Database | actors tiene `actor_type`: `account`, `user`, `builtin_ai`, `extension` | Ninguna |
| COR-005 | Añadir campo `alias` a accounts | ALTA | Database | Accounts tienen alias único, memorable, no cambiable | Ninguna |
| COR-006 | Implementar validación de límites de contexto | ALTA | Backend | private_context <= 5000 chars, relationship.context <= 2000 chars validados en servicios | Ninguna |
| COR-007 | Integrar automation_controller con MessageCore | MEDIA | Backend | Modos `automatic`, `supervised`, `disabled` afectan flujo de IA | COR-001 |

### Detalle de Tareas

#### COR-001: Integrar ExtensionHost con MessageCore

**Archivo:** `apps/api/src/core/message-core.ts`

```typescript
// Cambio requerido en MessageCore.receive():
async receive(envelope: MessageEnvelope): Promise<ReceiveResult> {
  // ... código existente de persistencia ...
  
  // AÑADIR: Delegar a extensiones para mensajes entrantes
  if (envelope.type === 'incoming') {
    await this.extensionHost.processMessage({
      accountId: recipientAccountId,
      relationshipId: conversation.relationshipId,
      conversationId: envelope.conversationId,
      message: {
        id: message.id,
        content: envelope.content,
        type: envelope.type,
        senderAccountId: envelope.senderAccountId,
      },
    });
  }
  
  return { success: true, messageId: message.id };
}
```

#### COR-002: Añadir status a messages

**Archivo:** `packages/db/src/schema/messages.ts`

```typescript
// Añadir:
status: varchar('status', { length: 20 })
  .default('synced')
  .notNull(), // 'local_only' | 'pending_backend' | 'synced' | 'sent' | 'delivered' | 'seen'
```

**Migración requerida.**

#### COR-003 & COR-004: Actor Model completo

**Archivo:** `packages/db/src/schema/actors.ts`

```typescript
export const actors = pgTable('actors', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorType: varchar('actor_type', { length: 20 }).notNull(), // 'account' | 'user' | 'builtin_ai' | 'extension'
  userId: uuid('user_id').references(() => users.id),
  accountId: uuid('account_id').references(() => accounts.id),
  extensionId: varchar('extension_id', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**Archivo:** `packages/db/src/schema/messages.ts`

```typescript
// Añadir:
fromActorId: uuid('from_actor_id').notNull().references(() => actors.id),
toActorId: uuid('to_actor_id').notNull().references(() => actors.id),
```

---

## Hito C2: Panel Stack Manager (Frontend)

**Objetivo:** Implementar sistema completo de UI según PARTE 11 del TOTEM  
**Duración estimada:** 2-3 semanas  
**Prioridad:** CRÍTICA  
**Dependencias:** Ninguna

| ID | Descripción | Prioridad | Componente | Criterios de Aceptación | Dependencias |
|----|-------------|-----------|------------|-------------------------|--------------|
| COR-010 | Crear store para Panel Stack Manager | CRÍTICA | Frontend | Zustand store con layout state persistido | Ninguna |
| COR-011 | Implementar DynamicContainer component | CRÍTICA | Frontend | Contenedor resizable con header y contenido | COR-010 |
| COR-012 | Implementar sistema de Tabs | CRÍTICA | Frontend | Tabs dentro de containers, reordenables | COR-011 |
| COR-013 | Implementar límite de 3 containers | ALTA | Frontend | Máximo 3 containers visibles, diálogo al exceder | COR-011 |
| COR-014 | Implementar pinned containers | ALTA | Frontend | Containers pueden fijarse (no se cierran automáticamente) | COR-011 |
| COR-015 | Implementar drag & drop de tabs | MEDIA | Frontend | Tabs movibles entre containers | COR-012 |
| COR-016 | Implementar split vertical/horizontal | MEDIA | Frontend | Containers pueden dividirse | COR-011 |
| COR-017 | Persistir layout en localStorage/IndexedDB | ALTA | Frontend | Layout persiste entre sesiones | COR-010, COR-020 |
| COR-018 | Implementar eventos del Panel Stack Manager | MEDIA | Frontend | Events: panel.opened, panel.closed, tab.moved, etc. | COR-010 |
| COR-019 | Implementar comandos del Panel Stack Manager | MEDIA | Frontend | Commands: openTab(), openContainer(), pinContainer(), etc. | COR-010 |

### Estructura de Archivos Propuesta

```
apps/web/src/
├── components/
│   └── layout/
│       ├── ActivityBar.tsx (existente - mejorar)
│       ├── Sidebar.tsx (existente - mejorar)
│       ├── ViewPort.tsx (existente - refactorizar)
│       ├── DynamicContainer.tsx (NUEVO)
│       ├── TabBar.tsx (NUEVO)
│       ├── Tab.tsx (NUEVO)
│       ├── ContainerHeader.tsx (NUEVO)
│       ├── ResizeHandle.tsx (NUEVO)
│       └── MicroContainer.tsx (NUEVO)
├── store/
│   ├── authStore.ts (existente)
│   ├── uiStore.ts (existente - refactorizar)
│   └── layoutStore.ts (NUEVO)
└── hooks/
    └── usePanelStack.ts (NUEVO)
```

### Detalle de COR-010: Layout Store

```typescript
// apps/web/src/store/layoutStore.ts
interface LayoutStore {
  containers: Map<string, DynamicContainer>;
  activeContainerId: string | null;
  maxContainers: number; // default 3
  
  // Actions
  openContainer: (type: ContainerType, options?: OpenOptions) => string;
  closeContainer: (id: string) => void;
  openTab: (containerId: string, context: TabContext) => string;
  closeTab: (containerId: string, tabId: string) => void;
  moveTab: (fromContainerId: string, toContainerId: string, tabId: string) => void;
  pinContainer: (id: string, pinned: boolean) => void;
  resizeContainer: (id: string, width: number, height: number) => void;
  duplicateContainer: (id: string) => string;
  
  // Persistence
  saveLayout: () => void;
  loadLayout: () => void;
}

interface DynamicContainer {
  id: string;
  type: ContainerType;
  tabs: Tab[];
  activeTabId: string | null;
  pinned: boolean;
  width: number;
  height: number;
  position: { x: number; y: number };
}

interface Tab {
  id: string;
  title: string;
  context: any;
  component: string;
}
```

---

## Hito C3: Offline-First (IndexedDB)

**Objetivo:** Implementar Dual Source of Truth según PARTE 9.1 del TOTEM  
**Duración estimada:** 1.5 semanas  
**Prioridad:** ALTA  
**Dependencias:** COR-002 (status en messages)

| ID | Descripción | Prioridad | Componente | Criterios de Aceptación | Dependencias |
|----|-------------|-----------|------------|-------------------------|--------------|
| COR-020 | Configurar IndexedDB con Dexie.js | ALTA | Frontend | Base de datos local configurada | Ninguna |
| COR-021 | Implementar schema local (messages, conversations, relationships) | ALTA | Frontend | Entidades principales en IndexedDB | COR-020 |
| COR-022 | Implementar SyncState en entidades | ALTA | Frontend | Cada entidad tiene: local_only, pending_backend, synced, conflict | COR-021 |
| COR-023 | Implementar cola de sincronización | ALTA | Frontend | Operaciones pendientes se encolan y reintentan | COR-022 |
| COR-024 | Implementar reconciliación de conflictos | MEDIA | Frontend | Backend prevalece en conflictos | COR-023 |
| COR-025 | Implementar optimistic updates | MEDIA | Frontend | UI actualiza inmediatamente, sincroniza después | COR-023 |
| COR-026 | Manejar reconexión automática | MEDIA | Frontend | Sincronización automática al recuperar conexión | COR-023 |

### Estructura de Archivos Propuesta

```
apps/web/src/
├── db/
│   ├── index.ts (configuración Dexie)
│   ├── schema.ts (schema IndexedDB)
│   └── sync/
│       ├── syncManager.ts
│       ├── syncQueue.ts
│       └── conflictResolver.ts
└── hooks/
    ├── useOfflineFirst.ts
    └── useSyncStatus.ts
```

### Detalle de COR-022: SyncState

```typescript
// apps/web/src/db/schema.ts
type SyncState = 'local_only' | 'pending_backend' | 'synced' | 'conflict';

interface LocalMessage {
  id: string;
  conversationId: string;
  content: MessageContent;
  syncState: SyncState;
  localCreatedAt: Date;
  serverCreatedAt?: Date;
  pendingOperation?: 'create' | 'update' | 'delete';
}
```

---

## Hito C4: Actor Model Completo

**Objetivo:** Implementar trazabilidad completa según PARTE 9.2 del TOTEM  
**Duración estimada:** 1 semana  
**Prioridad:** ALTA  
**Dependencias:** COR-003, COR-004

| ID | Descripción | Prioridad | Componente | Criterios de Aceptación | Dependencias |
|----|-------------|-----------|------------|-------------------------|--------------|
| COR-030 | Crear servicio ActorService | ALTA | Backend | Gestión de actores (crear, obtener, mapear) | COR-004 |
| COR-031 | Actualizar MessageService para usar actors | ALTA | Backend | Mensajes se crean con from_actor_id y to_actor_id | COR-030 |
| COR-032 | Crear actor para fluxcore extension | ALTA | Backend | @fluxcore/fluxcore tiene su actor registrado | COR-030 |
| COR-033 | Crear actors para otras extensiones | MEDIA | Backend | Extensiones instaladas crean su actor | COR-030 |
| COR-034 | Actualizar endpoints de mensajes | MEDIA | Backend | GET messages incluye información de actor | COR-031 |
| COR-035 | Migración de datos existentes | ALTA | Database | Mensajes existentes se migran con actors correctos | COR-031 |

---

## Hito C5: UI de Extensiones

**Objetivo:** Completar frontend para gestión de extensiones  
**Duración estimada:** 1 semana  
**Prioridad:** MEDIA  
**Dependencias:** COR-010 (Panel Stack Manager básico)

| ID | Descripción | Prioridad | Componente | Criterios de Aceptación | Dependencias |
|----|-------------|-----------|------------|-------------------------|--------------|
| COR-040 | Crear ExtensionsPanel component | MEDIA | Frontend | Lista extensiones disponibles/instaladas | Ninguna |
| COR-041 | Crear ExtensionCard component | MEDIA | Frontend | Muestra info de extensión con acciones | COR-040 |
| COR-042 | Crear ExtensionConfigPanel | MEDIA | Frontend | Edita configuración de extensión | COR-040 |
| COR-043 | Crear AISuggestionCard component | ALTA | Frontend | Aprobar/Editar/Descartar sugerencias IA | Ninguna |
| COR-044 | Integrar AISuggestionCard en ChatView | ALTA | Frontend | Sugerencias aparecen en la conversación | COR-043 |
| COR-045 | Crear hook useExtensions | MEDIA | Frontend | Gestión de estado de extensiones | COR-040 |

---

## Dependencias entre Hitos

```
C1 (Backend Crítico)
├── COR-001 ─────────────────┐
├── COR-002 ────────┐        │
├── COR-003 ◄── COR-004      │
│                            │
├──────────────────────────► C4 (Actor Model)
│                            │
└── COR-002 ────────────────► C3 (Offline-First)
                              │
                              └──► COR-017 (Persist layout)
                                    │
                                    ▲
C2 (Panel Stack) ───────────────────┘
        │
        └──────────────────────────► C5 (UI Extensiones)
```

---

## Cronograma Sugerido

```
Semana 1:     C1 - Correcciones Críticas Backend
Semana 2-3:   C2 - Panel Stack Manager (inicio)
Semana 4:     C2 - Panel Stack Manager (finalización)
              C3 - Offline-First (inicio)
Semana 5:     C3 - Offline-First (finalización)
              C4 - Actor Model
Semana 6:     C5 - UI de Extensiones
Semana 7:     Buffer / Testing / Refinamiento

Total: 6-7 semanas
```

---

## Criterios de Aceptación Global

### Para declarar el proyecto "Producción Ready":

- [ ] MessageCore delega a ExtensionHost para mensajes entrantes
- [ ] Messages tienen status canónico y from/to_actor_id
- [ ] Panel Stack Manager funcional con tabs, containers y persistencia
- [ ] IndexedDB implementado con sincronización offline-first
- [ ] Actor Model completo con trazabilidad
- [ ] UI de extensiones funcional
- [ ] AISuggestionCard integrado en ChatView
- [ ] Todos los tests existentes siguen pasando
- [ ] Nuevos tests cubren funcionalidades añadidas

---

## Notas de Implementación

### Priorización Recomendada

1. **COR-001** es el más crítico: sin esto, las extensiones no procesan mensajes
2. **C2 (Panel Stack)** es el más grande: considerar implementación incremental
3. **C3 (Offline)** puede postergarse si tiempo es limitado, pero es core del TOTEM
4. **C4 y C5** pueden paralelizarse si hay múltiples desarrolladores

### Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Panel Stack Manager muy complejo | Implementar versión mínima primero (2 containers, tabs básicos) |
| IndexedDB complejo de sincronizar | Usar librería probada (Dexie.js) |
| Migraciones de BD pueden romper datos | Backup obligatorio antes de migrar |
| Tests existentes pueden fallar | Correr tests después de cada tarea |

---

*Backlog generado automáticamente por auditoría técnica.*
