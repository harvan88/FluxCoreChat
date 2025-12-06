# Pruebas Manuales de FluxCore

> Instrucciones paso a paso para verificar el funcionamiento del sistema

## Prerrequisitos

1. **PostgreSQL** corriendo en localhost:5432
2. **Bun** instalado (versión 1.2.x)
3. **Migraciones** aplicadas

## Paso 1: Preparar el Entorno

```powershell
# 1.1 Clonar el repositorio (si no lo tienes)
git clone https://github.com/harvan88/FluxCoreChat.git
cd FluxCoreChat

# 1.2 Instalar dependencias
bun install

# 1.3 Configurar variables de entorno
# Editar apps/api/.env con:
# DATABASE_URL=postgresql://user:password@localhost:5432/fluxcore
# JWT_SECRET=tu-secreto-aqui

# 1.4 Aplicar migraciones
bun run packages/db/src/migrate.ts
```

## Paso 2: Iniciar el Servidor

```powershell
# 2.1 Navegar a la carpeta de la API
cd apps/api

# 2.2 Iniciar servidor (HTTP + WebSocket)
bun run dev
```

**Salida esperada:**
```
🚀 FluxCore API running at http://localhost:3000
📚 Swagger docs at http://localhost:3000/swagger
🔌 WebSocket at ws://localhost:3000/ws
```

## Paso 3: Verificar Health Check

```powershell
# 3.1 En otra terminal, verificar que el servidor esté corriendo
curl http://localhost:3000/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-06T...",
  "service": "fluxcore-api",
  "version": "0.1.0"
}
```

## Paso 4: Verificar Swagger

```powershell
# 4.1 Abrir en el navegador
start http://localhost:3000/swagger
```

Deberías ver la documentación interactiva de la API.

## Paso 5: Ejecutar Pruebas Automáticas HTTP

```powershell
# 5.1 Desde la raíz del proyecto
cd c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat

# 5.2 Ejecutar pruebas de chat
bun run apps/api/src/test-chat.ts
```

**Resultado esperado:**
```
✅ Passed: 8
❌ Failed: 0
📈 Total: 8
🎉 All tests passed!
```

## Paso 6: Ejecutar Pruebas Automáticas WebSocket

```powershell
# 6.1 Ejecutar pruebas de WebSocket
bun run apps/api/src/test-websocket.ts
```

**Resultado esperado:**
```
✅ Passed: 6
❌ Failed: 0
📈 Total: 6
🎉 All WebSocket tests passed!
```

## Paso 7: Prueba Manual de Autenticación

### 7.1 Registrar Usuario

```powershell
$body = @{
    email = "test@example.com"
    password = "password123"
    name = "Test User"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/auth/register" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body
```

### 7.2 Guardar el Token

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body (@{email="test@example.com";password="password123"} | ConvertTo-Json)

$token = $response.data.token
Write-Host "Token: $token"
```

## Paso 8: Prueba Manual de Cuentas

### 8.1 Crear Cuenta

```powershell
$accountBody = @{
    username = "testuser"
    displayName = "Test User Account"
    accountType = "personal"
} | ConvertTo-Json

$account = Invoke-RestMethod -Uri "http://localhost:3000/accounts" `
    -Method POST `
    -Headers @{
        "Content-Type"="application/json"
        "Authorization"="Bearer $token"
    } `
    -Body $accountBody

$accountId = $account.data.id
Write-Host "Account ID: $accountId"
```

### 8.2 Listar Cuentas

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/accounts" `
    -Method GET `
    -Headers @{"Authorization"="Bearer $token"}
```

## Paso 9: Prueba Manual de Relaciones

### 9.1 Crear Segunda Cuenta

```powershell
$account2Body = @{
    username = "testuser2"
    displayName = "Test User 2"
    accountType = "business"
} | ConvertTo-Json

$account2 = Invoke-RestMethod -Uri "http://localhost:3000/accounts" `
    -Method POST `
    -Headers @{
        "Content-Type"="application/json"
        "Authorization"="Bearer $token"
    } `
    -Body $account2Body

$account2Id = $account2.data.id
```

### 9.2 Crear Relación

```powershell
$relationshipBody = @{
    accountAId = $accountId
    accountBId = $account2Id
} | ConvertTo-Json

$relationship = Invoke-RestMethod -Uri "http://localhost:3000/relationships" `
    -Method POST `
    -Headers @{
        "Content-Type"="application/json"
        "Authorization"="Bearer $token"
    } `
    -Body $relationshipBody

$relationshipId = $relationship.data.id
Write-Host "Relationship ID: $relationshipId"
```

## Paso 10: Prueba Manual de Conversaciones

### 10.1 Crear Conversación

```powershell
$convBody = @{
    relationshipId = $relationshipId
    channel = "web"
} | ConvertTo-Json

$conversation = Invoke-RestMethod -Uri "http://localhost:3000/conversations" `
    -Method POST `
    -Headers @{
        "Content-Type"="application/json"
        "Authorization"="Bearer $token"
    } `
    -Body $convBody

$conversationId = $conversation.data.id
Write-Host "Conversation ID: $conversationId"
```

## Paso 11: Prueba Manual de Mensajes

### 11.1 Enviar Mensaje

```powershell
$messageBody = @{
    conversationId = $conversationId
    senderAccountId = $accountId
    content = @{
        text = "Hola, este es un mensaje de prueba!"
    }
    type = "outgoing"
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:3000/messages" `
    -Method POST `
    -Headers @{
        "Content-Type"="application/json"
        "Authorization"="Bearer $token"
    } `
    -Body $messageBody
```

### 11.2 Obtener Mensajes

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/conversations/$conversationId/messages" `
    -Method GET `
    -Headers @{"Authorization"="Bearer $token"}
```

## Paso 12: Prueba Manual de WebSocket

### 12.1 Usando el navegador

Abre la consola del navegador (F12) y ejecuta:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
    console.log('Connected!');
    ws.send(JSON.stringify({ type: 'ping' }));
};

ws.onmessage = (event) => {
    console.log('Received:', JSON.parse(event.data));
};

// Para suscribirse a una relación:
// ws.send(JSON.stringify({ type: 'subscribe', relationshipId: 'tu-id-aqui' }));
```

## Resumen de URLs

| Endpoint | URL |
|----------|-----|
| Health | http://localhost:3000/health |
| Swagger | http://localhost:3000/swagger |
| WebSocket | ws://localhost:3000/ws |
| Auth Register | POST http://localhost:3000/auth/register |
| Auth Login | POST http://localhost:3000/auth/login |
| Accounts | GET/POST http://localhost:3000/accounts |
| Relationships | GET/POST http://localhost:3000/relationships |
| Conversations | GET/POST http://localhost:3000/conversations |
| Messages | GET/POST http://localhost:3000/messages |

## Troubleshooting

### Error: "Connection refused"
- Verificar que el servidor esté corriendo
- Verificar que PostgreSQL esté corriendo
- Verificar el puerto 3000 no esté ocupado

### Error: "Unauthorized"
- Verificar que el token JWT sea válido
- Verificar que el header Authorization esté bien formado

### Error: "Database connection failed"
- Verificar DATABASE_URL en .env
- Verificar que PostgreSQL esté corriendo
- Verificar que la base de datos exista

### Error de migraciones
```powershell
# Regenerar migraciones
cd packages/db
bun run db:generate
bun run db:migrate
```

---

**Última actualización**: 2025-12-06
