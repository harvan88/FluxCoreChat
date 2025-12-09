# Plan de Corrección de Bugs Críticos

**Fecha:** 2024-12-09
**Estado:** EN PROGRESO

## Bugs Identificados

### BUG-001: Actor sin actorType (CRÍTICO)
**Error:** `null value in column "actor_type" violates not-null constraint`
**Archivo:** `apps/api/src/services/account.service.ts:61-65`
**Fix:**
```typescript
await db.insert(actors).values({
  userId: data.ownerUserId,
  accountId: account.id,
  role: 'owner',
  actorType: 'user', // ← AÑADIR ESTO
});
```

### BUG-002: Cuentas antiguas sin core-ai
**Problema:** Cuentas creadas antes de V2-4.2 no tienen extensión instalada
**Fix:** Script de migración para instalar core-ai en cuentas existentes

### BUG-003: No se crea conversación al crear relación
**Problema:** María y Carlos tienen relación pero no conversación
**Fix:** Crear conversación automáticamente al crear relación

### BUG-004: No existe endpoint de upload de fotos
**Problema:** No hay forma de subir avatar/foto de perfil
**Fix:** Crear endpoint `POST /accounts/:id/avatar`

### BUG-005: No hay UI para ver perfil de contacto
**Problema:** Click en contacto no muestra perfil
**Fix:** Crear modal/panel de perfil de contacto

### BUG-006: Cuenta corrupta en DB
**Problema:** "Panadería de la esquina" tiene actor sin actorType
**Fix:** 
```sql
UPDATE actors SET actor_type = 'user' WHERE actor_type IS NULL;
```

---

## Orden de Ejecución

| # | Bug | Prioridad | Tiempo Est. |
|---|-----|-----------|-------------|
| 1 | BUG-001 | CRÍTICO | 5 min |
| 2 | BUG-006 | CRÍTICO | 2 min |
| 3 | BUG-002 | ALTO | 10 min |
| 4 | BUG-003 | ALTO | 15 min |
| 5 | BUG-004 | MEDIO | 30 min |
| 6 | BUG-005 | MEDIO | 20 min |

---

## Progreso

| Bug | Estado | Commit |
|-----|--------|--------|
| BUG-001 | ⏳ Pendiente | |
| BUG-002 | ⏳ Pendiente | |
| BUG-003 | ⏳ Pendiente | |
| BUG-004 | ⏳ Pendiente | |
| BUG-005 | ⏳ Pendiente | |
| BUG-006 | ⏳ Pendiente | |

