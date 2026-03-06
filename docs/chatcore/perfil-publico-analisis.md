# Perfil Público con Chat Integrado — Estado Real del Sistema
**Versión:** 7.0 — Corrección de persistencia, broadcast y flujo auth  
**Última actualización:** 2026-03-05

---

## 1. Modelo Conceptual: Tres Superficies, Una Verdad

Meetgar tiene **una sola fuente de verdad** (backend, DB, pipeline de mensajes). Esa verdad se muestra en **tres superficies distintas** que comparten la misma tecnología:

```
┌─────────────────────────────────────────────────────────┐
│                   BACKEND (una verdad)                   │
│  accounts · conversations · messages · Kernel · IA      │
└────────┬──────────────────┬──────────────────┬──────────┘
         │                  │                  │
    ┌────▼─────┐     ┌──────▼──────┐    ┌──────▼──────┐
    │ meetgar  │     │  meetgar    │    │ panaderia  │
    │ .com     │     │ .com/p/    │    │ .com       │
    │ (interno)│     │  carlos    │    │ (widget)   │
    │          │     │ (perfil    │    │            │
    │ Layout + │     │  público)  │    │ Widget +   │
    │ ChatView │     │ Header +   │    │ ChatView   │
    │          │     │ ChatView   │    │            │
    └──────────┘     └────────────┘    └────────────┘
```

### Principio fundamental

**Los componentes de chat son los mismos en todas las superficies.** ChatView, MessageInput, MessageList — son idénticos. Lo que cambia es el **shell** (header, layout, navegación):

| Superficie | Shell | Chat | Identidad del visitante |
|---|---|---|---|
| `meetgar.com` (interno) | Layout completo con sidebar, contacts, settings | Mismo ChatView | Autenticado (cuenta registrada) |
| `meetgar.com/p/carlos` (perfil público) | PublicProfileHeader | Mismo ChatView | Anónimo (visitorToken) → puede autenticarse |
| `panaderia.com` (widget) | WidgetHeader | Mismo ChatView | Anónimo (visitorToken) → puede autenticarse |

### Ejemplo concreto

Un usuario pregunta **"¿Hay pan?"** a la panadería de Carlos. Esto puede ocurrir desde:

1. **meetgar.com** (chat interno) — El usuario ya tiene cuenta, ya tiene relación con Carlos. Escribe en la conversación existente.
2. **meetgar.com/p/carlos** (perfil público) — El usuario llega al perfil de Carlos, escribe como anónimo.
3. **panaderia.com** (widget) — El usuario ve el widget de Meetgar en la web de la panadería, escribe como anónimo.

En los tres casos, Carlos responde "No, se acabó el pan" desde su panel en meetgar.com. **Es la misma conversación, la misma respuesta, la misma IA.** Solo cambia dónde se originó el mensaje.

---

## 2. Flujo Anónimo → Autenticado

Este flujo es idéntico en el perfil público y en el widget.

### Fase 1: Visitante anónimo escribe

```
Andrés visita meetgar.com/p/carlos (o panaderia.com con widget)
  → Se genera visitorToken (UUID, persistido en localStorage)
  → Escribe: "¿Está abierta la peluquería?"
  → Conversación creada con visitorToken (sin relationshipId)
  → IA responde: "Sí, estamos abiertos hasta las 20h"
  → Andrés escribe más mensajes — todo bajo el mismo visitorToken
```

### Fase 2: Andrés inicia sesión

```
Andrés decide iniciar sesión (login/registro dentro de la misma superficie)
  1. Se autentica → obtiene accountId real
  2. Backend certifica vínculo B2: visitorToken ↔ accountId real
     (CONNECTION_EVENT_OBSERVED en el Kernel)
  3. Se crea relationship entre cuenta de Andrés ↔ cuenta de Carlos
  4. La conversación existente se vincula a la relationship
  5. Andrés es redirigido al chat interno (meetgar.com)
  6. Ve todos los mensajes anteriores — los anónimos y los nuevos
     en un solo lugar continuo
```

### Qué pasa con los datos

| Elemento | Antes de login | Después de login |
|---|---|---|
| Mensajes | Persisten con visitorToken como sender | Se enriquecen con accountId real via identity link |
| Conversación | `visitorToken = "abc"`, `relationshipId = null` | Se vincula a la nueva relationship |
| visitorToken | Identidad provisional | Se mantiene como referencia histórica (el Journal es inmutable) |
| UI | Perfil público / Widget | Redirige a chat interno en meetgar.com |

