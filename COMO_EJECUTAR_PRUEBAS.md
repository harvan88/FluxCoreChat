# 🧪 Cómo Ejecutar las Pruebas - FluxCore

## 🚀 Método Rápido (Recomendado)

### Opción 1: Script Automático para Iniciar Servidor

```powershell
.\start-server.ps1
```

Este script:
1. ✅ Verifica que Docker esté corriendo
2. ✅ Inicia PostgreSQL si no está corriendo
3. ✅ Aplica las migraciones automáticamente
4. ✅ Inicia el servidor API

**Deja esta terminal abierta** y abre una nueva terminal para ejecutar las pruebas.

### Opción 2: Script Automático para Ejecutar Pruebas

En una **nueva terminal PowerShell**:

```powershell
.\run-tests.ps1
```

Este script:
1. ✅ Verifica que Docker y PostgreSQL estén corriendo
2. ✅ Aplica migraciones si es necesario
3. ✅ Verifica que el servidor esté corriendo
4. ✅ Ejecuta todas las pruebas automáticamente

---

## 📝 Método Manual (Paso a Paso)

### Terminal 1: Iniciar Servidor

```powershell
# 1. Iniciar PostgreSQL (si no está corriendo)
docker run --name fluxcore-postgres -e POSTGRES_DB=fluxcore -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14

# 2. Aplicar migraciones
cd packages\db
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fluxcore"; bun run src/migrate.ts
cd ..\..

# 3. Iniciar servidor
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fluxcore"; bun run dev
```

**Salida esperada:**
```
🚀 FluxCore API running at http://localhost:3000
📚 Swagger docs at http://localhost:3000/swagger
🔌 WebSocket at ws://localhost:3000/ws
```

### Terminal 2: Ejecutar Pruebas

```powershell
# Pruebas de Identidad (Hito 1)
bun run apps/api/src/test-api.ts

# Pruebas de Chat (Hito 2)
bun run apps/api/src/test-chat.ts
```

---

## ✅ Resultados Esperados

### Pruebas de Identidad (Hito 1)
```
✅ API is running

🧪 Starting API Tests...

📊 Test Results:
════════════════════════════════════════════════════════════
✅ Register User
   User registered successfully

✅ Login User
   User logged in successfully

✅ Create Account
   Account created successfully

✅ Get Accounts
   Found 1 accounts

✅ Update Account
   Account updated successfully
════════════════════════════════════════════════════════════

✅ Passed: 5
❌ Failed: 0
📈 Total: 5
```

### Pruebas de Chat (Hito 2)
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

## ❌ Solución de Problemas

### Error: "API is not running"

**Solución:** Asegúrate de que el servidor esté corriendo en la Terminal 1.

```powershell
# Verificar que el servidor está corriendo
curl http://localhost:3000/health
```

### Error: "password authentication failed for user harva"

**Solución:** Debes pasar la variable de entorno `DATABASE_URL` explícitamente.

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fluxcore"; bun run src/migrate.ts
```

### Error: "Connection refused" (PostgreSQL)

**Solución:** PostgreSQL no está corriendo.

```powershell
# Verificar contenedores
docker ps

# Si no aparece fluxcore-postgres, iniciarlo
docker start fluxcore-postgres

# O crear uno nuevo
docker run --name fluxcore-postgres -e POSTGRES_DB=fluxcore -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14
```

### Error: "container name already in use"

**Solución:** El contenedor ya existe pero está detenido.

```powershell
# Iniciar el contenedor existente
docker start fluxcore-postgres

# O eliminarlo y crear uno nuevo
docker rm -f fluxcore-postgres
docker run --name fluxcore-postgres -e POSTGRES_DB=fluxcore -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14
```

---

## 🔧 Comandos Útiles

```powershell
# Ver estado de Docker
docker ps

# Ver logs de PostgreSQL
docker logs fluxcore-postgres

# Detener PostgreSQL
docker stop fluxcore-postgres

# Iniciar PostgreSQL
docker start fluxcore-postgres

# Reiniciar PostgreSQL
docker restart fluxcore-postgres

# Eliminar PostgreSQL (cuidado: borra todos los datos)
docker rm -f fluxcore-postgres

# Verificar que el API está corriendo
curl http://localhost:3000/health

# Ver Swagger docs
# Abrir en navegador: http://localhost:3000/swagger
```

---

## 📚 Documentación Adicional

- **Problemas encontrados y soluciones:** [SOLUCION_PROBLEMAS.md](./SOLUCION_PROBLEMAS.md)
- **Hito 1 - Identidad:** [docs/HITO_1_IDENTITY.md](./docs/HITO_1_IDENTITY.md)
- **Hito 2 - Chat Core:** [docs/HITO_2_CHAT_CORE.md](./docs/HITO_2_CHAT_CORE.md)
- **Arquitectura completa:** [TOTEM.md](./TOTEM.md)
- **Plan de ejecución:** [EXECUTION_PLAN.md](./EXECUTION_PLAN.md)

---

## 💡 Consejos

1. **Siempre deja el servidor corriendo** en una terminal mientras ejecutas las pruebas en otra
2. **Usa los scripts automáticos** (`start-server.ps1` y `run-tests.ps1`) para evitar errores
3. **Si algo falla**, revisa [SOLUCION_PROBLEMAS.md](./SOLUCION_PROBLEMAS.md)
4. **Docker Desktop debe estar corriendo** antes de ejecutar cualquier comando

---

**¿Listo para empezar?** Ejecuta `.\start-server.ps1` en una terminal y `.\run-tests.ps1` en otra. ¡Así de simple!
