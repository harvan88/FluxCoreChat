# Plan de Commits para FluxCore

> **Repositorio:** https://github.com/harvan88/FluxCoreChat.git  
> **Estrategia:** Commits atómicos por tarea, siguiendo Conventional Commits  
> **Branches:** `main` (producción), `develop` (integración), `feature/*` (desarrollo)

---

## Convenciones de Commits

### Formato
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bugs
- `docs`: Documentación
- `style`: Formato (no afecta código)
- `refactor`: Refactorización
- `test`: Tests
- `chore`: Tareas de mantenimiento
- `build`: Cambios en build system

### Scopes
- `infra`: Infraestructura y configuración
- `types`: Package @fluxcore/types
- `db`: Package @fluxcore/db
- `core`: Package @fluxcore/core
- `api`: App api (backend)
- `web`: App web (frontend)
- `auth`: Autenticación
- `chat`: Sistema de chat
- `extensions`: Sistema de extensiones
- `fluxcore`: Extensión @fluxcore/fluxcore

---

## Hito 0: Bootstrap del Monorepo (2-3 días)

### Branch: `feature/bootstrap-monorepo`

```bash
# FC-001: Inicializar monorepo con Bun workspaces
git commit -m "chore(infra): initialize bun monorepo with workspaces

- Add package.json with workspaces configuration
- Configure bun.lockb
- Add .gitignore for node_modules and build artifacts

Task: FC-001"

# FC-002: Configurar Turbo
git commit -m "chore(infra): setup turbo for build orchestration

- Add turbo.json with pipeline configuration
- Configure build, dev, and lint tasks
- Setup cache configuration

Task: FC-002"

# FC-003: Crear package @fluxcore/types
git commit -m "feat(types): create @fluxcore/types package

- Add base TypeScript types for core entities
- Export User, Account, Relationship types
- Configure tsconfig.json for package

Task: FC-003"

# FC-004: Crear package @fluxcore/db
git commit -m "feat(db): create @fluxcore/db package with drizzle

- Setup Drizzle ORM configuration
- Add database connection utilities
- Configure migrations folder structure

Task: FC-004"

# FC-005: Setup ESLint + Prettier
git commit -m "chore(infra): configure eslint and prettier

- Add shared ESLint config for monorepo
- Configure Prettier with project rules
- Add lint scripts to all packages

Task: FC-005"

# FC-006: Crear app api
git commit -m "feat(api): create api app with elysia

- Initialize Elysia server
- Add basic health check endpoint
- Configure CORS and environment variables

Task: FC-006"

# FC-007: Crear app web
git commit -m "feat(web): create web app with vite and react

- Initialize Vite + React + TypeScript
- Add basic App component
- Configure TailwindCSS for styling

Task: FC-007"

# FC-008: Configurar variables de entorno
git commit -m "chore(infra): setup environment variables

- Add .env.example files for api and web
- Configure dotenv loading
- Document required environment variables

Task: FC-008"

# Merge a develop
git checkout develop
git merge feature/bootstrap-monorepo --no-ff -m "chore: merge bootstrap monorepo (Hito 0)

Completed tasks: FC-001 to FC-008
Duration: 2-3 days"
```

---

## Hito 1: Fundamentos de Identidad (2 semanas)

### Branch: `feature/identity-foundation`

```bash
# FC-010: Schema SQL users
git commit -m "feat(db): add users table schema

- Create users table with Drizzle schema
- Add email, password_hash, name fields
- Configure timestamps and indexes

Task: FC-010"

# FC-011: Schema SQL accounts
git commit -m "feat(db): add accounts table schema

- Create accounts table with owner relationship
- Add username, display_name, account_type
- Add profile JSONB and private_context fields
- Note: ai_settings handled by extension_installations

Task: FC-011"

# FC-012: Schema SQL actors
git commit -m "feat(db): add actors table schema

- Create actors table for multi-user workspaces
- Link actors to users and accounts
- Add role and permissions fields

Task: FC-012"

# FC-013: Auth endpoints - Register
git commit -m "feat(api): implement user registration endpoint

- POST /auth/register endpoint
- Hash passwords with bcrypt
- Validate email uniqueness
- Return user and JWT token

Task: FC-013"

# FC-014: Auth endpoints - Login
git commit -m "feat(api): implement login endpoint

- POST /auth/login endpoint
- Validate credentials
- Return user, accounts list, and JWT token

Task: FC-014"

# FC-015: Auth endpoints - Logout
git commit -m "feat(api): implement logout endpoint

- POST /auth/logout endpoint
- Invalidate JWT token
- Add token blacklist mechanism

Task: FC-015"

# FC-016: Auth middleware
git commit -m "feat(api): add authentication middleware

- Create JWT verification middleware
- Add protected route decorator
- Handle token expiration

Task: FC-016"

# FC-017: Account CRUD endpoints
git commit -m "feat(api): implement account management endpoints

- GET /accounts - list user accounts
- POST /accounts - create new account
- GET /accounts/:id - get account details
- PATCH /accounts/:id - update account

Task: FC-017"

# FC-018-030: Auth Frontend
git commit -m "feat(web): implement authentication UI

- Create Login and Register pages
- Add form validation with react-hook-form
- Implement auth context and hooks
- Add protected routes
- Create account switcher component

Tasks: FC-018 to FC-030"

# Merge a develop
git checkout develop
git merge feature/identity-foundation --no-ff -m "feat: merge identity foundation (Hito 1)

Completed tasks: FC-010 to FC-030
Duration: 2 weeks"
```