---

## 3. El Alias como Identidad Humana

El alias es el **único identificador público de una cuenta**. No existe `username` separado — fue consolidado en el alias (migraciones 044 + 045).

- **Único** en todo el sistema (`UNIQUE NOT NULL` constraint formal)
- **Mutable** desde la UI con validación de disponibilidad en tiempo real
- Formato: `^[a-z][a-z0-9_-]{2,29}$` (3-30 chars, empieza con letra)
- Palabras reservadas protegidas (`admin`, `api`, `login`, `settings`, etc.)
- Se auto-genera en registro: `{email_prefix}_{timestamp_base36}`

**Nota sobre `username`:** La columna sigue en la DB por backward compat. Se escribe `username = alias` automáticamente. Todo el código usa **solo `alias`**. Pendiente drop en migración futura.

---

## 4. Estado Actual del Sistema (Implementado)

### 4.1 Schema de Accounts

```typescript
// packages/db/src/schema/accounts.ts
accounts = {
  id: uuid().primaryKey(),
  ownerUserId: uuid().notNull().references(users.id),
  username: varchar(100).notNull().unique(),  // DEPRECATED — sync con alias
  displayName: varchar(255).notNull(),
  alias: varchar(100).notNull().unique(),     // ✅ PRIMARY human identity
  accountType: varchar(20).notNull(),         // 'personal' | 'business'
  profile: jsonb().default({}).notNull(),     // { bio, avatarUrl }
  privateContext: text(),
  avatarAssetId: uuid().references(assets.id),
  // ... flags de IA, timestamps
}
```

### 4.2 Modelo de Conversaciones

| Tipo | relationshipId | visitorToken | ownerAccountId | conversationType |
|---|---|---|---|---|
| Entre cuentas registradas | `"rel-123"` | `null` | `null` | `"internal"` |
| Visitante ↔ cuenta | `null` | `"visitor-abc-123"` | `"carlos-uuid"` | `"anonymous_thread"` |
| Convertida (anón→auth) | `"rel-456"` | `"visitor-abc-123"` | `"carlos-uuid"` | `"internal"` |

**`ownerAccountId`** (migración 046): vincula conversaciones de visitante a la cuenta del tenant (Carlos). Esto permite que Carlos vea las conversaciones de visitantes en su lista de chats.

### 4.3 Pipeline WebSocket (widget protocol)

```typescript
// Conexión (perfil público y widget usan el mismo protocolo)
{ type: 'widget:connect', alias: 'carlos', visitorToken: 'visitor-abc-123' }

// Mensaje
{ type: 'widget:message', alias: 'carlos', visitorToken: 'visitor-abc-123', content: { text: '...' } }
```

**Pipeline de `handleWidgetMessage`:**
1. Busca cuenta por alias (`eq(accounts.alias, alias)`)
2. `conversationService.ensureConversation({ visitorToken, ownerAccountId: account.id, channel: 'webchat' })`
3. `messageCore.send({ senderAccountId: account.id, type: 'incoming', generatedBy: 'human' })`
4. `chatCoreWebchatGateway.certifyIngress({ visitorToken, tenantId: account.id })`
5. CognitiveDispatcher → runtime IA → respuesta → `MessageCore.receive()` → `broadcastToVisitor`

**Fix v7.0:** `MessageCore.receive()` ahora llama a `broadcastToVisitor(conversation.visitorToken, ...)` cuando la conversación tiene `visitorToken`, entregando la respuesta de IA al WebSocket del visitante.

### 4.4 visitorToken

```typescript
// apps/web/src/modules/visitor-token.ts
export function getOrCreateVisitorToken(): string {
  const existing = localStorage.getItem('fluxcore_visitor_token');
  if (existing) return existing;
  const token = crypto.randomUUID();
  localStorage.setItem('fluxcore_visitor_token', token);
  return token;
}
```

`localStorage` es origin-bound: `meetgar.com` y `panaderia.com` tienen tokens distintos. La reconciliación ocurre vía B2 cuando el usuario se autentica en cualquier superficie.

---

## 5. Implementación del Perfil Público

### URL

```
meetgar.com/p/{alias}
```

Prefijo `/p/` porque React Router v6 no soporta `/@:alias`. Evita colisión con el catch-all `/*` autenticado.

### Routing

