# Hitos COR-005 y COR-006

> **Estado**: ✅ Completados  
> **Fecha**: 2025-12-06  
> **Prioridad**: Alta

---

## COR-005: Alias en Accounts

### Resumen

Añade campo `alias` a la tabla `accounts` para permitir identificación contextual en relaciones.

### Problema

Las cuentas solo tenían `displayName`, pero en contextos de relaciones se necesitaba poder mostrar nombres diferentes (ej: "Mi Negocio" como "Proveedor Juan" para un cliente específico).

### Solución

```typescript
// packages/db/src/schema/accounts.ts
alias: varchar('alias', { length: 100 }),
```

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `packages/db/src/schema/accounts.ts` | Campo `alias` añadido |
| `apps/api/src/services/account.service.ts` | Soporte para alias en create/update |

### Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `packages/db/src/run-migration-009-alias.ts` | Script de migración |

### Migración

```powershell
$env:DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/fluxcore'
bun run packages/db/src/run-migration-009-alias.ts
```

---

## COR-006: Validación de Límites de Contexto

### Resumen

Centraliza y mejora la validación de límites de contexto según TOTEM.

### Problema

Las validaciones estaban duplicadas y hardcodeadas en diferentes servicios.

### Solución

Nuevo módulo de validación centralizada:

```typescript
// apps/api/src/utils/context-limits.ts

export const CONTEXT_LIMITS = {
  PRIVATE_CONTEXT_MAX_CHARS: 5000,      // TOTEM 5.2
  RELATIONSHIP_CONTEXT_MAX_CHARS: 2000, // TOTEM 6.3
  CONTEXT_ENTRY_MAX_CHARS: 500,
  ALIAS_MAX_CHARS: 100,
  DISPLAY_NAME_MAX_CHARS: 255,
  USERNAME_MAX_CHARS: 100,
};

// Funciones de validación:
validatePrivateContext(context)
validateRelationshipContext(currentChars, newEntryLength)
validateContextEntry(content)
validateAlias(alias)
validateDisplayName(name)
```

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `apps/api/src/services/account.service.ts` | Usa validación centralizada |
| `apps/api/src/services/relationship.service.ts` | Usa validación centralizada |

### Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `apps/api/src/utils/context-limits.ts` | Constantes y funciones de validación |

---

## Pruebas

### Ejecutar Tests

```bash
bun run src/test-chat.ts
```

### Resultados

```
✅ Register User
✅ Create Account 1
✅ Create Account 2
✅ Create Relationship
✅ Add Context Entry  (valida límites COR-006)
✅ Create Conversation
✅ Send Message
✅ Get Messages

Total: 8/8 pasando
```

---

## Instrucciones para Pruebas Manuales

### COR-005: Verificar Alias

#### 1. Crear cuenta con alias

```bash
curl -X POST http://localhost:3000/accounts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "myaccount",
    "displayName": "Mi Cuenta",
    "type": "personal",
    "alias": "Mi Alias"
  }'
```

#### 2. Verificar respuesta incluye alias

```json
{
  "id": "...",
  "username": "myaccount",
  "displayName": "Mi Cuenta",
  "alias": "Mi Alias",
  ...
}
```

#### 3. Verificar en base de datos

```sql
SELECT id, username, display_name, alias FROM accounts WHERE alias IS NOT NULL;
```

### COR-006: Verificar Límites

#### 1. Intentar crear cuenta con displayName muy largo (>255 chars)

```bash
curl -X POST http://localhost:3000/accounts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testlimits",
    "displayName": "AAAAA....(más de 255 caracteres)....AAAAA",
    "type": "personal"
  }'
```

**Esperado:** Error 400 con mensaje "Display name exceeds 255 characters"

#### 2. Intentar añadir contexto que excede límite

```bash
# Añadir múltiples entradas hasta exceder 2000 chars
curl -X POST http://localhost:3000/relationships/<id>/context \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "note",
    "content": "AAAAA....(texto muy largo)....AAAAA"
  }'
```

**Esperado:** Error con mensaje "Relationship context limit exceeded: X/2000 characters"

---

## Checklist de Validación

### COR-005

- [x] Campo `alias` añadido a schema accounts
- [x] Migración ejecutada
- [x] AccountService soporta alias en create
- [x] AccountService soporta alias en update
- [x] Tests existentes siguen pasando

### COR-006

- [x] Módulo context-limits.ts creado
- [x] CONTEXT_LIMITS exportado con valores TOTEM
- [x] Funciones de validación implementadas
- [x] AccountService usa validación centralizada
- [x] RelationshipService usa validación centralizada
- [x] Tests existentes siguen pasando

---

## Próximos Pasos

Con COR-005 y COR-006 completados, el estado del backlog correctivo es:

| ID | Descripción | Estado |
|----|-------------|--------|
| COR-001 | ExtensionHost Integration | ✅ |
| COR-002 | Message Status | ✅ |
| COR-003 | from/to_actor_id | ✅ |
| COR-004 | Actor Model | ✅ |
| COR-005 | Alias en accounts | ✅ |
| COR-006 | Validación límites | ✅ |
| COR-007 | Automation controller | ⏳ |
| C3 | Offline-First | ⏳ |

**Siguiente:** C3 (Offline-First con IndexedDB) - Requiere confirmación.

---

**Última actualización**: 2025-12-06