---

## Hito 2: Chat Core (2 semanas)

### Branch: `feature/chat-core`

```bash
# FC-040: Schema SQL relationships
git commit -m "feat(db): add relationships table with unified context

- Create relationships table with bilateral perspectives
- Add unified context JSONB with entries array
- Include author tracking per context entry
- Add perspective_a and perspective_b fields

Task: FC-040"

# FC-041: Schema SQL conversations
git commit -m "feat(db): add conversations table

- Create conversations table linked to relationships
- Add channel field (web, whatsapp, telegram)
- Add status and denormalized fields for performance
- Configure indexes

Task: FC-041"

# FC-042: Schema SQL messages
git commit -m "feat(db): add messages table

- Create messages table with conversation reference
- Add content JSONB for flexible message types
- Add AI metadata fields (generated_by, ai_approved_by)
- Configure indexes for performance

Task: FC-042"

# FC-043: Schema SQL message_enrichments
git commit -m "feat(db): add message_enrichments table

- Create enrichments table for extension data
- Link to messages and extension_id
- Add type and payload JSONB fields

Task: FC-043"

# FC-044: Relationships endpoints
git commit -m "feat(api): implement relationships endpoints

- GET /relationships - list account relationships
- POST /relationships - create relationship
- PATCH /relationships/:id - update perspective and context
- Validate 2000 char limit for context

Task: FC-044"

# FC-045: Conversations endpoints
git commit -m "feat(api): implement conversations endpoints

- GET /conversations - list active conversations
- POST /conversations - create conversation
- PATCH /conversations/:id - update status
- GET /conversations/:id/messages - get message history

Task: FC-045"

# FC-046: Messages endpoints
git commit -m "feat(api): implement messages endpoints

- POST /messages - send message
- GET /messages/:id - get message details
- PATCH /messages/:id - update message (edit)

Task: FC-046"

# FC-047: WebSocket setup
git commit -m "feat(api): setup websocket for real-time messaging

- Configure WebSocket server with Elysia
- Add connection authentication
- Implement room-based messaging

Task: FC-047"

# FC-048: WebSocket events
git commit -m "feat(api): implement websocket events

- message:new - broadcast new messages
- message:read - update read status
- typing:start/stop - typing indicators
- conversation:updated - conversation changes

Task: FC-048"

# FC-049: Persistence service
git commit -m "feat(core): create persistence service

- Implement IPersistenceService interface
- Add message save and retrieve methods
- Handle conversation updates

Task: FC-049"

# FC-050: MessageCore service
git commit -m "feat(core): implement MessageCore orchestrator

- Create MessageCore class without AI logic
- Implement receive() method
- Delegate to persistence, notifications, and extensions
- NO integrated AI - delegates to @fluxcore/fluxcore extension

Task: FC-050"

# FC-051: Notification service
git commit -m "feat(core): create notification service

- Implement INotificationService interface
- Add WebSocket broadcast methods
- Handle connection management

Task: FC-051"

# FC-052-066: Chat Frontend
git commit -m "feat(web): implement chat interface

- Create conversation list component
- Add message thread component
- Implement message input with media support
- Add WebSocket client integration
- Create typing indicators
- Add read receipts
- Implement message search

Tasks: FC-052 to FC-066"

# Merge a develop
git checkout develop
git merge feature/chat-core --no-ff -m "feat: merge chat core (Hito 2)

Completed tasks: FC-040 to FC-066
Duration: 2 weeks"
```

---

## Hito 3: Workspace UI (2 semanas)

### Branch: `feature/workspace-ui`

