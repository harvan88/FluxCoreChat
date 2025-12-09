# Plan Técnico de Ejecución para FluxCore

> **Documento de Implementación derivado del TOTEM**  
> Fecha: 2024-12-06  
> Este documento traduce la visión en tareas ejecutables.

---

## Backlog Estructurado por Hitos

### Hito 0: Bootstrap del Monorepo

**Duración:** 2-3 días

| ID | Descripción | Prioridad | Componentes |
|----|-------------|-----------|-------------|
| FC-001 | Inicializar monorepo con Bun workspaces | Alta | Infra |
| FC-002 | Configurar Turbo para build orchestration | Alta | Infra |
| FC-003 | Crear package `@fluxcore/types` | Alta | Shared |
| FC-004 | Crear package `@fluxcore/db` con Drizzle | Alta | Backend |
| FC-005 | Setup ESLint + Prettier compartido | Media | Infra |
| FC-006 | Crear app `api` con Elysia básico | Alta | Backend |
| FC-007 | Crear app `web` con Vite + React | Alta | Frontend |
| FC-008 | Configurar variables de entorno | Media | Infra |

---

### Hito 1: Fundamentos de Identidad

**Duración:** 2 semanas

**Puntos clave:**
- `ai_settings` se configura vía extensión `@fluxcore/core-ai`
- `private_context` es accesible para extensiones con permiso

| ID | Descripción | Prioridad | Dependencias | Notas |
|----|-------------|-----------|--------------|-------|
| FC-010 | Schema SQL: `users` | Alta | FC-004 | - |
| FC-011 | Schema SQL: `accounts` (sin ai_settings) | Alta | FC-010 | ai_settings va en extensión |
| FC-012 | Schema SQL: `actors` | Alta | FC-010 | - |
| FC-013-030 | Auth endpoints + Frontend | Alta | - | - |

**Schema `accounts`:**
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES users(id),
  username VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(20) NOT NULL,
  profile JSONB DEFAULT '{}'::jsonb,
  private_context TEXT CHECK (length(private_context) <= 5000),
  -- SIN ai_settings (va en extension_installations)
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

---

### Hito 2: Chat Core

**Duración:** 2 semanas

**Puntos clave:**
- Contexto relacional unificado con autoría
- MessageCore delega a extensiones (sin IA embebida)

| ID | Descripción | Prioridad | Dependencias | Notas |
|----|-------------|-----------|--------------|-------|
| FC-040 | Schema SQL: `relationships` con contexto unificado | Alta | FC-011 | Contexto estructurado con autoría |
| FC-041 | Schema SQL: `conversations` | Alta | FC-040 | - |
| FC-042 | Schema SQL: `messages` | Alta | FC-041 | - |
| FC-043 | Schema SQL: `message_enrichments` | Media | FC-042 | - |
| FC-050 | MessageCore service (delega a extensiones) | Alta | FC-049 | Sin IA embebida |
| FC-044-066 | Endpoints + WebSocket + Frontend | Alta | - | - |

**Schema `relationships`:**
```sql
CREATE TABLE relationships (
  id UUID PRIMARY KEY,
  account_a_id UUID NOT NULL REFERENCES accounts(id),
  account_b_id UUID NOT NULL REFERENCES accounts(id),
  
  -- Perspectivas bilaterales (sin contexto)
  perspective_a JSONB DEFAULT '{"saved_name": null, "tags": [], "status": "active"}'::jsonb,
  perspective_b JSONB DEFAULT '{"saved_name": null, "tags": [], "status": "active"}'::jsonb,
  
  -- Contexto UNIFICADO con autoría
  context JSONB DEFAULT '{"entries": [], "total_chars": 0}'::jsonb,
  
  created_at TIMESTAMP DEFAULT now(),
  last_interaction TIMESTAMP,
  UNIQUE(account_a_id, account_b_id)
);
```

**MessageCore:**
```typescript
class MessageCore {
  constructor(
    private persistence: IPersistenceService,
    private notifications: INotificationService,
    private extensionHost: IExtensionHost
    // SIN integratedAI
  ) {}

  async receive(envelope: MessageEnvelope): Promise<ReceiveResult> {
    await this.persistence.save(envelope);
    await this.notifications.broadcast(envelope);
    
    if (envelope.type === 'incoming') {
      // Delegar TODO a extensiones (incluyendo @fluxcore/core-ai)
      await this.extensionHost.processMessage(envelope);
    }
    
    return { success: true, messageId: envelope.id };
  }
}
```

