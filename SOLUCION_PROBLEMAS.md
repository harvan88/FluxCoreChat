# Solución de Problemas Encontrados

## 📋 Resumen de Problemas

### 1. ❌ Error de Autenticación PostgreSQL
**Error:** `password authentication failed for user "harva"`

**Causa:** La librería `postgres` usa el usuario del sistema Windows ("harva") como default cuando no encuentra la variable de entorno `DATABASE_URL`.

**Solución Aplicada:**
- Creado archivo `.env` en la raíz del proyecto con `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fluxcore`
- Editado `apps/api/.env` con la misma configuración
- **IMPORTANTE:** Bun no carga automáticamente archivos `.env` cuando ejecutas scripts en subdirectorios

**Cómo ejecutar migraciones correctamente:**
```powershell
# Opción 1: Desde packages/db con variable de entorno explícita
cd packages/db
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fluxcore"; bun run src/migrate.ts
cd ../..

# Opción 2: Desde la raíz con variable de entorno
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fluxcore"; cd packages/db; bun run src/migrate.ts; cd ../..
```

### 2. ❌ Error de Import en WebSocket
**Error:** `Export named 'Router' not found in module 'elysia'`

**Causa:** Import incorrecto en `apps/api/src/routes/websocket.routes.ts`
- Línea 2: `import ws from '@elysiajs/websocket'` (default import)
- Línea 14: `.use(ws)` 

**Solución Aplicada:**
```typescript
// ANTES (incorrecto)
import ws from '@elysiajs/websocket';
export const websocketRoutes = new Elysia()
  .use(ws)

// DESPUÉS (correcto)
import { websocket } from '@elysiajs/websocket';
export const websocketRoutes = new Elysia()
  .use(websocket())
```

### 3. ⚠️ Error de Tipos en WebSocket
**Error:** Type incompatibility en el handler de mensajes

**Solución Aplicada:**
```typescript
// Cambiar el tipo del parámetro message a any y hacer cast
message(ws: any, message: any) {
  const msg = message as WSMessage;
  // Usar msg en lugar de message
}
```

## ✅ Estado Actual

### Completado:
- [x] PostgreSQL corriendo en Docker
- [x] Migraciones aplicadas exitosamente
- [x] Archivos `.env` configurados correctamente
- [x] Error de WebSocket corregido

### Pendiente:
- [ ] Iniciar el servidor API
- [ ] Ejecutar pruebas de identidad
- [ ] Ejecutar pruebas de chat

## 🚀 Pasos para Ejecutar las Pruebas

### Terminal 1: Iniciar Servidor

```powershell
# Navegar al proyecto
cd c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat

# Iniciar con variable de entorno explícita
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
# Navegar al proyecto
cd c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat

# Pruebas de identidad (Hito 1)
bun run apps/api/src/test-api.ts

# Pruebas de chat (Hito 2)
bun run apps/api/src/test-chat.ts
```

## 🔧 Comandos Útiles

```powershell
# Ver contenedores Docker
docker ps

# Ver logs de PostgreSQL
docker logs fluxcore-postgres

# Reiniciar PostgreSQL
docker restart fluxcore-postgres

# Verificar que el API está corriendo
curl http://localhost:3000/health

# Ver variables de entorno
Get-ChildItem Env: | Where-Object { $_.Name -like "*DATABASE*" }
```

## 📝 Notas Importantes

1. **Siempre usar la variable de entorno explícita** cuando ejecutes comandos que necesiten acceso a la base de datos
2. **El archivo `.env` en la raíz** es necesario para que funcione correctamente
3. **PowerShell en Windows** no interpreta `\` para saltos de línea como Bash
4. **Docker debe estar corriendo** antes de ejecutar las migraciones o el servidor

## 🐛 Problemas Conocidos

### Bun no carga .env automáticamente
Cuando ejecutas scripts en subdirectorios (como `packages/db/src/migrate.ts`), Bun no carga el archivo `.env` de la raíz automáticamente. Debes pasar la variable de entorno explícitamente.

### Solución temporal vs permanente
**Temporal (actual):** Pasar `$env:DATABASE_URL` en cada comando

**Permanente (recomendado):** Modificar `packages/db/src/connection.ts` para cargar el .env:
```typescript
// Agregar al inicio del archivo
import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar .env desde la raíz del proyecto
config({ path: resolve(__dirname, '../../../.env') });
```

## 📚 Referencias

- [Documentación Bun](https://bun.sh/docs)
- [Documentación Elysia](https://elysiajs.com/)
- [Documentación Drizzle ORM](https://orm.drizzle.team/)
- [Hito 1: Identity](./docs/HITO_1_IDENTITY.md)
- [Hito 2: Chat Core](./docs/HITO_2_CHAT_CORE.md)
