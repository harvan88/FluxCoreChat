# 🎯 Instrucciones Finales - FluxCore

## ⚠️ Problema Identificado

El proyecto tiene **versiones incompatibles de Elysia** (v0.8.0) que causan errores de imports. Necesitas actualizar a las versiones más recientes.

## ✅ Solución Completa (Ejecuta en orden)

### Paso 1: Limpiar y Actualizar Dependencias

```powershell
# Navegar al proyecto
cd c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat

# Limpiar node_modules
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

# Actualizar Elysia y plugins en apps/api
cd apps\api
bun remove elysia @elysiajs/cors @elysiajs/jwt @elysiajs/swagger @elysiajs/websocket
bun add elysia@latest @elysiajs/cors@latest @elysiajs/jwt@latest @elysiajs/swagger@latest @elysiajs/websocket@latest
cd ..\..

# Reinstalar todas las dependencias
bun install
```

### Paso 2: Reconstruir Paquetes

```powershell
# Limpiar builds anteriores
Remove-Item -Recurse -Force packages\db\dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force packages\types\dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .turbo -ErrorAction SilentlyContinue

# Reconstruir packages/db
cd packages\db
bun run build
cd ..\..

# Reconstruir packages/types
cd packages\types
bun run build
cd ..\..
```

### Paso 3: Verificar PostgreSQL

```powershell
# Ver si PostgreSQL está corriendo
docker ps

# Si no está corriendo, iniciarlo
docker start fluxcore-postgres

# Si no existe, crearlo
docker run --name fluxcore-postgres -e POSTGRES_DB=fluxcore -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14
```

### Paso 4: Aplicar Migraciones

```powershell
# Aplicar migraciones con variable de entorno
cd packages\db
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fluxcore"
bun run src/migrate.ts
cd ..\..
```

**Salida esperada:**
```
Running migrations...
✅ Migrations completed successfully
```

### Paso 5: Iniciar Servidor (Terminal 1)

```powershell
# Iniciar servidor con variable de entorno
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fluxcore"
cd apps\api
bun run src/index.ts
```

**Salida esperada:**
```
🚀 FluxCore API running at http://localhost:3000
📚 Swagger docs at http://localhost:3000/swagger
🔌 WebSocket at ws://localhost:3000/ws
```

**⚠️ IMPORTANTE: Deja esta terminal abierta y corriendo**

### Paso 6: Ejecutar Pruebas (Terminal 2 - Nueva)

Abre una **nueva terminal PowerShell** y ejecuta:

```powershell
# Navegar al proyecto
cd c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat

# Pruebas de Identidad (Hito 1)
bun run apps/api/src/test-api.ts

# Pruebas de Chat (Hito 2)
bun run apps/api/src/test-chat.ts
```

---

## 📊 Resultados Esperados

### Hito 1: Identidad
```
✅ API is running

🧪 Starting API Tests...

📊 Test Results:
════════════════════════════════════════════════════════════
✅ Register User - User registered successfully
✅ Login User - User logged in successfully
✅ Create Account - Account created successfully
✅ Get Accounts - Found 1 accounts
✅ Update Account - Account updated successfully
════════════════════════════════════════════════════════════

✅ Passed: 5
❌ Failed: 0
📈 Total: 5
```

### Hito 2: Chat Core
```
✅ API is running

🧪 Starting Chat System Tests...

📊 Test Results:
════════════════════════════════════════════════════════════
✅ Register User
✅ Create Account 1
✅ Create Account 2
✅ Create Relationship
✅ Add Context Entry
✅ Create Conversation
✅ Send Message
✅ Get Messages
════════════════════════════════════════════════════════════

✅ Passed: 8
❌ Failed: 0
📈 Total: 8

🎉 All tests passed!
```

---

## 🔧 Solución de Problemas

### Error: "Export named 'Router' not found"

**Causa:** Versiones antiguas de Elysia (v0.8.0)

**Solución:** Ejecuta el Paso 1 completo para actualizar a Elysia v1.4.18+

### Error: "API is not running"

**Causa:** El servidor no está corriendo en la Terminal 1

**Solución:** 
1. Verifica que la Terminal 1 muestre `🚀 FluxCore API running at http://localhost:3000`
2. Si no, ejecuta el Paso 5 de nuevo

### Error: "password authentication failed for user harva"

**Causa:** No se pasó la variable de entorno DATABASE_URL

**Solución:** Siempre ejecuta con:
```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fluxcore"
```

### Error: "Connection refused" (PostgreSQL)

**Causa:** PostgreSQL no está corriendo

**Solución:**
```powershell
docker ps
docker start fluxcore-postgres
```

---

## 📝 Versiones Correctas

Después de actualizar, deberías tener:

- **elysia**: ^1.4.18
- **@elysiajs/cors**: ^1.4.0
- **@elysiajs/jwt**: ^1.4.0
- **@elysiajs/swagger**: ^1.3.1
- **@elysiajs/websocket**: ^0.2.8

Puedes verificar en `apps/api/package.json`

---

## 🎯 Resumen de Cambios Realizados

1. ✅ Corregido import de WebSocket en `apps/api/src/routes/websocket.routes.ts`
2. ✅ Creado archivo `.env` en la raíz con DATABASE_URL correcto
3. ✅ Editado `apps/api/.env` con credenciales correctas
4. ✅ Identificado problema de versiones de Elysia
5. ✅ Documentado solución completa

---

## 💡 Próximos Pasos

1. **Ejecuta el Paso 1** para actualizar Elysia
2. **Ejecuta los Pasos 2-5** para preparar el entorno
3. **Ejecuta el Paso 6** para correr las pruebas
4. **Disfruta** de ver todas las pruebas pasar ✅

---

**Si tienes algún problema, revisa la sección "Solución de Problemas" arriba.**

**¡Buena suerte! 🚀**
