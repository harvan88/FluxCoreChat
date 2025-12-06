# Instrucciones de Prueba - FluxCore Hito 3

> Guía paso a paso para probar el sistema completo (Backend + Frontend)

---

## Requisitos Previos

### Software Necesario

1. **Bun** versión 1.2.x o superior
2. **PostgreSQL** 14 o superior
3. **Git** (para clonar el repositorio)
4. **Navegador web** moderno (Chrome, Firefox, Edge)

### Verificar Instalación

```powershell
# Verificar Bun
bun --version
# Esperado: 1.2.x

# Verificar PostgreSQL
psql --version
# Esperado: psql (PostgreSQL) 14.x o superior
```

---

## Paso 1: Preparar Base de Datos

### 1.1 Iniciar PostgreSQL

```powershell
# En Windows, verificar que el servicio esté corriendo
Get-Service -Name postgresql*
```

Si no está corriendo:
```powershell
# Iniciar servicio PostgreSQL
Start-Service -Name postgresql*
```

### 1.2 Crear Base de Datos

```powershell
# Conectarse a PostgreSQL
psql -U postgres

# En la consola de PostgreSQL:
CREATE DATABASE fluxcore;
\q
```

---

## Paso 2: Configurar el Proyecto

### 2.1 Clonar Repositorio (si es necesario)

```powershell
git clone https://github.com/harvan88/FluxCoreChat.git
cd FluxCoreChat
```

### 2.2 Instalar Dependencias

```powershell
# Instalar todas las dependencias del monorepo
bun install
```

### 2.3 Configurar Variables de Entorno

```powershell
# Copiar archivo de ejemplo
Copy-Item apps\api\.env.example apps\api\.env
```

Editar `apps\api\.env` con:
```env
DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/fluxcore
JWT_SECRET=tu-secreto-super-seguro-aqui-12345
PORT=3000
```

### 2.4 Aplicar Migraciones de Base de Datos

```powershell
# Desde la raíz del proyecto
bun run packages/db/src/migrate.ts
```

---

## Paso 3: Iniciar el Backend

### 3.1 Abrir Terminal para Backend

```powershell
# Navegar a la carpeta de la API
cd apps/api

# Iniciar servidor de desarrollo
bun run dev
```

### 3.2 Verificar Backend

Deberías ver:
```
🚀 FluxCore API running at http://localhost:3000
📚 Swagger docs at http://localhost:3000/swagger
🔌 WebSocket at ws://localhost:3000/ws
```

### 3.3 Probar Endpoint de Salud

En otra terminal:
```powershell
curl http://localhost:3000/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": "2025-12-06T...",
  "service": "fluxcore-api",
  "version": "0.1.0"
}
```

---

## Paso 4: Ejecutar Pruebas Automatizadas del Backend

### 4.1 Pruebas HTTP (8 pruebas)

```powershell
# Desde la raíz del proyecto
bun run apps/api/src/test-chat.ts
```

Resultado esperado:
```
✅ Passed: 8
❌ Failed: 0
📈 Total: 8
🎉 All tests passed!
```

### 4.2 Pruebas WebSocket (6 pruebas)

```powershell
bun run apps/api/src/test-websocket.ts
```

Resultado esperado:
```
✅ Passed: 6
❌ Failed: 0
📈 Total: 6
🎉 All WebSocket tests passed!
```

---

## Paso 5: Iniciar el Frontend

### 5.1 Abrir Nueva Terminal

```powershell
# Navegar a la carpeta web
cd apps/web

# Iniciar servidor de desarrollo
bun run dev
```

### 5.2 Verificar Frontend

El servidor iniciará en:
```
http://localhost:5173
```

---

## Paso 6: Probar la Aplicación Web

### 6.1 Abrir en Navegador

Navegar a: **http://localhost:5173**

Deberías ver la página de Login/Registro.

### 6.2 Registrar Usuario

