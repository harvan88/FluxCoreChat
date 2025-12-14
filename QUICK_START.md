# FluxCore - Guía de Inicio Rápido

> **Última actualización:** 2025-12-10

---

## 🚀 Iniciar el Sistema

### OPCIÓN A: Inicio Rápido (día a día)
```powershell
# 1. Levantar base de datos
docker-compose up -d postgres redis

# 2. Iniciar API + Web
bun run dev
```

### OPCIÓN B: Primera vez / Setup completo
```powershell
# 1. Levantar servicios
docker-compose up -d postgres redis

# 2. Esperar 5 segundos a que PostgreSQL inicie

# 3. Sincronizar schema de base de datos
cd packages/db
bun run db:push
cd ../..

# 4. Iniciar API + Web
bun run dev
```

### Verificación
- **API:** http://localhost:3000/health → `{"status":"ok"}`
- **Web:** http://localhost:5173
- **Extensiones:** Verificar en logs "Loaded X extensions" (debe incluir @fluxcore/website-builder)

---

## ⚠️ Cuándo usar cada comando

| Situación | Comando |
|-----------|---------|
| **Inicio diario** | `docker-compose up -d postgres redis` + `bun run dev` |
| **Primera vez** | Agregar `bun run db:push` antes de `bun run dev` |
| **Cambié el schema** | `cd packages/db && bun run db:push` |
| **Error de conexión DB** | Verificar con `docker ps` que `fluxcore-db` esté corriendo |
| **Extensiones no cargan** | Verificar `extensions/Karen/manifest.json` existe |
| **Limpiar y reiniciar** | `docker-compose down` + `docker-compose up -d postgres redis` |

---

## 📋 Comandos Útiles

### Base de Datos
```powershell
# Auditar estado de la DB
cd packages/db
bun run src/audit-database.ts

# Seed Fluxi (cuenta del sistema)
cd packages/db
bun run src/seed-fluxi.ts

# Reparar usuarios sin cuenta
cd packages/db
bun run src/repair-users.ts

# Drizzle Studio (GUI)
cd packages/db 
bun run db:studio

# Generar migración
cd packages/db
bun run db:generate
```

### Testing
```powershell
# Tests unitarios
cd apps/web
bun run test

# Tests E2E
cd apps/web
bun run test:e2e
```

### Build
```powershell
# Build producción
cd apps/web
bun run build

# Build API
cd apps/api
bun run build
```

---

## ⚠️ Solución de Problemas

### "No se encontraron cuentas"
Regístrate de nuevo - el sistema ahora crea account automáticamente.

### Docker no inicia
```powershell
docker run --name fluxcore-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14
```

### Puerto ocupado
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 🔗 URLs

| Servicio | URL |
|----------|-----|
| Web App | http://localhost:5173 |
| **System Monitor** | **http://localhost:5173/monitor** |
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/swagger |
| Health | http://localhost:3000/health |
| Diagnostic | http://localhost:3000/health/diagnostic |

---

## 🔍 System Monitor

Dashboard de monitoreo en tiempo real que muestra:
- **PostgreSQL**: Conteo de todas las tablas, estado de conexión
- **IndexedDB**: Estado del storage local, cola de sincronización
- **Endpoints**: Estado de los endpoints principales
- **Sync Comparison**: Comparación PostgreSQL vs IndexedDB

### Acceso
```
http://localhost:5173/monitor
```

No requiere autenticación. Auto-refresh cada 5 segundos.

---

## 📂 Documentos Clave

| Documento | Propósito |
|-----------|-----------|
| `TOTEM.md` | Visión y principios (inmutable) |
| `EXECUTION_PLAN.md` | Plan de hitos |
| `docs/ESTADO_PROYECTO.md` | Estado actual |
| `PRUEBA_DE_PRODUCCION.md` | Escenario de prueba |
