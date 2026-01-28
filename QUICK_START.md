# FluxCore - Guía de Inicio Rápido

> **Última actualización:** 2026-01-09

---

## 🚀 Iniciar el Sistema

### OPCIÓN A: Inicio Rápido (día a día)
```powershell
# 1. Levantar base de datos (si no está corriendo)
docker-compose up -d postgres redis

# 2. Aplicar migraciones pendientes (si hubo cambios de schema)
# IMPORTANTE: Ejecutar si el servidor falla por errores de base de datos
cd packages/db
bun run db:push
cd ../..

# 3. (Temporal) Preparar entorno de pruebas
# Levanta Postgres/Redis (paso 1) y luego ejecuta el seed "test baseline" cuando esté disponible.
# Mientras tanto, corre sólo los tests de dominio siguiendo la sección "Testing por dominio".

# 4. Iniciar API + Web
bun run dev

```

### OPCIÓN B: Primera vez / Setup completo
```powershell
# 1. Instalar dependencias
bun install

# 2. Levantar servicios base
docker-compose up -d postgres redis

# 3. Esperar a que PostgreSQL esté healthy (≈5s)

# 4. Sincronizar schema (Drizzle + build @fluxcore/db)
cd packages/db
bunx drizzle-kit push:pg

# 5. Crear cuenta de sistema FluxCore
bun run src/seed-fluxi.ts
cd ../..

# 6. Aplicar migración de embeddings
docker exec fluxcore-db psql -U postgres -d fluxcore -c "
BEGIN;
ALTER TABLE fluxcore_document_chunks ADD COLUMN embedding vector(1536);
CREATE INDEX idx_fluxcore_document_chunks_embedding ON fluxcore_document_chunks USING hnsw (embedding vector_cosine_ops);
COMMIT;
"

# 7. Iniciar API + Web
bun run dev
```

### Verificación
- **API:** http://localhost:3000/health → `{"status":"ok"}`
- **Web:** http://localhost:5173
- **Extensión FluxCore:** Verificar en logs `Loaded extension: @fluxcore/fluxcore`

---

## 📦 Arquitectura

### Estructura de Layout
```
┌─────────────────────────────────────────────────────────────┐
│ App (bg-base)                                                │
├────────┬─────────────────┬──────────────────────────────────┤
│Activity│    Sidebar      │        DynamicContainer          │
│  Bar   │   (bg-surface)  │         (bg-surface)             │
│ (56px) │    (w-80)       │                                  │
│        │                 │  ┌────────────────────────────┐  │
│        │  - Filtros      │  │ Tabs (conversaciones, etc) │  │
│        │  - Listas       │  ├────────────────────────────┤  │
│        │  - Navegación   │  │ Contenido activo           │  │
│        │                 │  │                            │  │
│        │                 │  └────────────────────────────┘  │
└────────┴─────────────────┴──────────────────────────────────┘
```

### Extensión FluxCore (@fluxcore/fluxcore)
Extensión preinstalada por defecto que proporciona:
- **Sugerencias IA**: Genera respuestas inteligentes basadas en contexto
- **Modos de operación**: `suggest` (sugiere), `auto` (automático), `off`
- **Branding**: Mensajes generados incluyen "(gestionado por FluxCore)"

---

## 🎨 Sistema de Diseño

### Colores (Tema Oscuro)
| Variable | Uso |
|----------|-----|
| `bg-base` | Fondo principal |
| `bg-surface` | Paneles, sidebars |
| `bg-elevated` | Cards, inputs |
| `bg-hover` | Estados hover |
| `text-primary` | Texto principal |
| `text-secondary` | Texto secundario |
| `text-muted` | Texto deshabilitado |
| `accent` | Color de acento (azul) |

### Componentes UI
```
components/ui/
├── Button.tsx       # Botones con variantes
├── Input.tsx        # Inputs y textareas
├── Card.tsx         # Contenedores
├── Select.tsx       # Dropdowns
├── Checkbox.tsx     # Checkboxes y radios
├── Avatar.tsx       # Avatares con estados
├── Badge.tsx        # Badges y pills
├── Table.tsx        # Tablas con sort
├── SidebarLayout.tsx # Layout de sidebar
├── CollapsibleSection.tsx # Secciones colapsables con toggle
└── SliderInput.tsx  # Slider con input numérico
```

### CollapsibleSection
Sección colapsable con toggle (patrón DaVinci Resolve):
- **Toggle activo**: Usuario ha personalizado la configuración
- **Toggle inactivo**: Usa valores por defecto

### SliderInput
Componente para valores numéricos:
- Barra horizontal + círculo deslizante + campo numérico
- Soporta min/max/step/decimals

---

## 📋 Comandos Útiles

### Base de Datos
```powershell
# Auditar estado de la DB
cd packages/db
bun run src/audit-database.ts

# Seed FluxCore (cuenta del sistema)
cd packages/db
bun run src/seed-fluxi.ts

# Reparar usuarios sin cuenta
cd packages/db
bun run src/repair-users.ts

# Drizzle Studio (GUI)
cd packages/db 
bun run db:studio

# Aplicar migraciones
cd packages/db
bunx drizzle-kit push:pg
```

### Testing por dominio
```powershell
# 1. Tests de Account Deletion (validar AD-130)
docker-compose up -d postgres redis
# (Temporal) Ejecutar únicamente los archivos de account deletion mientras se publica el seed global
bun test apps/api account-deletion.guard account-deletion.service account-deletion.worker

# 2. Suite completa apps/api (requiere seed test baseline)
# Pendiente: se documentará `bun run seed:test-baseline` cuando el script esté en main.
# Hasta entonces, evita ejecutar la suite completa en entornos vacíos.

# 3. Tests E2E web
cd apps/web
bun run test:e2e
```

### Build
```powershell
# Build producción completo
bun run build
```

---

## ⚠️ Solución de Problemas

| Problema | Solución |
|----------|----------|
| "No se encontraron cuentas" | Regístrate de nuevo (crea account automáticamente) |
| FluxCore no aparece | Ejecutar `bun run src/seed-fluxi.ts` en packages/db |
| Error de conexión DB | Verificar `docker ps` que `fluxcore-db` esté corriendo |
| Puerto 3000 ocupado | `netstat -ano | findstr :3000` y `taskkill /PID <PID> /F` |

---

## 🔗 URLs

| Servicio | URL |
|----------|-----|
| Web App | http://localhost:5173 |
| System Monitor | http://localhost:5173/monitor |
| API | http://localhost:3000 |
| Health | http://localhost:3000/health |
| Swagger | http://localhost:3000/swagger |

---

## 📂 Documentos Clave

| Documento | Propósito |
|-----------|-----------|
| `TOTEM.md` | Visión y principios (inmutable) |
| `EXECUTION_PLAN.md` | Plan de hitos |
| `docs/DESIGN_SYSTEM.md` | Sistema de diseño canónico |
| `docs/ESTADO_PROYECTO.md` | Estado actual |
