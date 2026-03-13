# Hito COR-004 + COR-003: Actor Model Completo

> **Estado**: ✅ Completado  
> **Fecha**: 2025-12-06  
> **Prioridad**: Alta (trazabilidad de mensajes)

## Resumen

Implementación del Actor Model completo según TOTEM PARTE 9.2, permitiendo trazabilidad completa de quién envía y recibe cada mensaje.

---

## Problema Identificado

**Antes de COR-004:**
- No existía forma de identificar el origen real de un mensaje
- No se diferenciaba entre mensajes de usuario, IA o extensiones
- Imposible auditar quién generó cada mensaje

**Resultado:** Sin trazabilidad completa del flujo de mensajes.

---

## Solución Implementada

### Actor Model

Un **Actor** es cualquier entidad que puede enviar o recibir mensajes:

| ActorType | Descripción | Ejemplo |
|-----------|-------------|---------|
| `account` | Cuenta de usuario | Usuario personal o negocio |
| `user` | Usuario directo | Contextos administrativos |
| `builtin_ai` | IA del sistema | @fluxcore/fluxcore |
| `extension` | Extensión instalada | @fluxcore/appointments |

### Diagrama de Entidad-Relación (ERD)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   users     │     │  accounts   │     │ extensions  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │    ┌──────────────┴──────────────┐    │
       └────►          actors             ◄────┘
             │                            │
             │  id                        │
             │  actor_type                │
             │  user_id (nullable)        │
             │  account_id (nullable)     │
             │  extension_id (nullable)   │
             │  display_name              │
             └────────────┬───────────────┘
                          │
                          │
             ┌────────────┴───────────────┐
             │         messages           │
             │                            │
             │  id                        │
             │  conversation_id           │
             │  sender_account_id         │
             │  from_actor_id ◄───────────┤
             │  to_actor_id ◄─────────────┤
             │  content                   │
             │  status                    │
             └────────────────────────────┘
