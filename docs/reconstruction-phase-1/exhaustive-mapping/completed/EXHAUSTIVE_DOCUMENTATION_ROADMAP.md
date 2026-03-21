# Roadmap de Documentación Exhaustiva de FluxCoreChat

**Fecha:** 2026-03-19  
**Propósito:** Crear un mapa completo y riguroso del sistema real actual  
**Metodología:** UI-first → Backend → Database → Flows completos  
**Principio:** "Para el usuario existe la UI, no existe el backend"

---

## 🎯 1. Objetivo de la Documentación

### 1.1 ¿Por Qué Documentación Exhaustiva?

- **Problema actual:** No conocemos el sistema real en profundidad
- **Consecuencia:** Los roadmaps fallan porque diseñamos para un sistema ideal desconociendo el terreno real
- **Solución:** Documentación rigurosa que sea la **única fuente de verdad** del sistema

### 1.2 Principios Rectores

1. **UI-First:** La UI es la realidad para el usuario - todo parte desde allí
2. **Verificable:** Cada afirmación debe tener evidencia en código o BD
3. **Completo:** Sin omitir "detalles" - todo componente, endpoint, tabla importa
4. **Vivo:** Documentación que se actualiza con cada cambio real
5. **Navegable:** Fácil de encontrar cualquier flujo end-to-end

---

## 📋 2. Estructura de Documentación Propuesta

```
docs/reconstruction-phase-1/exhaustive-mapping/
├── 01-ui-landscape/                    # 🎨 Todo lo que ve el usuario
│   ├── UI_COMPONENTS_MAP.md           # Todos los componentes React
│   ├── USER_JOURNEYS.md               # Flujos de usuario completos
│   ├── STATE_MANAGEMENT.md            # useState, hooks, stores
│   └── UI_ROUTES.md                   # Rutas React Router
├── 02-backend-landscape/               # ⚙️ Todo lo que procesa datos
│   ├── ENDPOINTS_DIRECTORY.md         # Todos los endpoints REST
│   ├── SERVICES_DIRECTORY.md          # Todos los servicios backend
│   ├── WEBSOCKET_HANDLERS.md          # Manejo de WebSocket
│   ├── MIDDLEWARE_CHAIN.md            # Auth, CORS, etc.
│   └── PIPELINES_DIRECTORY.md         # Workers, schedulers
├── 03-database-landscape/              # 🗄️ Todo lo que persiste
│   ├── SCHEMAS_DIRECTORY.md           # Todos los schemas Drizzle
│   ├── TABLE_RELATIONSHIPS.md          # Relaciones entre tablas
│   ├── MIGRATIONS_HISTORY.md           # Historial de migraciones
│   └── INDEXES_CONSTRAINTS.md          # Performance y reglas
├── 04-end-to-end-flows/                # 🔄 Flujos completos UI→DB
│   ├── MESSAGE_LIFECYCLE.md            # Mensaje desde input hasta persistencia
│   ├── AI_RESPONSE_FLOW.md             # Prompt → LLM → Response
│   ├── AUTHENTICATION_FLOW.md          # Login → JWT → Validación
│   ├── REALTIME_UPDATES.md             # WebSocket broadcasting
│   └── FILE_UPLOAD_FLOW.md             # Avatar upload, etc.
├── 05-configuration-state/              # ⚙️ Puntos de configuración
│   ├── ENVIRONMENT_VARIABLES.md        # Todas las variables .env
│   ├── FEATURE_FLAGS.md                # Features habilitadas/deshabilitadas
│   ├── RUNTIME_CONFIGS.md              # Configuraciones por cuenta
│   └── SYSTEM_STATE.md                 # Estado global en memoria
└── 00-documentation-index.md            # 📚 Índice maestro
```

---

## 🎨 3. Fase 1: UI Landscape (Donde Vive el Usuario)

### 3.1 Componentes React Completos

**Metodología:**
```bash
# Encontrar todos los componentes React
find apps/web/src -name "*.tsx" -o -name "*.jsx" | head -20

# Analizar estructura de un componente
grep -n "export.*function\|export.*const\|interface.*Props" apps/web/src/components/chat/ChatView.tsx
```

**Documentación por componente:**
```markdown
## ChatView.tsx
- **Ubicación:** `apps/web/src/components/chat/ChatView.tsx`
- **Props:** `{ messages, onSendMessage, isLoading }`
- **Estado local:** `useState` para input, scroll, etc.
- **Hooks:** `useWebSocket`, `useChat`, etc.
- **Eventos:** `onSubmit`, `onScroll`, etc.
- **Dependencias:** Importa qué servicios/hooks
- **Rutas:** Dónde se renderiza en React Router
```

### 3.2 User Journeys Completos