1. En la página de login, hacer clic en **"¿No tienes cuenta? Regístrate"**
2. Completar el formulario:
   - **Nombre**: Tu Nombre
   - **Correo**: test@example.com
   - **Contraseña**: password123
3. Hacer clic en **"Crear Cuenta"**

### 6.3 Verificar Dashboard

Después del registro exitoso, deberías ver:
- **ActivityBar** a la izquierda (barra de iconos)
- **Sidebar** con lista de conversaciones
- **ViewPort** con mensaje de bienvenida

### 6.4 Navegar por la Interfaz

1. **Icono de Mensajes** (💬): Ver conversaciones
2. **Icono de Usuarios** (👥): Ver contactos
3. **Icono de Configuración** (⚙️): Ver panel de configuración
4. **Icono de Logout** (🚪): Cerrar sesión

### 6.5 Probar Chat (con datos mock)

1. Hacer clic en una conversación de la lista
2. Escribir un mensaje en el campo de texto
3. Presionar Enter o hacer clic en el botón de enviar
4. El mensaje aparecerá en el chat

---

## Paso 7: Probar Swagger UI

### 7.1 Abrir Swagger

Navegar a: **http://localhost:3000/swagger**

### 7.2 Probar Endpoints

1. Expandir sección **Auth**
2. Hacer clic en **POST /auth/register**
3. Hacer clic en **Try it out**
4. Ingresar datos de prueba:
   ```json
   {
     "email": "swagger@test.com",
     "password": "test123",
     "name": "Swagger User"
   }
   ```
5. Hacer clic en **Execute**
6. Verificar respuesta exitosa (código 200)

---

## Paso 8: Probar WebSocket (Avanzado)

### 8.1 Abrir Consola del Navegador

En Chrome/Firefox, presionar F12 y ir a la pestaña Console.

### 8.2 Conectar WebSocket

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
    console.log('✅ Conectado a WebSocket');
};

ws.onmessage = (event) => {
    console.log('📥 Mensaje:', JSON.parse(event.data));
};

// Enviar ping
ws.send(JSON.stringify({ type: 'ping' }));
```

### 8.3 Verificar Respuesta

Deberías ver en la consola:
```
✅ Conectado a WebSocket
📥 Mensaje: {type: 'connected', timestamp: '...'}
📥 Mensaje: {type: 'pong', timestamp: '...'}
```

---

## Resumen de URLs

| Servicio | URL |
|----------|-----|
| Backend API | http://localhost:3000 |
| Swagger Docs | http://localhost:3000/swagger |
| WebSocket | ws://localhost:3000/ws |
| Frontend | http://localhost:5173 |
| Health Check | http://localhost:3000/health |

---

## Troubleshooting

### Error: "ECONNREFUSED" en Backend

**Causa**: PostgreSQL no está corriendo

**Solución**:
```powershell
Start-Service -Name postgresql*
```

### Error: "Unauthorized" en API

**Causa**: Token JWT inválido o expirado

**Solución**:
1. Cerrar sesión en el frontend
2. Iniciar sesión nuevamente
3. Obtener nuevo token

### Error: "Port already in use"

**Causa**: Otro proceso usando el puerto

**Solución**:
```powershell
# Matar proceso en puerto 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force

# Matar proceso en puerto 5173
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force
```

### Frontend no carga

**Causa**: Backend no está corriendo o CORS

**Solución**:
1. Verificar que backend esté en http://localhost:3000
2. Verificar health check funcione

---

## Verificación Final

### Checklist de Éxito

- [ ] PostgreSQL corriendo
- [ ] Backend iniciado (puerto 3000)
- [ ] Health check responde OK
- [ ] 8/8 pruebas HTTP pasando
- [ ] 6/6 pruebas WebSocket pasando
- [ ] Frontend iniciado (puerto 5173)
- [ ] Página de login visible
- [ ] Registro de usuario funciona
- [ ] Dashboard carga correctamente
- [ ] Navegación funciona
- [ ] Chat mock funciona
- [ ] Swagger accesible

---

**Última actualización**: 2025-12-06