---

### Hito 3: Workspace UI

**Duración:** 2 semanas

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| FC-080-097 | Panel Stack Manager, ActivityBar, Sidebar, ViewPort, etc. | Alta |

---

### Hito 4: Sistema de Extensiones

**Duración:** 2 semanas

**Puntos clave:**
- Tabla `extension_contexts` para Context Overlays
- Permisos de contexto granulares
- Debe completarse antes de implementar @fluxcore/core-ai

| ID | Descripción | Prioridad | Dependencias | Notas |
|----|-------------|-----------|--------------|-------|
| FC-150 | Schema SQL: `extension_installations` | Alta | FC-011 | - |
| FC-151 | Schema SQL: `extension_contexts` | Alta | FC-150 | Context Overlays |
| FC-152 | Interface IExtension | Alta | FC-003 | - |
| FC-153 | Interface IExtensionManifest con permisos | Alta | FC-152 | Incluye permisos de contexto |
| FC-154 | ExtensionHost service | Alta | FC-153 | - |
| FC-155 | ManifestLoader | Alta | FC-154 | - |
| FC-156 | PermissionValidator | Alta | FC-154 | Valida permisos de contexto |
| FC-157 | ContextAccessService | Alta | FC-156 | Acceso controlado a contextos |
| FC-158-166 | Endpoints + Frontend | Alta | - | - |

**Nueva tabla `extension_contexts`:**
```sql
CREATE TABLE extension_contexts (
  id UUID PRIMARY KEY,
  extension_id VARCHAR(100) NOT NULL,
  
  -- Solo UNA de estas FK puede estar activa
  account_id UUID REFERENCES accounts(id),
  relationship_id UUID REFERENCES relationships(id),
  conversation_id UUID REFERENCES conversations(id),
  
  context_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  CHECK (
    (account_id IS NOT NULL)::int +
    (relationship_id IS NOT NULL)::int +
    (conversation_id IS NOT NULL)::int = 1
  )
);
```

**Permisos de contexto:**
```typescript
type ContextPermission =
  | 'read:context.public'
  | 'read:context.private'
  | 'read:context.relationship'
  | 'read:context.history'
  | 'read:context.overlay'
  | 'write:context.overlay';
```

---

### Hito 5: @fluxcore/core-ai

**Objetivo:** Extensión de IA por defecto, preinstalada y habilitada.

**Duración:** 1.5 semanas

**Dependencias:** Hito 4 (Sistema de Extensiones) DEBE estar completo.

| ID | Descripción | Prioridad | Dependencias | Notas |
|----|-------------|-----------|--------------|-------|
| **FC-170** | Crear extensión `@fluxcore/core-ai` | Alta | FC-154 | Nueva extensión en `extensions/core-ai/` |
| **FC-171** | Definir manifest.json de core-ai | Alta | FC-170 | Permisos: `read:context.*`, `send:messages`, etc. |
| **FC-172** | Implementar PromptBuilder | Alta | FC-170 | Combina profile + private + relationship + history |
| **FC-173** | Integrar Groq SDK | Alta | FC-172 | API key en config de extensión |
| **FC-174** | Implementar modos suggest/auto/off | Alta | FC-173 | Configurable vía `extension_installations.config` |
| **FC-175** | Implementar cola de respuestas con delay | Media | FC-174 | response_delay configurable |
| **FC-176** | Pre-instalar core-ai en nuevas cuentas | Alta | FC-171 | Hook en creación de account |
| **FC-177** | Evento WS: `ai:suggestion` | Alta | FC-174 | Envía sugerencia al frontend |
| **FC-178** | Crear componente AISuggestionCard | Alta | FC-177 | Aprobar/Editar/Descartar |
| **FC-179** | Panel de configuración de @fluxcore/core-ai | Media | FC-165 | En settings de extensión |

**Manifest de @fluxcore/core-ai:**
```json
{
  "id": "@fluxcore/core-ai",
  "name": "FluxCore AI",
  "version": "1.0.0",
  "description": "IA contextual por defecto",
  "author": "FluxCore",
  "preinstalled": true,
  "permissions": [
    "read:context.public",
    "read:context.private",
    "read:context.relationship",
    "read:context.history",
    "write:context.overlay",
    "send:messages",
    "modify:automation"
  ],
  "config_schema": {
    "enabled": { "type": "boolean", "default": true },
    "mode": { "type": "string", "enum": ["suggest", "auto", "off"], "default": "suggest" },
    "response_delay": { "type": "number", "default": 30 }
  }
}
```