```typescript
// App.tsx — el perfil público NO requiere autenticación
<Routes>
  <Route path="/p/:alias" element={<PublicProfilePage />} />
  <Route path="/*" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />} />
</Routes>
```

### Componentes

```
apps/web/src/public-profile/
├── PublicProfilePage.tsx       # Shell: PublicProfileHeader + ChatView compartido
├── PublicProfileHeader.tsx     # Header específico del perfil público
├── PublicChatContainer.tsx     # Conecta usePublicChat con ChatView compartido
├── hooks/
│   └── usePublicChat.ts        # WebSocket (widget protocol), visitorToken, profile fetch
└── index.ts
```

**Lo que es específico del perfil público:** solo `PublicProfileHeader` y el shell de `PublicProfilePage`.

**Lo que se comparte con el chat interno:** ChatView, MessageInput, MessageList, Avatar, etc.

### API Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/public/profiles/:alias` | No | Perfil público (id, displayName, alias, bio, avatarUrl) |
| `GET` | `/public/profiles/check-alias/:alias` | No | Verificar disponibilidad de alias |
| `GET` | `/public/profiles/:alias/conversation?visitorToken=xxx` | No | Historial de conversación para visitante anónimo |
| `POST` | `/relationships` | Sí | Crear/obtener relación (usado por visitante autenticado) |
| `POST` | `/conversations/convert-visitor` | Sí | Convertir conversación anónima a relación real |
| `PATCH` | `/accounts/:id` | Sí | Actualizar cuenta (incluye campo `alias`) |

### Hook `usePublicChat`

```typescript
export function usePublicChat({ alias }: { alias: string }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const activeAccountId = useAccountStore(s => s.activeAccountId);
  const visitorToken = useMemo(() => getOrCreateVisitorToken(), []);

  // 1. Cargar perfil via REST: GET /public/profiles/:alias
  // 2. Cargar historial de conversación existente:
  //    - Autenticado: POST /relationships (ensure), GET /conversations, GET /conversations/:id/messages
  //    - Anónimo: GET /public/profiles/:alias/conversation?visitorToken=xxx
  // 3. Conectar WebSocket:
  //    - Autenticado: { type: 'subscribe', conversationId } (protocolo normal, con token en URL)
  //    - Anónimo: { type: 'widget:connect', alias, visitorToken }
  // 4. Enviar mensajes:
  //    - Autenticado: { type: 'message', conversationId, senderAccountId, content }
  //    - Anónimo: { type: 'widget:message', alias, visitorToken, content }
  // 5. Recibir respuestas via message:new (dedup por ID)

  return { profile, messages, sendMessage, isConnected, connectionStatus, isAuthenticated };
}
```

### Alias en Settings (ProfileSection)

- Prefijo visual `meetgar.com/p/`
- Validación de formato + disponibilidad con debounce (400ms)
- Indicadores: ✅ disponible, ℹ️ actual, ❌ tomado/reservado, ⚠️ formato inválido

---

## 6. El Widget (Planificado)

El widget es una **puerta de entrada y salida de Meetgar** que se expone en espacios externos (ej: `panaderia.com`). No es un componente separado — usa la misma tecnología que el perfil público.

### Qué comparte con el perfil público

| Aspecto | Perfil Público | Widget | ¿Compartido? |
|---|---|---|---|
| ChatView / MessageInput | ✅ | ✅ | **Sí — idéntico** |
| Protocolo WebSocket | widget:connect/message | widget:connect/message | **Sí — idéntico** |
| visitorToken | localStorage | localStorage | **Sí — misma lógica** |
| Flujo anónimo → auth | Login inline | Login inline | **Sí — mismo flujo** |
| Hook de chat | usePublicChat | usePublicChat | **Sí — el mismo** |
| Header | PublicProfileHeader | WidgetHeader (más compacto) | **No** |
| Shell / Layout | PublicProfilePage | WidgetContainer (Shadow DOM) | **No** |
| Build | Parte de apps/web | Build IIFE independiente | **No** |

### Snippet de hidratación

```html
<script>window.MeetgarConfig = { alias: 'panaderia-carlos' }</script>
<script src="https://meetgar.com/widget.js" async></script>
```

### Aislamiento

Shadow DOM para CSS. Build IIFE independiente. No depende del CSS ni JS del sitio host.

---

## 7. Estructura del Monorepo

### Actual