```bash
# FC-080: Panel Stack Manager
git commit -m "feat(web): implement panel stack manager

- Create panel management system
- Support multiple panel types
- Handle panel focus and navigation

Task: FC-080"

# FC-081: ActivityBar component
git commit -m "feat(web): create activitybar component

- Add vertical navigation bar
- Support icon-based navigation
- Highlight active section

Task: FC-081"

# FC-082-097: Workspace components
git commit -m "feat(web): implement workspace UI components

- Create Sidebar component
- Add ViewPort component
- Implement StatusBar
- Add CommandPalette
- Create ContactDetailPanel
- Implement multi-panel layout

Tasks: FC-082 to FC-097"

# Merge a develop
git checkout develop
git merge feature/workspace-ui --no-ff -m "feat: merge workspace UI (Hito 3)

Completed tasks: FC-080 to FC-097
Duration: 2 weeks"
```

---

## Hito 4: Sistema de Extensiones (2 semanas)

### Branch: `feature/extension-system`

```bash
# FC-150: Schema SQL extension_installations
git commit -m "feat(db): add extension_installations table

- Create table for installed extensions per account
- Add enabled flag and config JSONB
- Link to accounts table

Task: FC-150"

# FC-151: Schema SQL extension_contexts
git commit -m "feat(db): add extension_contexts table for overlays

- Create table for extension-specific context
- Support account, relationship, and conversation scopes
- Add CHECK constraint for single FK
- Enable context isolation between extensions

Task: FC-151"

# FC-152: IExtension interface
git commit -m "feat(types): define IExtension interface

- Create base extension interface
- Define lifecycle methods (install, uninstall, enable)
- Add message processing hook

Task: FC-152"

# FC-153: IExtensionManifest interface
git commit -m "feat(types): define extension manifest with permissions

- Create manifest interface
- Add permission types for context access
- Define config schema structure
- Include UI integration points

Task: FC-153"

# FC-154: ExtensionHost service
git commit -m "feat(core): implement ExtensionHost service

- Create extension orchestration service
- Handle extension lifecycle
- Route messages to extensions
- Manage extension contexts

Task: FC-154"

# FC-155: ManifestLoader
git commit -m "feat(core): create manifest loader

- Implement manifest validation
- Load extension metadata
- Validate required fields

Task: FC-155"

# FC-156: PermissionValidator
git commit -m "feat(core): implement permission validator

- Create permission checking system
- Validate context access permissions
- Handle permission inheritance

Task: FC-156"

# FC-157: ContextAccessService
git commit -m "feat(core): create context access service

- Implement controlled context access
- Enforce permission checks
- Provide read/write methods for overlays

Task: FC-157"

# FC-158-166: Extensions Frontend
git commit -m "feat(web): implement extension management UI

- Create extension marketplace view
- Add extension settings panel
- Implement permission approval UI
- Add extension enable/disable toggle
- Create context overlay viewer

Tasks: FC-158 to FC-166"

# Merge a develop
git checkout develop
git merge feature/extension-system --no-ff -m "feat: merge extension system (Hito 4)

Completed tasks: FC-150 to FC-166
Duration: 2 weeks"
```

---

## Hito 5: @fluxcore/fluxcore (1.5 semanas)

### Branch: `feature/fluxcore-extension`

```bash
# FC-170: Crear extensión fluxcore
git commit -m "feat(fluxcore): create @fluxcore/fluxcore extension

- Initialize extension package structure
- Setup TypeScript configuration
- Add extension entry point

Task: FC-170"

# FC-171: Manifest de fluxcore
git commit -m "feat(fluxcore): define manifest.json

- Add extension metadata
- Define required permissions
- Configure default settings (suggest mode, 30s delay)
- Mark as preinstalled

Task: FC-171"

# FC-172: PromptBuilder
git commit -m "feat(fluxcore): implement PromptBuilder

- Create prompt construction service
- Combine profile + private_context + relationship context
- Add message history integration
- Format system prompt for Groq

Task: FC-172"

# FC-173: Integrar Groq SDK
git commit -m "feat(fluxcore): integrate Groq SDK

- Add Groq client configuration
- Implement chat completion calls
- Use llama-3.1-70b-versatile model
- Handle API errors gracefully

Task: FC-173"

# FC-174: Modos suggest/auto/off
git commit -m "feat(fluxcore): implement AI response modes

- Add suggest mode (requires approval)
- Add auto mode (sends automatically)
- Add off mode (disabled)
- Read mode from extension config

Task: FC-174"

# FC-175: Cola de respuestas con delay
git commit -m "feat(fluxcore): add response queue with delay

- Implement configurable response delay
- Create queue system for AI responses
- Handle concurrent message processing

Task: FC-175"

# FC-176: Pre-instalar fluxcore
git commit -m "feat(api): auto-install fluxcore on account creation

- Add hook to install @fluxcore/fluxcore
- Enable by default for new accounts
- Set default configuration

Task: FC-176"

# FC-177: Evento WS ai:suggestion
git commit -m "feat(api): add ai:suggestion websocket event

- Create new WebSocket event type
- Send AI suggestions to frontend
- Include suggestion metadata

Task: FC-177"

# FC-178: AISuggestionCard component
git commit -m "feat(web): create AI suggestion card component

- Add suggestion display UI
- Implement approve/edit/discard actions
- Show AI confidence indicator
- Add loading states

Task: FC-178"

# FC-179: Panel de configuración
git commit -m "feat(web): add fluxcore settings panel

- Create AI configuration UI
- Add mode selector (suggest/auto/off)
- Add response delay slider
- Show API usage stats

Task: FC-179"

# Merge a develop
git checkout develop
git merge feature/fluxcore-extension --no-ff -m "feat: merge @fluxcore/fluxcore extension (Hito 5)

Completed tasks: FC-170 to FC-179
Duration: 1.5 weeks"
```