---

### Hito 6: Contexto Relacional

**Duración:** 1 semana

**Puntos clave:**
- Contexto unificado con autoría por entrada
- Límite 2000 chars total
- Tipos de entrada: note, preference, rule

| ID | Descripción | Prioridad | Dependencias |
|----|-------------|-----------|--------------|
| FC-130 | Extender PromptBuilder con relationship context | Alta | FC-172 |
| FC-131 | Validar límite 2000 chars total | Alta | FC-040 |
| FC-132 | Componente ContactDetailPanel | Alta | FC-060 |
| FC-133 | Componente RelationshipContextEditor (estructurado) | Alta | FC-132 |
| FC-134 | Componente TagsEditor | Media | FC-132 |
| FC-135 | Guardado optimista de context | Media | FC-133 |
| FC-136 | Selector de tipo de entrada (note/preference/rule) | Media | FC-133 |

**UI de contexto estructurado:**
```typescript
interface ContextEntry {
  author_account_id: string;
  content: string;
  type: 'note' | 'preference' | 'rule';
  created_at: string;
}

// En UI: lista de entries con chips por tipo
// [preference] "Prefiere pan integral"
// [rule] "Si cancela, ofrecer 10% descuento"
// [note] "Cliente VIP desde 2020"
```

---

### Hito 7: Extensión de Turnos

**Duración:** 2 semanas

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| FC-180-191 | Extensión appointments con tools | Alta |

**Nota:** Las tools se registran para extensiones IA premium (no para @fluxcore/core-ai).

---

### Hito 8: Adaptadores (WhatsApp)

**Duración:** 2 semanas

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| FC-200-210 | WhatsApp adapter | Alta |

---

### Hito 9: Workspaces Colaborativos

**Duración:** 1.5 semanas

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| FC-220-229 | Workspaces, members, roles | Alta |

---

### Hito 10: Producción Ready

**Duración:** 2 semanas

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| FC-240-255 | CI/CD, tests, docs, deploy | Alta |

---

### Hito 11: Madurez Operativa de Extensiones (NUEVO)

**Objetivo:** Sistema de extensiones robusto con ejecución paralela, persistencia real y broadcast.

**Duración:** 1 semana

**Aprendizaje de:** Auditoría de código INHOST (ver `AUDIT_LEARNING_REPORT.md`)

| ID | Descripción | Prioridad | Dependencias | Notas |
|----|-------------|-----------|--------------|-------|
| FC-300 | Ejecución paralela de extensiones con timeout | Alta | Hito 4 | Promise.allSettled + timeout por extensión |
| FC-301 | Persistencia real de enrichments | Alta | FC-300 | Usar tabla message_enrichments existente |
| FC-302 | Broadcast de enrichments vía WebSocket | Alta | FC-301 | Nuevo evento `enrichment:batch` |
| FC-303 | Health checks de extensiones | Media | FC-300 | Endpoint `/admin/extensions/health` |
| FC-304 | Estadísticas de ExtensionHost | Media | FC-300 | Endpoint `/admin/extensions/stats` |
| FC-305 | Logger service centralizado | Media | - | Reemplazar console.log |

**Implementación FC-300 (Ejecución Paralela):**
```typescript
// Antes: Secuencial
for (const extension of extensions) {
  await extension.process(context);
}

// Después: Paralelo con timeout y aislamiento
const results = await Promise.allSettled(
  extensions.map(ext => this.executeWithTimeout(ext, context))
);
```

**Implementación FC-302 (WebSocket Event):**
```typescript
// Nuevo evento WebSocket
{
  type: 'enrichment:batch',
  data: {
    conversationId: string;
    messageId: string;
    enrichments: Array<{
      id: string;
      extensionId: string;
      type: string;
      payload: any;
      confidence: number;
    }>;
    processingTimeMs: number;
  }
}
```

---

### Hito 12: Frontend de Enrichments (NUEVO)

**Objetivo:** Frontend muestra enrichments en tiempo real.

**Duración:** 0.5 semana

| ID | Descripción | Prioridad | Dependencias | Notas |
|----|-------------|-----------|--------------|-------|
| FC-306 | Store de enrichments en Zustand | Media | FC-302 | Map<messageId, Enrichment[]> |
| FC-307 | Enrichments en IndexedDB | Baja | FC-306 | Dexie schema v2 |
| FC-308 | Handler WebSocket enrichment:batch | Media | FC-302 | - |
| FC-309 | Componente EnrichmentBadge | Media | FC-306 | UI para mostrar enrichments |