```
packages/
├── adapters/     # Adaptadores de canales
├── db/           # Drizzle ORM + Schema
├── shared/       # ⚠️ VACÍO — destino natural de lógica compartida
└── types/        # Tipos compartidos (@fluxcore/types)

apps/
├── api/          # Backend Elysia + Bun
└── web/          # Frontend React + Vite (incluye perfil público)
```

### Objetivo (cuando se implemente el widget)

```
packages/
└── meetgar-client-core/     # lógica compartida entre superficies
    ├── hooks/               # usePublicChat, useAuth, useWebSocket
    ├── components/          # ChatView, MessageInput, MessageList
    └── providers/           # MeetgarClientProvider

apps/
├── web/                     # meetgar.com (interno + perfil público)
└── widget/                  # Build IIFE + Shadow DOM para sitios externos
```

La extracción a `meetgar-client-core` ocurre cuando se inicie `apps/widget`, porque ya hay dos consumidores reales.

---

## 8. Migraciones Aplicadas

| # | Archivo | Descripción | Estado |
|---|---|---|---|
| 044 | `044_alias_unique_constraint.sql` | `UNIQUE` constraint en `alias`, resuelve duplicados | ✅ Aplicada |
| 045 | `045_consolidate_username_into_alias.sql` | Backfill `alias = username` donde NULL, `SET NOT NULL` | ✅ Aplicada |
| 046 | `046_conversations_owner_account.sql` | `owner_account_id` en conversations (vincula visitor→tenant) | ✅ Aplicada |

---

## 9. Plan de Implementación

### Completado ✅
- [x] Migración: UNIQUE + NOT NULL en `alias`
- [x] Consolidación `username` → `alias` en todo el código (backend + frontend + @fluxcore/types)
- [x] Endpoint `GET /public/profiles/:alias`
- [x] Endpoint `GET /public/profiles/check-alias/:alias`
- [x] `PATCH /accounts/:id` acepta `alias`
- [x] Componentes de perfil público (`PublicProfilePage`, `PublicProfileHeader`, `PublicChatContainer`)
- [x] Hook `usePublicChat` con WebSocket widget protocol
- [x] Routing `/p/:alias` en `App.tsx`
- [x] Campo de alias en ProfileSection con disponibilidad en tiempo real
- [x] Pipeline de mensajes: `handleWidgetMessage` con conversation creation + certification
- [x] Fix UUID error en `MessageCore.receive` (guard `relationshipId` null para visitor conversations)
- [x] **v7.0:** Migración 046: `owner_account_id` en conversations (vincula visitante→tenant)
- [x] **v7.0:** Fix `MessageCore.receive()`: broadcast a `visitorSubscriptions` cuando conversación tiene `visitorToken`
- [x] **v7.0:** `handleWidgetMessage` pasa `ownerAccountId` al crear conversación
- [x] **v7.0:** `ensureParticipantsForConversation` agrega owner como 'recipient' en conversaciones visitor
- [x] **v7.0:** `getConversationsByAccountId` retorna conversaciones visitor (por `ownerAccountId`)
- [x] **v7.0:** `usePublicChat` detecta auth → usa flujo normal de relationship si autenticado
- [x] **v7.0:** `usePublicChat` carga historial de conversación al conectar/recargar
- [x] **v7.0:** Endpoint `GET /public/profiles/:alias/conversation?visitorToken=xxx` (historial anónimo)
- [x] **v7.0:** Endpoint `POST /conversations/convert-visitor` (conversión anón→auth)
- [x] **v7.0:** `convertVisitorConversation` en ConversationService (vincula visitorToken→relationship)

### Pendiente
- [ ] Reutilizar ChatView/MessageInput compartidos en perfil público (hoy son componentes separados)
- [ ] Flujo auth inline: login/registro dentro del perfil público y widget
- [ ] Crear `packages/meetgar-client-core` cuando se inicie `apps/widget`
- [ ] Crear `apps/widget` con build IIFE + Shadow DOM
- [ ] `accountAliasHistory` para redirecciones ante cambio de alias
- [ ] Drop column `username` de la tabla `accounts`

### Deuda técnica aceptada
- **ChatProjector gap:** mensajes muestran `visitorToken` como sender post-B2
- **Sin historial de alias:** cambio genera 404 en URLs distribuidas
- **Sin sesión cross-domain:** widget y meetgar.com tienen localStorage separados (reconciliación vía B2)
- **Columna `username`:** sigue en DB, se escribe en sync con `alias`, pendiente de drop