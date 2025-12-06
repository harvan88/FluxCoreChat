# @fluxcore/db

Package de base de datos para FluxCore usando Drizzle ORM y PostgreSQL.

## Estructura

```
src/
├── schema/           # Definiciones de tablas Drizzle
├── connection.ts     # Configuración de conexión
├── migrate.ts        # Script de migraciones
├── utils/            # Utilidades de DB
└── index.ts          # Exports principales
```

## Scripts

```bash
# Generar migraciones desde schema
bun run db:generate

# Ejecutar migraciones
bun run db:migrate

# Push schema directamente (desarrollo)
bun run db:push

# Abrir Drizzle Studio
bun run db:studio
```

## Uso

```typescript
import { db } from '@fluxcore/db';

// Usar drizzle ORM
const users = await db.select().from(usersTable);
```

## Variables de Entorno

```env
DATABASE_URL=postgresql://user:password@localhost:5432/fluxcore
```

## Nota

Los schemas se implementarán progresivamente en los Hitos 1 y 2 del plan de ejecución.
