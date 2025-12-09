# Guía de Migraciones - FluxCore Database

**Última actualización:** 2024-12-09

---

## Sistema de Migraciones

FluxCore utiliza **Drizzle ORM** como sistema principal de migraciones.

### Comandos Principales

```bash
# Generar nueva migración desde schemas
bun run db:generate

# Aplicar migraciones pendientes
bun run db:push

# Ver estado de migraciones
bun run db:studio
```

---

## Estado Actual de la Base de Datos

### ✅ Migraciones Drizzle (Oficiales)

| Migración | Fecha | Tablas Creadas | Estado |
|-----------|-------|----------------|--------|
| `0000_strong_proudstar` | 2024-12-06 | users, accounts, actors | ✅ Aplicada |
| `0001_material_killer_shrike` | 2024-12-06 | relationships, conversations, messages, message_enrichments | ✅ Aplicada |

### ⚠️ Migraciones Manuales (Scripts individuales)

Estas migraciones se ejecutaron manualmente y NO están en el journal de Drizzle:

| Script | Tabla/Campo | Estado | Notas |
|--------|-------------|--------|-------|
| `007_message_status.sql` | messages.status | ✅ Aplicada | Añade campo status |
| `run-migration-008-actors.ts` | actors.actor_type, messages.from_actor_id/to_actor_id | ✅ Aplicada | Actor model |
| `run-migration-009-alias.ts` | accounts.alias | ✅ Aplicada | Alias contextual |
| `run-migration-010-automation-rules.ts` | automation_rules | ✅ Aplicada | Tabla completa |
| `migrate-extensions.ts` | extension_installations, extension_contexts | ✅ Aplicada | Sistema de extensiones |
| `migrate-workspaces.ts` | workspaces, workspace_members, workspace_invitations | ✅ Aplicada | Workspaces colaborativos |
| `migrate-all.ts` | appointments*, extensions (legacy) | ✅ Aplicada | **DEPRECATED** |

### 📋 Schemas Actualizados (HITO 16)

Los schemas de Drizzle fueron actualizados para reflejar las migraciones manuales:

| Schema | Campos Añadidos | Fecha |
|--------|-----------------|-------|
| `messages.ts` | status, from_actor_id, to_actor_id | 2024-12-09 |
| `actors.ts` | actor_type, extension_id, display_name (nullable) | 2024-12-09 |
| `accounts.ts` | alias | 2024-12-09 |
| `appointments.ts` | **NUEVO** - appointmentServices, appointmentStaff, appointments | 2024-12-09 |

---

## Tablas en PostgreSQL (17 total)

### Core (Drizzle 0000, 0001)
1. `users`
2. `accounts`
3. `actors`
4. `relationships`
5. `conversations`
6. `messages`
7. `message_enrichments`

### Extensiones y Automatización (Scripts manuales)
8. `automation_rules` (migration-010)
9. `extension_installations` (migrate-extensions)
10. `extension_contexts` (migrate-extensions)
11. `extensions` (migrate-all - legacy)

### Workspaces (migrate-workspaces)
12. `workspaces`
13. `workspace_members`
14. `workspace_invitations`

### Appointments (migrate-all)
15. `appointments`
16. `appointment_services`
17. `appointment_staff`

---

## Cómo Crear una Nueva Migración

### 1. Modificar Schema
```typescript
// packages/db/src/schema/tu-tabla.ts
export const tuTabla = pgTable('tu_tabla', {
  id: uuid('id').primaryKey().defaultRandom(),
  nuevoCampo: varchar('nuevo_campo', { length: 100 }),
  // ...
});
```

### 2. Generar Migración
```bash
cd packages/db
bun run db:generate
```

Esto creará un archivo en `migrations/XXXX_nombre.sql`

### 3. Revisar SQL Generado
```bash
cat migrations/XXXX_nombre.sql
```

### 4. Aplicar Migración
```bash
bun run db:push
```

### 5. Verificar
```bash
bun run src/audit-database.ts
```

---

## Scripts de Utilidad

### Auditar Base de Datos
```bash
cd packages/db
bun run src/audit-database.ts
```

Muestra:
- Todas las tablas existentes
- Columnas de cada tabla
- Foreign keys
- Índices
- Verificación de campos críticos

### Drizzle Studio (GUI)
```bash
cd packages/db
bun run db:studio
```

Abre interfaz web en `https://local.drizzle.studio`

---

## Troubleshooting

### Error: "relation already exists"
La tabla ya existe. Usar `CREATE TABLE IF NOT EXISTS` o verificar con audit-database.ts

### Error: "column does not exist"
El schema Drizzle no está sincronizado con la DB. Verificar con audit-database.ts y actualizar schema.

### Migración manual no se aplicó
1. Verificar con `audit-database.ts`
2. Ejecutar script manualmente si falta
3. Actualizar schema Drizzle para reflejar cambios

---

## Mejores Prácticas

### ✅ DO
- Usar Drizzle migrations para nuevas tablas/campos
- Actualizar schemas después de migraciones manuales
- Ejecutar `audit-database.ts` antes y después de cambios
- Documentar migraciones manuales en este archivo

### ❌ DON'T
- No usar `migrate-all.ts` para tablas nuevas (deprecated)
- No modificar migraciones ya aplicadas
- No ejecutar SQL directo sin documentar
- No olvidar actualizar schemas Drizzle

---

## Rollback

Drizzle no tiene rollback automático. Para revertir:

1. Crear migración inversa manualmente
2. O usar backup de PostgreSQL:
```bash
pg_dump fluxcore > backup.sql
psql fluxcore < backup.sql
```

---

## Referencias

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- Schemas: `packages/db/src/schema/`
- Migraciones: `packages/db/migrations/`