```

---

## Cambios en Código

### Schema: `packages/db/src/schema/actors.ts`

```typescript
export const actors = pgTable('actors', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorType: varchar('actor_type', { length: 20 }).notNull(),
  userId: uuid('user_id').references(() => users.id),
  accountId: uuid('account_id').references(() => accounts.id),
  extensionId: varchar('extension_id', { length: 100 }),
  displayName: varchar('display_name', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type ActorType = 'account' | 'user' | 'builtin_ai' | 'extension';
```

### Schema: `packages/db/src/schema/messages.ts` (COR-003)

```typescript
// Campos añadidos:
fromActorId: uuid('from_actor_id').references(() => actors.id),
toActorId: uuid('to_actor_id').references(() => actors.id),
```

### Servicio: `apps/api/src/services/actor.service.ts`

```typescript
// Métodos principales:
createActor(data)                    // Crear actor
getActorById(id)                     // Obtener por ID
getOrCreateActorForAccount(accountId) // Auto-crear para cuenta
getActorByExtensionId(extensionId)   // Buscar por extensión
getFluxCoreActor()                   // Obtener actor FluxCore
getExtensionActors()                 // Listar actores extensión
getActorsByType(type)                // Filtrar por tipo
```

### Servicio: `apps/api/src/services/account.service.ts`

```typescript
// Actualizado para crear actor automáticamente:
await db.insert(actors).values({
  actorType: 'account',
  userId: data.ownerUserId,
  accountId: account.id,
  displayName: data.displayName,
});
```

---

## Migración

### Archivo: `packages/db/src/run-migration-008-actors.ts`

**Pasos ejecutados:**

1. Añadir columna `actor_type` a actors
2. Hacer `user_id` y `account_id` opcionales
3. Añadir columna `extension_id`
4. Añadir columna `display_name`
5. Añadir `from_actor_id` a messages
6. Añadir `to_actor_id` a messages
7. Crear índices para performance
8. Crear actores builtin (fluxcore, appointments)

### Ejecutar migración

```powershell
$env:DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/fluxcore'
bun run packages/db/src/run-migration-008-actors.ts
```

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `packages/db/src/schema/actors.ts` | Actor Model completo |
| `packages/db/src/schema/messages.ts` | from/to_actor_id |
| `apps/api/src/services/account.service.ts` | Crear actor al crear cuenta |

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `apps/api/src/services/actor.service.ts` | Servicio de actores |
| `apps/api/src/test-actors.ts` | Tests del Actor Model |
| `packages/db/src/run-migration-008-actors.ts` | Script de migración |
| `docs/HITO_COR004_ACTOR_MODEL.md` | Esta documentación |

---

## Tests

### Ejecutar Tests

```bash
# Tests de chat (verifican integración)
bun run src/test-chat.ts

# Tests específicos de actores
bun run src/test-actors.ts
```

### Resultados

```
✅ Register User
✅ Create Account 1  (crea actor automáticamente)
✅ Create Account 2  (crea actor automáticamente)
✅ Create Relationship
✅ Add Context Entry
✅ Create Conversation
✅ Send Message
✅ Get Messages

Total: 8/8 pasando
```

---

## Instrucciones para Pruebas Manuales

### Prerrequisitos

1. PostgreSQL corriendo con base de datos `fluxcore`
2. Migración 008 ejecutada
3. Servidor API corriendo en puerto 3000

### Pasos de Verificación

#### 1. Ejecutar migración (si no está ejecutada)

```powershell
$env:DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/fluxcore'
bun run packages/db/src/run-migration-008-actors.ts
```

#### 2. Iniciar servidor

```powershell
cd apps/api
$env:DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/fluxcore'
bun run src/index.ts
```

#### 3. Verificar actores builtin en base de datos

```sql
SELECT * FROM actors WHERE actor_type IN ('builtin_ai', 'extension');
```

Debería mostrar:

| actor_type | extension_id | display_name |
|------------|--------------|--------------|
| builtin_ai | @fluxcore/fluxcore | FluxCore AI |
| extension | @fluxcore/appointments | Sistema de Turnos |

#### 4. Crear usuario y cuenta

```bash
# Registrar usuario
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","username":"testuser"}'

# Guardar token
TOKEN="<token>"

# Crear cuenta
curl -X POST http://localhost:3000/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"myaccount","displayName":"Mi Cuenta","type":"personal"}'
```

#### 5. Verificar actor creado para la cuenta

```sql
SELECT a.id, a.actor_type, a.display_name, ac.username
FROM actors a
JOIN accounts ac ON a.account_id = ac.id
WHERE a.actor_type = 'account';
```

#### 6. Verificar estructura de mensajes

```sql
SELECT id, sender_account_id, from_actor_id, to_actor_id, status
FROM messages
ORDER BY created_at DESC
LIMIT 5;
```

Los campos `from_actor_id` y `to_actor_id` estarán NULL para mensajes existentes (compatibilidad), pero listos para nuevos mensajes con trazabilidad.

---

## Checklist de Validación

- [x] Schema `actors` actualizado con `actor_type`
- [x] Tipo `ActorType` exportado
- [x] Campos `from_actor_id` y `to_actor_id` en messages
- [x] `ActorService` implementado
- [x] `AccountService` crea actor automáticamente
- [x] Migración ejecutada exitosamente
- [x] Actores builtin creados (fluxcore, appointments)
- [x] Índices creados para performance
- [x] Tests existentes siguen pasando (8/8)
- [x] Build compila correctamente
- [x] Documentación completa

---

## Uso Futuro

Con COR-004 completado, ahora es posible:

1. **Trazabilidad completa** - Saber exactamente quién envió cada mensaje
2. **Mensajes de IA identificados** - fluxcore tiene su propio actor
3. **Extensiones como actores** - Cada extensión puede enviar mensajes
4. **Auditoría** - Historial completo de origen/destino

### Ejemplo de uso en MessageCore (futuro)

```typescript
// Al crear un mensaje de IA:
const fluxcoreActor = await actorService.getFluxCoreActor();
const message = await messageService.createMessage({
  // ... otros campos ...
  fromActorId: fluxcoreActor.id,
  toActorId: recipientActor.id,
});
```

---

## Próximos Pasos

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| COR-005 | Añadir `alias` a accounts | ALTA |
| COR-006 | Validación de límites de contexto | ALTA |
| C3 | Offline-First (IndexedDB) | ALTA |

---

**Última actualización**: 2025-12-06