---

## Hito 6: Contexto Relacional (1 semana)

### Branch: `feature/relationship-context`

```bash
# FC-130: Extender PromptBuilder
git commit -m "feat(fluxcore): extend PromptBuilder with relationship context

- Add relationship context to prompts
- Parse structured context entries
- Include entry types (note/preference/rule)
- Show author attribution

Task: FC-130"

# FC-131: Validar límite 2000 chars
git commit -m "feat(api): validate relationship context limit

- Add 2000 char validation
- Calculate total_chars on update
- Return error on limit exceeded

Task: FC-131"

# FC-132: ContactDetailPanel
git commit -m "feat(web): create contact detail panel

- Display contact information
- Show relationship metadata
- Add context editor integration

Task: FC-132"

# FC-133: RelationshipContextEditor
git commit -m "feat(web): implement structured context editor

- Create context entry list
- Add entry type selector
- Show author and timestamp
- Display character count

Task: FC-133"

# FC-134: TagsEditor
git commit -m "feat(web): create tags editor component

- Add tag input with autocomplete
- Display tag chips
- Support tag colors

Task: FC-134"

# FC-135: Guardado optimista
git commit -m "feat(web): add optimistic updates for context

- Implement optimistic UI updates
- Handle save failures gracefully
- Show sync status indicator

Task: FC-135"

# FC-136: Selector de tipo de entrada
git commit -m "feat(web): add context entry type selector

- Create type dropdown (note/preference/rule)
- Add visual indicators per type
- Update UI based on selected type

Task: FC-136"

# Merge a develop
git checkout develop
git merge feature/relationship-context --no-ff -m "feat: merge relationship context (Hito 6)

Completed tasks: FC-130 to FC-136
Duration: 1 week"
```

---

## Hito 7: Extensión de Turnos (2 semanas)

### Branch: `feature/appointments-extension`

```bash
# FC-180-191: Extensión appointments
git commit -m "feat(extensions): create appointments extension

- Initialize appointments extension package
- Create database schema for appointments
- Implement check_availability tool
- Implement create_appointment tool
- Add appointment management API
- Create appointment UI components
- Add calendar view
- Integrate with fluxcore for tool calling

Tasks: FC-180 to FC-191"

# Merge a develop
git checkout develop
git merge feature/appointments-extension --no-ff -m "feat: merge appointments extension (Hito 7)

Completed tasks: FC-180 to FC-191
Duration: 2 weeks"
```

---

## Hito 8: Adaptadores WhatsApp (2 semanas)

### Branch: `feature/whatsapp-adapter`

```bash
# FC-200-210: WhatsApp adapter
git commit -m "feat(api): implement WhatsApp adapter

- Create WhatsApp Business API integration
- Add webhook endpoints for incoming messages
- Implement message sending via WhatsApp
- Handle media messages
- Add phone number verification
- Create adapter configuration UI
- Test end-to-end message flow

Tasks: FC-200 to FC-210"

# Merge a develop
git checkout develop
git merge feature/whatsapp-adapter --no-ff -m "feat: merge WhatsApp adapter (Hito 8)

Completed tasks: FC-200 to FC-210
Duration: 2 weeks"
```

---

## Hito 9: Workspaces Colaborativos (1.5 semanas)

### Branch: `feature/collaborative-workspaces`