---

### Hito 13: Component Library & UI Unification (NUEVO)

**Objetivo:** Establecer sistema de componentes predefinidos y eliminar HTML arbitrario.

**Duración:** 3 semanas

**Aprendizaje de:** Auditoría de UI (ver `docs/UI_AUDIT_REPORT.md`)

| ID | Descripción | Prioridad | Dependencias | Notas |
|----|-------------|-----------|--------------|-------|
| **FC-400** | Migrar ExtensionsPanel al sistema canónico | Alta | Hito 3 | Eliminar colores hardcodeados |
| **FC-401** | Prevenir duplicación de tabs de chat | Alta | Hito 3 | Verificar tab existente antes de crear |
| **FC-402** | Corregir flujo de navegación de Settings | Alta | Hito 3 | ActivityBar → Sidebar → Container |
| **FC-403** | Hacer tab de Settings closable | Alta | FC-402 | Cambiar closable: false → true |
| **FC-404** | Crear Button component | Alta | - | Variantes: primary, secondary, ghost, danger |
| **FC-405** | Crear Input component | Alta | - | Variantes: text, search, email, password |
| **FC-406** | Crear Card component | Alta | - | Con Header, Body, Footer |
| **FC-407** | Crear Badge component | Alta | - | Variantes: info, success, warning, error |
| **FC-408** | Crear Table component | Media | - | Con sorting y paginación |
| **FC-409** | Crear Select component | Media | - | Dropdown estándar |
| **FC-410** | Crear Checkbox component | Media | - | Checkbox y radio |
| **FC-411** | Crear Avatar component | Media | - | Con fallback a iniciales |
| **FC-412** | Crear SidebarLayout unificado | Media | FC-404-411 | Estructura estándar para sidebars |
| **FC-413** | Eliminar botón X de Sidebar | Media | FC-412 | Implementar lógica de pin |
| **FC-414** | Refactorizar tabs para usar componentes | Media | FC-404-411 | Eliminar HTML arbitrario |
| **FC-415** | Hacer ActivityBar header responsive | Baja | - | Logo adaptable al colapso |
| **FC-416** | Documentar Component Library | Alta | FC-404-411 | Guía para extensiones |
| **FC-417** | Crear guía de diseño para extensiones | Alta | FC-416 | Ejemplos visuales y reglas |

**Implementación FC-404 (Button):**
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

// Variantes con clases canónicas
const variants = {
  primary: 'bg-accent text-inverse hover:bg-accent-hover',
  secondary: 'bg-elevated text-primary border border-default hover:bg-hover',
  ghost: 'bg-transparent text-secondary hover:text-primary hover:bg-hover',
  danger: 'bg-error text-inverse hover:bg-error-hover'
};
```

**Implementación FC-412 (SidebarLayout):**
```tsx
interface SidebarLayoutProps {
  header: React.ReactNode;
  search?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  content: React.ReactNode;
  footer?: React.ReactNode;
}

// Estructura estándar para todos los sidebars
<div className="flex flex-col h-full bg-surface">
  <div className="px-4 py-3 border-b border-subtle">{header}</div>
  {search && <div className="px-4 py-3">{search}</div>}
  {actions && <div className="px-4 pb-3">{actions}</div>}
  {tabs && <div className="px-4 pb-3">{tabs}</div>}
  <div className="flex-1 overflow-y-auto">{content}</div>
  {footer && <div className="px-4 py-3 border-t border-subtle">{footer}</div>}
