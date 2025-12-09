# FluxCore - Guía de Inicio Rápido

> **Última actualización:** 2024-12-09

---

## 🚀 Iniciar el Sistema (3 Terminales)

### Terminal 1 - Base de Datos
```powershell
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/fluxcore'
docker start fluxcore-postgres
cd packages/db
bun run db:push
```

### Terminal 2 - API
```powershell
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/fluxcore'
cd apps/api
bun run dev
```

### Terminal 3 - Web
```powershell
cd apps/web
bun run dev
```

### Abrir en Navegador
```
http://localhost:5173
```

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