```bash
# FC-220-229: Workspaces
git commit -m "feat: implement collaborative workspaces

- Create workspaces table schema
- Add workspace_members table
- Implement workspace CRUD endpoints
- Add member invitation system
- Create role-based permissions
- Implement workspace UI
- Add member management panel
- Test multi-user collaboration

Tasks: FC-220 to FC-229"

# Merge a develop
git checkout develop
git merge feature/collaborative-workspaces --no-ff -m "feat: merge collaborative workspaces (Hito 9)

Completed tasks: FC-220 to FC-229
Duration: 1.5 weeks"
```

---

## Hito 10: Producción Ready (2 semanas)

### Branch: `feature/production-ready`

```bash
# FC-240: CI/CD setup
git commit -m "chore(infra): setup CI/CD pipeline

- Add GitHub Actions workflows
- Configure automated testing
- Add build and deploy steps

Task: FC-240"

# FC-241-245: Tests
git commit -m "test: add comprehensive test suite

- Add unit tests for core services
- Add integration tests for API
- Add E2E tests for critical flows
- Configure test coverage reporting

Tasks: FC-241 to FC-245"

# FC-246-250: Documentation
git commit -m "docs: add comprehensive documentation

- Create API documentation
- Add extension development guide
- Write deployment guide
- Add user documentation
- Create contributing guidelines

Tasks: FC-246 to FC-250"

# FC-251-255: Deploy
git commit -m "chore(infra): setup production deployment

- Configure production environment
- Add database migration scripts
- Setup monitoring and logging
- Configure backup strategy
- Add health check endpoints

Tasks: FC-251 to FC-255"

# Merge a develop
git checkout develop
git merge feature/production-ready --no-ff -m "chore: merge production ready (Hito 10)

Completed tasks: FC-240 to FC-255
Duration: 2 weeks"

# Merge a main (RELEASE)
git checkout main
git merge develop --no-ff -m "chore: release v1.0.0

FluxCore v1.0.0 - First production release

Features:
- Complete chat system with multi-channel support
- Extension system with @fluxcore/fluxcore
- WhatsApp integration
- Collaborative workspaces
- Production-ready infrastructure

Total duration: ~18 weeks"

git tag -a v1.0.0 -m "FluxCore v1.0.0"
git push origin main --tags
```

---

## Estrategia de Branches

### Branch Principal: `main`
- Código en producción
- Solo merge desde `develop` con releases
- Protegido: requiere PR y revisión

### Branch de Integración: `develop`
- Código estable en desarrollo
- Merge de features completadas
- Base para nuevas features

### Branches de Feature: `feature/*`
- Una por hito o funcionalidad
- Formato: `feature/nombre-descriptivo`
- Se crean desde `develop`
- Se mergean a `develop` al completar

### Branches de Hotfix: `hotfix/*`
- Para bugs críticos en producción
- Se crean desde `main`
- Se mergean a `main` y `develop`

---

## Workflow Diario

```bash
# 1. Crear feature branch
git checkout develop
git pull origin develop
git checkout -b feature/mi-funcionalidad

# 2. Trabajar en commits atómicos
git add .
git commit -m "feat(scope): descripción clara"

# 3. Push frecuente
git push origin feature/mi-funcionalidad

# 4. Al completar, crear PR a develop
# (via GitHub UI)

# 5. Después del merge, limpiar
git checkout develop
git pull origin develop
git branch -d feature/mi-funcionalidad
```

---

## Reglas de Commits

1. **Commits atómicos**: Un commit = una tarea completada
2. **Mensajes descriptivos**: Explicar QUÉ y POR QUÉ, no CÓMO
3. **Referencias a tareas**: Incluir ID de tarea (FC-XXX)
4. **No commits de WIP**: Completar antes de commitear
5. **Tests incluidos**: Cada feature con sus tests

---

## Checklist Pre-Commit

- [ ] Código compila sin errores
- [ ] Tests pasan localmente
- [ ] Lint sin errores
- [ ] Mensaje de commit sigue convención
- [ ] Cambios relacionados están juntos
- [ ] No hay console.logs o debuggers
- [ ] Documentación actualizada si es necesario

---

## Checklist Pre-Merge a Develop

- [ ] Todos los tests pasan
- [ ] Code review completado
- [ ] Documentación actualizada
- [ ] No hay conflictos con develop
- [ ] Feature completamente funcional
- [ ] Performance validado

---

## Checklist Pre-Release a Main

- [ ] Todos los hitos completados
- [ ] Tests E2E pasan
- [ ] Documentación completa
- [ ] Changelog actualizado
- [ ] Version bump realizado
- [ ] Deploy en staging validado

---

**Este documento es la guía de commits. Seguir estrictamente para mantener un historial limpio y trazable.**