**Ejemplo: "Enviar Mensaje"**
1. **UI:** Usuario escribe en ChatInput
2. **Hook:** `useChat.onSendMessage()`
3. **API:** `POST /messages`
4. **Backend:** `messageService.create()`
5. **DB:** Insert en tabla `messages`
6. **WebSocket:** Broadcast a otros clientes
7. **UI Update:** `useWebSocket` actualiza estado

### 3.3 State Management

- **Local state:** `useState` por componente
- **Global state:** Zustand stores, context
- **Server state:** React Query, SWR
- **Form state:** React Hook Form, etc.

---

## ⚙️ 4. Fase 2: Backend Landscape

### 4.1 Endpoints Directory Completo

**Metodología:**
```bash
# Encontrar todos los endpoints
grep -r "\.get\|\.post\|\.put\|\.delete" apps/api/src/routes --include="*.ts"

# Analizar un endpoint específico
grep -A 10 -B 5 "POST.*messages" apps/api/src/routes/messages.routes.ts
```

**Documentación por endpoint:**
```markdown
## POST /messages
- **Ubicación:** `apps/api/src/routes/messages.routes.ts:45`
- **Middleware:** `authMiddleware`, `validateMessage`
- **Handler:** `messageController.create()`
- **Request Body:** `{ content, conversationId }`
- **Response:** `{ id, content, createdAt }`
- **Errors:** 400, 401, 404, 500
- **Dependencies:** `messageService`, `conversationService`
- **Database:** Inserta en `messages` table
```

### 4.2 Services Directory

**Por cada servicio:**
- **Responsabilidad principal**
- **Métodos públicos**
- **Dependencias**
- **Uso de base de datos**
- **Eventos que emite**

### 4.3 WebSocket Handlers

- **Eventos:** `message:new`, `typing:start`, etc.
- **Rooms/Channels:** Cómo se agrupan los clientes
- **Broadcasting:** Quién recibe qué eventos

---

## 🗄️ 5. Fase 3: Database Landscape

### 5.1 Schemas Directory

**Por cada tabla:**
```markdown
## messages table
- **Schema:** `packages/db/src/schema/messages.ts`
- **Columns:** id, content, senderAccountId, conversationId, createdAt
- **Indexes:** (conversationId, createdAt), etc.
- **Constraints:** FK a conversations, accounts
- **Relationships:** messages → conversations → accounts
- **Usage:** Qué services leen/escriben
```

### 5.2 Table Relationships

**Diagrama de relaciones:**
```
accounts (1) ←→ (n) conversations
conversations (1) ←→ (n) messages
accounts (1) ←→ (n) fluxcore_assistants
```

### 5.3 Migrations History

- **Cuándo se creó cada tabla**
- **Cuándo se modificó**
- **Datos de seed/inicialización**

---

## 🔄 6. Fase 4: End-to-End Flows

### 6.1 Message Lifecycle Flow

**UI → Backend → DB → UI:**
1. **ChatInput.tsx** → `onSubmit()`
2. **useChat.ts** → `api.sendMessage()`
3. **api.ts** → `POST /messages`
4. **messages.routes.ts** → `messageController.create()`
5. **message.service.ts** → `db.insert(messages)`
6. **message-core.ts** → `broadcastToParticipants()`
7. **WebSocket** → `message:new` event
8. **useWebSocket.ts** → Update local state
9. **ChatView.tsx** → Re-render with new message

### 6.2 AI Response Flow

**Prompt → LLM → Response:**
1. **MessageBubble.tsx** → User message sent
2. **Kernel** → `EXTERNAL_INPUT_OBSERVED` signal
3. **ChatProjector** → Enqueue in `cognition_queue`
4. **CognitionWorker** → Pick up turn
5. **CognitiveDispatcher** → Resolve context
6. **RuntimeGateway** → Invoke runtime
7. **AsistentesLocalRuntime** → LLM call
8. **ActionExecutor** → Persist response
9. **WebSocket** → Broadcast response

---

## ⚙️ 7. Fase 5: Configuration & State

### 7.1 Environment Variables

**Por variable:**
- **Nombre:** `DATABASE_URL`
- **Propósito:** Conexión a PostgreSQL
- **Default:** `postgresql://localhost:5432/fluxcore`
- **Uso:** `packages/db/src/index.ts`
- **Required:** Sí/No

### 7.2 Feature Flags

- **FLUX_NEW_ARCHITECTURE:** Habilita nuevo pipeline
- **ENABLE_PUBLIC_PROFILES:** Activa perfiles públicos
- **DEBUG_WEBSOCKETS:** Logs de WebSocket

### 7.3 Runtime Configurations

- **Por cuenta:** `fluxcore_runtime_configs`
- **Por asistente:** `fluxcore_assistants.modelConfig`
- **Global:** Settings del sistema