</div>
```

---

## Hito 14: Testing E2E & Production Hardening (Semana 23)

**Objetivo:** Garantizar calidad de producción con tests automatizados end-to-end.

**Duración estimada:** 1 semana

### Tareas

| ID | Tarea | Prioridad | Dependencia | Descripción |
|----|-------|-----------|-------------|-------------|
| **FC-500** | Configurar Playwright | Alta | - | Setup inicial para tests E2E |
| **FC-501** | Test E2E: Autenticación | Alta | FC-500 | Login, Register, Logout |
| **FC-502** | Test E2E: Chat | Alta | FC-501 | Enviar mensajes, ver conversaciones |
| **FC-503** | Test E2E: Settings | Media | FC-501 | Cambio de tema, configuración |
| **FC-504** | Test E2E: Extensions | Media | FC-501 | Listar, instalar, configurar |
| **FC-505** | Integrar E2E en CI/CD | Alta | FC-501-504 | GitHub Actions con Playwright |
| **FC-506** | Documentar deployment | Media | - | Guía completa de producción |

---

## Hito 15: Performance Optimization (Semana 24)

**Objetivo:** Optimizar rendimiento del frontend reduciendo tamaño de bundle y mejorando tiempo de carga.

**Duración estimada:** 0.5 semanas

### Tareas

| ID | Tarea | Prioridad | Descripción |
|----|-------|-----------|-------------|
| **FC-600** | Code Splitting con React.lazy | Alta | Lazy loading de rutas y componentes pesados |
| **FC-601** | Optimizar imports | Alta | Tree shaking de lucide-react y dependencias |
| **FC-602** | Bundle Analysis | Media | Configurar visualizador de bundle |
| **FC-603** | Image Optimization | Baja | Lazy loading de imágenes |
| **FC-604** | Preload críticos | Media | Prefetch de chunks esenciales |

---

## Hito 16: Profile System (CRÍTICO - Prueba Producción)

**Objetivo:** Sistema completo de perfil de usuario para la prueba de producción.

**Duración estimada:** 1 semana

**Referencia:** `docs/AUDIT_PRODUCTION_TEST.md`

### Tareas

| ID | Tarea | Prioridad | Descripción |
|----|-------|-----------|-------------|
| **FC-800** | ProfileSection completa | Alta | Reemplaza "Próximamente" con UI funcional |
| **FC-801** | BioEditor (presentación) | Alta | Campo 0/150 chars con placeholder |
| **FC-802** | AvatarUploader | Alta | Upload de foto de perfil |
| **FC-803** | AIContextEditor básico | Alta | Campo 0/5000 chars |
| **FC-804** | ExpandedEditor (tipo GitHub) | Media | Vista previa/código, contador tokens |
| **FC-805** | TokenCounter | Media | Contador de líneas y tokens aproximados |
| **FC-806** | BusinessToggle | Alta | Toggle "Activar cuenta de negocio" |
| **FC-807** | Hook useProfile | Alta | CRUD de perfil conectado a API |

**Criterios de aceptación:**
- [ ] Usuario puede editar foto de perfil
- [ ] Usuario puede escribir presentación (0/150 chars)
- [ ] Usuario puede editar nombre visible
- [ ] Usuario puede escribir contexto IA (0/5000 chars)
- [ ] Editor expandible funciona en nueva tab
- [ ] Toggle de cuenta de negocio visible

---

## Hito 17: Account Management (CRÍTICO - Prueba Producción)

**Objetivo:** Gestión de cuentas personales y de negocio.

**Duración estimada:** 1 semana

### Tareas

| ID | Tarea | Prioridad | Descripción |
|----|-------|-----------|-------------|
| **FC-810** | AccountStore | Alta | Store Zustand para cuentas |
| **FC-811** | AccountSwitcher | Alta | Selector en header (avatar superior izq) |
| **FC-812** | AccountsSection | Alta | Sección en Settings |
| **FC-813** | ConvertToBusiness | Alta | UI para convertir cuenta a negocio |
| **FC-814** | CreateBusinessAccount | Alta | UI para crear cuenta de negocio |
| **FC-815** | Hook useAccounts | Alta | CRUD de cuentas conectado a API |
| **FC-816** | API client accounts | Alta | `services/accounts.ts` |

**Criterios de aceptación:**
- [ ] Usuario puede ver sus cuentas (personal/negocio)
- [ ] Usuario puede convertir cuenta a negocio
- [ ] Usuario puede crear cuenta de negocio nueva
- [ ] Selector de cuenta visible en header/ActivityBar
- [ ] Cambio de cuenta funciona correctamente

---

## Hito 18: Workspace & Collaborators UI (CRÍTICO - Prueba Producción)

**Objetivo:** Frontend completo para workspaces colaborativos.

**Duración estimada:** 1.5 semanas

### Tareas

| ID | Tarea | Prioridad | Descripción |
|----|-------|-----------|-------------|
| **FC-820** | Hook useWorkspaces | Alta | CRUD de workspaces |
| **FC-821** | WorkspaceStore | Alta | Store Zustand |
| **FC-822** | CollaboratorsList | Alta | Lista de miembros del workspace |
| **FC-823** | UserSearch | Alta | Búsqueda de usuarios por alias |
| **FC-824** | InviteCollaborator | Alta | Modal/form para invitar |
| **FC-825** | PermissionsSelector | Media | Selector de permisos por módulo |
| **FC-826** | Hook useInvitations | Alta | Gestión de invitaciones |
| **FC-827** | InvitationsList | Alta | Lista de invitaciones pendientes |
| **FC-828** | AcceptInvitation | Alta | UI para aceptar invitación |
| **FC-829** | PendingInvitations | Alta | Indicador en header |
| **FC-830** | API client workspaces | Alta | `services/workspaces.ts` |

**Criterios de aceptación:**
- [ ] Usuario puede ver lista de colaboradores
- [ ] Usuario puede buscar usuarios por alias
- [ ] Usuario puede invitar por email
- [ ] Usuario puede asignar permisos específicos
- [ ] Invitado puede ver y aceptar invitación
- [ ] Invitado ve workspace según sus permisos

---

## Hito 19: Welcome Experience (Prueba Producción)

**Objetivo:** Experiencia de bienvenida para nuevos usuarios.

**Duración estimada:** 0.5 semanas

### Tareas

| ID | Tarea | Prioridad | Descripción |
|----|-------|-----------|-------------|
| **FC-840** | WelcomeMessage | Alta | Mensaje inicial de Fluxi |
| **FC-841** | FluxiAvatar | Media | Avatar distintivo de Fluxi |
| **FC-842** | OnboardingConversation | Alta | Crear conversación inicial (backend) |
| **FC-843** | FirstTimeExperience | Media | Detectar primer login |

**Criterios de aceptación:**
- [ ] Usuario nuevo ve mensaje de bienvenida de Fluxi
- [ ] Conversación inicial creada automáticamente
- [ ] Avatar de Fluxi distintivo

---

## Hito 20: PWA Support (Futuro)

**Objetivo:** Convertir FluxCore en Progressive Web App instalable.

**Duración estimada:** 0.5 semanas

### Tareas

| ID | Tarea | Prioridad | Descripción |
|----|-------|-----------|-------------|
| **FC-900** | Configurar vite-plugin-pwa | Alta | Service worker y manifest |
| **FC-901** | Crear manifest.json | Alta | Iconos, colores, nombre |
| **FC-902** | Configurar caching strategy | Alta | Cache-first para assets |
| **FC-903** | Crear offline fallback | Media | Página offline básica |
| **FC-904** | Agregar install prompt | Baja | UI para instalar app |

---

## Cronograma de Ejecución

```
Semana 1:     Hito 0 - Bootstrap
Semana 2-3:   Hito 1 - Identidad
Semana 4-5:   Hito 2 - Chat Core
Semana 6-7:   Hito 3 - Workspace UI
Semana 8-9:   Hito 4 - Sistema de Extensiones
Semana 10:    Hito 5 - @fluxcore/core-ai
Semana 11:    Hito 6 - Contexto Relacional
Semana 12-13: Hito 7 - Extensión Turnos
Semana 14-15: Hito 8 - WhatsApp Adapter
Semana 16:    Hito 9 - Workspaces Backend
Semana 17-18: Hito 10 - Producción Ready
Semana 19:    Hito 11 - Madurez Operativa Extensiones
Semana 19.5:  Hito 12 - Frontend Enrichments
Semana 20-22: Hito 13 - Component Library & UI Unification
Semana 23:    Hito 14 - Testing E2E & Production Hardening
Semana 24:    Hito 15 - Performance Optimization
Semana 25:    Hito 16 - Profile System (CRÍTICO)
Semana 26:    Hito 17 - Account Management (CRÍTICO)
Semana 27-28: Hito 18 - Workspace & Collaborators UI (CRÍTICO)
Semana 28.5:  Hito 19 - Welcome Experience
Semana 29:    🎯 PRUEBA DE PRODUCCIÓN (Carlos, María, Daniel)
Semana 30:    Hito 20 - PWA Support

Total: ~30 semanas
```

---

## Decisiones Arquitectónicas Clave

### IA como Extensión

**Decisión:** La IA NO es parte del núcleo. Es una extensión preinstalada (`@fluxcore/core-ai`).

**Justificación:**
- Núcleo más simple y estable
- IA puede actualizarse independientemente
- Modelo de negocio: core-ai gratis, extensiones IA premium monetizan
- Permite reemplazar/deshabilitar IA completamente

**Impacto:** MessageCore no tiene dependencia a IA, solo delega a extensiones.

### Context Overlays

**Decisión:** Las extensiones tienen su propio espacio de contexto (`extension_contexts`).

**Justificación:**
- Extensiones no modifican datos del núcleo
- Aislamiento entre extensiones
- Permisos granulares de lectura

**Impacto:** Nueva tabla, nuevos permisos.

### Contexto Relacional Unificado

**Decisión:** Un solo `context` JSONB con entries estructurados, no dos campos direccionales.

**Justificación:**
- Evita redundancia con historial de mensajes
- Más flexible: permite tipos (note, preference, rule)
- Mantiene autoría por entrada

**Impacto:** Schema de relationships cambia.

### Component Library como Fuente Única de UI

**Decisión:** Todas las extensiones DEBEN usar componentes predefinidos de la Component Library. HTML arbitrario está prohibido.

**Justificación:**
- Garantiza unicidad visual del sistema
- Facilita mantenimiento y actualizaciones
- Previene inconsistencias de diseño
- Simplifica desarrollo de extensiones de terceros
- Permite evolución del diseño sin romper extensiones

**Impacto:**
- Nuevos componentes en `apps/web/src/components/ui/`
- Manifest de extensiones debe declarar componentes permitidos
- Validación en ExtensionHost de componentes usados
- Documentación exhaustiva para desarrolladores

**Reglas de Enforcement:**
```typescript
// En manifest.json de extensión
{
  "ui": {
    "allowedComponents": ["Button", "Input", "Card", "Badge"],
    "customCSS": false  // Prohibido
  }
}