---

## 📅 8. Cronograma de Documentación

### Semana 1: UI Landscape
- **Día 1-2:** Mapear todos los componentes React
- **Día 3-4:** Documentar user journeys principales
- **Día 5:** State management y routing

### Semana 2: Backend Landscape  
- **Día 1-2:** Documentar todos los endpoints REST
- **Día 3-4:** Services y sus dependencias
- **Día 5:** WebSocket y pipelines

### Semana 3: Database Landscape
- **Día 1-2:** Todos los schemas y tablas
- **Día 3-4:** Relaciones y constraints
- **Día 5:** Migrations y seeds

### Semana 4: End-to-End Flows
- **Día 1-2:** Message lifecycle completo
- **Día 3-4:** AI response flow
- **Día 5:** Authentication y realtime

### Semana 5: Configuration & Index
- **Día 1-2:** Environment variables y feature flags
- **Día 3-4:** Configuraciones runtime
- **Día 5:** Índice maestro y navegación

---

## 🔧 9. Herramientas y Automatización

### 9.1 Scripts de Descubrimiento

```bash
#!/bin/bash
# scripts/discover-ui-components.sh
find apps/web/src -name "*.tsx" -exec basename {} \; | sort

#!/bin/bash  
# scripts/discover-endpoints.sh
grep -r "\.get\|\.post\|\.put\|\.delete" apps/api/src/routes --include="*.ts" | cut -d: -f2 | sort | uniq

#!/bin/bash
# scripts/discover-tables.sh
grep -r "pgTable\|mysqlTable" packages/db/src/schema --include="*.ts" | cut -d: -f2 | sort
```

### 9.2 Validación Automática

```typescript
// scripts/validate-documentation.ts
// Verificar que cada componente UI esté documentado
// Verificar que cada endpoint tenga su documentación
// Verificar que cada tabla esté mapeada
```

### 9.3 Diagramas Automáticos

```bash
# Generar diagramas de relaciones
drizzle-kit generate

# Generar diagramas de componentes
npx @storybook/docs-tools

# Generar diagramas de API
n swagger-api-docs
```

---

## 📚 10. Mantenimiento de la Documentación

### 10.1 Reglas de Actualización

1. **Cada nuevo componente** → Documentar inmediatamente
2. **Cada nuevo endpoint** → Agregar a ENDPOINTS_DIRECTORY.md
3. **Cada cambio en BD** → Actualizar schemas y relaciones
4. **Cada refactor** → Actualizar flows afectados

### 10.2 Review Process

- **Semanal:** Revisión de cambios vs documentación
- **Mensual:** Auditoría de completitud
- **Por feature:** Validación end-to-end

### 10.3 Accesibilidad

- **Búsqueda:** Full-text search en todos los docs
- **Navegación:** Links cruzados entre UI→Backend→DB
- **Visual:** Diagramas y ejemplos de código

---

## ✅ 11. Criterios de Éxito

### 11.1 Completitud
- [ ] 100% de componentes UI documentados
- [ ] 100% de endpoints REST documentados  
- [ ] 100% de tablas de BD documentadas
- [ ] Todos los flujos principales mapeados

### 11.2 Precisión
- [ ] Cada afirmación verificable en código
- [ ] Sin "magia" - todo tiene explicación
- [ ] Versiones y ubicaciones exactas

### 11.3 Usabilidad
- [ ] Cualquier developer puede encontrar un flujo completo
- [ ] Nuevos miembros pueden entender el sistema en 1 día
- [ ] Soporta debugging efectivo

---

## 🚀 12. Próximos Pasos Inmediatos

### Hoy
1. **Crear estructura de directorios** en `docs/reconstruction-phase-1/exhaustive-mapping/`
2. **Escribir scripts de descubrimiento** automatizados
3. **Empezar con UI Components Map**

### Mañana  
1. **Ejecutar scripts** para descubrir componentes
2. **Documentar primeros 10 componentes** importantes
3. **Validar metodología** con un flujo simple

### Esta Semana
1. **Completar UI Landscape** completo
2. **Empezar Backend Landscape** con endpoints
3. **Crear primer flow end-to-end** (message lifecycle)

---

## 🎯 13. Resultado Esperado

Al final de este proceso tendremos:

1. **Mapa completo del terreno actual** - sin sorpresas
2. **Base sólida para cualquier refactor** - sabemos qué cambia
3. **Documentación viva** - se mantiene sola
4. **Confianza para implementar el modelo ideal** - conocemos el punto de partida

**Esta documentación será la base para que los roadmaps T1/T2 y futuros puedan implementarse exitosamente.**

---

*Roadmap diseñado para ser ejecutable, verificable y mantenerse vivo con el sistema.*