// ExtensionHost valida que solo use componentes permitidos
```

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Extensión core-ai falla | Media | Alto | Fallback: núcleo funciona sin IA |
| Permisos de contexto complejos | Media | Medio | UI clara de permisos en manifest |
| Crecimiento de overlays | Alta | Medio | Límites por plan, cleanup policies |
| Complejidad de extensiones | Media | Medio | SDK bien documentado, ejemplos |
| **Ejecución paralela causa race conditions** | Baja | Medio | Promise.allSettled aísla fallos, no comparten estado |
| **Persistencia enrichments falla** | Baja | Alto | Transacciones DB, retry logic |
| **WebSocket broadcast sobrecarga** | Baja | Bajo | Throttling si necesario |
| **Component Library limita creatividad de extensiones** | Media | Medio | Componentes flexibles con props, feedback de comunidad |
| **Extensiones existentes rompen con Component Library** | Alta | Alto | Migración gradual, deprecation warnings, guías de migración |
| **Mantenimiento de Component Library complejo** | Media | Medio | Versionado semántico, changelog detallado, tests exhaustivos |

---

## Análisis de Impacto de Nuevos Hitos

### Impacto en Base de Datos

| Issue | Tabla Afectada | Tipo de Cambio |
|-------|---------------|----------------|
| FC-301 | `message_enrichments` | INSERT (ya existe) |
| FC-307 | IndexedDB `enrichments` | Nueva tabla (Dexie v2) |

**No requiere migraciones PostgreSQL** - la tabla `message_enrichments` ya existe.

### Impacto en APIs

| Issue | Endpoint | Tipo |
|-------|----------|------|
| FC-302 | WebSocket `enrichment:batch` | Evento nuevo |
| FC-303 | `GET /admin/extensions/health` | Endpoint nuevo |
| FC-304 | `GET /admin/extensions/stats` | Endpoint nuevo |

**Todos son adiciones**, no modificaciones de APIs existentes.

### Impacto en Frontend

| Issue | Componente/Store | Tipo |
|-------|------------------|------|
| FC-306 | `enrichmentsStore.ts` | Store nuevo |
| FC-308 | WebSocket handler | Handler nuevo |
| FC-309 | `EnrichmentBadge.tsx` | Componente nuevo |

**Sin breaking changes** en componentes existentes

### Impacto del Hito 13 (Component Library)

#### Base de Datos
**Ninguno** - Todos los cambios son de UI/Frontend

#### APIs
**Ninguno** - No se modifican endpoints

#### Stores
| Store | Cambio | Tipo |
|-------|--------|------|
| `panelStore.ts` | Agregar `findTabByContext()` | Método nuevo |
| `uiStore.ts` | Modificar lógica de pin en `setActiveActivity()` | Modificación |

#### Componentes
| Componente | Tipo de Cambio | Breaking |
|------------|----------------|----------|
| ExtensionsPanel | Refactor colores | No |
| ExtensionCard | Refactor colores | No |
| ExtensionConfigPanel | Refactor colores | No |
| ViewPort | Lógica de tabs | No |
| Sidebar | Eliminar botón X | Sí (menor) |
| ActivityBar | Lógica de pin | No |
| ConversationsList | Usar SidebarLayout | Sí (refactor) |
| ContactsList | Usar SidebarLayout | Sí (refactor) |
| SettingsPanel | Usar SidebarLayout | Sí (refactor) |
| DynamicContainer | Usar componentes predefinidos | Sí (refactor) |

#### Nuevos Componentes
- `apps/web/src/components/ui/Button.tsx`
- `apps/web/src/components/ui/Input.tsx`
- `apps/web/src/components/ui/Card.tsx`
- `apps/web/src/components/ui/Badge.tsx`
- `apps/web/src/components/ui/Table.tsx`
- `apps/web/src/components/ui/Select.tsx`
- `apps/web/src/components/ui/Checkbox.tsx`
- `apps/web/src/components/ui/Avatar.tsx`
- `apps/web/src/components/layout/SidebarLayout.tsx`
- `apps/web/src/components/layout/SidebarHeader.tsx`
- `apps/web/src/components/layout/SidebarSearch.tsx`
- `apps/web/src/components/layout/SidebarActions.tsx`

#### Documentación
- `docs/COMPONENT_LIBRARY.md` - Guía de componentes
- `docs/EXTENSION_DESIGN_GUIDE.md` - Guía de diseño para extensiones

---

### Hito 24: Emparejamiento Frontend-Backend (COMPLETADO 2024-12-09)

**Duración:** 4 horas
**Estado:** ✅ COMPLETADO

| ID | Descripción | Estado | Archivos |
|----|-------------|--------|----------|
| EMF-001 | Conectar búsqueda contactos a API | ✅ | `api.ts`, `ContactsList.tsx` |
| EMF-002 | Modal agregar contacto funcional | ✅ | `ContactsList.tsx` |
| EMF-003 | Endpoint convert-to-business | ✅ | `accounts.routes.ts`, `account.service.ts` |
| EMF-004 | Frontend usa endpoint real | ✅ | `accounts.ts`, `api.ts` |

**Endpoints Agregados:**
- `GET /accounts/search?q=` - Búsqueda de usuarios
- `POST /accounts/:id/convert-to-business` - Conversión a cuenta de negocio

---

### Hito 25: Arquitectura Settings Canónica (COMPLETADO 2024-12-09)

**Duración:** 2 horas
**Estado:** ✅ COMPLETADO

| ID | Descripción | Estado | Archivos |
|----|-------------|--------|----------|
| SET-001 | SettingsMenu en Sidebar (solo menú) | ✅ | `SettingsMenu.tsx` |
| SET-002 | Settings abre tabs en DynamicContainer | ✅ | `DynamicContainer.tsx` |
| SET-003 | ProfileSection como tab | ✅ | `DynamicContainer.tsx` |
| SET-004 | AccountsSection como tab | ✅ | `DynamicContainer.tsx` |

**Arquitectura Canónica:**
```
ActivityBar → Sidebar (Menú) → DynamicContainer (Contenido)
```

---

### Hito 26: Estabilización Core (COMPLETADO 2024-12-09)

**Duración:** 2 horas
**Estado:** ✅ COMPLETADO

| ID | Descripción | Estado | Archivos Modificados |
|----|-------------|--------|---------------------|
| STB-001 | WebSocket loop infinito | ✅ | `useWebSocket.ts` - Max 5 intentos, backoff exponencial |
| STB-002 | API calls redundantes | ✅ | `useProfile.ts`, `ContactsList.tsx` - hasLoaded flags |
| FIX-001 | Crear account al registrar | ✅ | `auth.service.ts` - Auto-create personal account |
| FIX-002 | Scroll en contenedores | ✅ | `DynamicContainer.tsx` - overflow-auto |

**Causa raíz identificada:** El registro de usuarios NO creaba una cuenta asociada, causando "No se encontraron cuentas".

---

## Checklist Pre-Implementación

- [ ] Revisar TOTEM antes de comenzar cada hito
- [ ] Definir límites por plan (chars de overlay, etc.)
- [ ] Configurar entorno de desarrollo
- [ ] Establecer convenciones de código

---

**Este documento es la guía de ejecución. El TOTEM es la guía de arquitectura.**
