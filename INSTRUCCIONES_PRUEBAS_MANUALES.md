# Instrucciones para Pruebas Manuales - FluxCore

## 🚀 Inicio Rápido

### 1. Iniciar el Servidor

```powershell
# Opción A: Desde la raíz del proyecto
cd c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat
bun run dev

# Opción B: Desde apps/api
cd apps/api
bun run src/index.ts
```

**Salida esperada:**
```
🚀 FluxCore API running at http://localhost:3000
```

### 2. Verificar que el Servidor Esté Corriendo

```powershell
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

## 📝 Pruebas de Autenticación (Hito 1)

### Test 1: Registrar Usuario

```powershell
$registerBody = @{
    email = "test@example.com"
    password = "password123"
    name = "Test User"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/auth/register" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $registerBody

$response | ConvertTo-Json
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-aqui",
      "email": "test@example.com",
      "name": "Test User"
    },
    "token": "jwt-token-aqui"
  }
}
```

**Guardar el token:**
```powershell
$token = $response.data.token
```

### Test 2: Login

```powershell
$loginBody = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $loginBody

$response | ConvertTo-Json
$token = $response.data.token
```

### Test 3: Crear Cuenta

```powershell
$accountBody = @{
    username = "testuser123"
    displayName = "Test User Account"
    accountType = "personal"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/accounts" `
    -Method POST `
    -Headers @{
        "Content-Type"="application/json"
        "Authorization"="Bearer $token"
    } `
    -Body $accountBody

$response | ConvertTo-Json
$accountId = $response.data.id
```

### Test 4: Listar Cuentas

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3000/accounts" `
    -Method GET `
    -Headers @{"Authorization"="Bearer $token"}

$response | ConvertTo-Json
```

## 💬 Pruebas de Chat (Hito 2)

### Test 5: Crear Segunda Cuenta

```powershell
$account2Body = @{
    username = "testuser456"
    displayName = "Test User 2"
    accountType = "business"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/accounts" `
    -Method POST `
    -Headers @{
        "Content-Type"="application/json"
        "Authorization"="Bearer $token"
    } `
    -Body $account2Body

$account2Id = $response.data.id
```

### Test 6: Crear Relación

```powershell
$relationshipBody = @{
    accountAId = $accountId
    accountBId = $account2Id
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/relationships" `
    -Method POST `
    -Headers @{
        "Content-Type"="application/json"
        "Authorization"="Bearer $token"
    } `
    -Body $relationshipBody

$relationshipId = $response.data.id
```

### Test 7: Agregar Contexto a la Relación

```powershell
$contextBody = @{
    authorAccountId = $accountId
    content = "Prefiere comunicación formal y profesional"
    type = "preference"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/relationships/$relationshipId/context" `
    -Method POST `
    -Headers @{
        "Content-Type"="application/json"
        "Authorization"="Bearer $token"
    } `
    -Body $contextBody

$response | ConvertTo-Json
```

### Test 8: Crear Conversación

```powershell
$conversationBody = @{
    relationshipId = $relationshipId
    channel = "web"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/conversations" `
    -Method POST `
    -Headers @{
        "Content-Type"="application/json"
        "Authorization"="Bearer $token"
    } `
    -Body $conversationBody

$conversationId = $response.data.id
```

### Test 9: Enviar Mensaje

```powershell
$messageBody = @{
    conversationId = $conversationId
    senderAccountId = $accountId
    content = @{
        text = "Hola, ¿cómo estás? Este es un mensaje de prueba."
    }
    type = "outgoing"
} | ConvertTo-Json -Depth 3

$response = Invoke-RestMethod -Uri "http://localhost:3000/messages" `
    -Method POST `
    -Headers @{
        "Content-Type"="application/json"
        "Authorization"="Bearer $token"
    } `
    -Body $messageBody

$response | ConvertTo-Json
```

### Test 10: Obtener Mensajes de la Conversación

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3000/conversations/$conversationId/messages" `
    -Method GET `
    -Headers @{"Authorization"="Bearer $token"}

$response | ConvertTo-Json
```

## 🔧 Script Completo de Pruebas

Guarda esto como `test-manual.ps1`:

```powershell
# Test Manual Completo de FluxCore

Write-Host "🧪 Iniciando Pruebas Manuales de FluxCore" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/health"
    Write-Host "✅ Servidor corriendo" -ForegroundColor Green
} catch {
    Write-Host "❌ Servidor no está corriendo" -ForegroundColor Red
    exit 1
}

# Test 2: Register
Write-Host "`nTest 2: Registrar Usuario" -ForegroundColor Yellow
$registerBody = @{
    email = "test$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
    password = "password123"
    name = "Test User"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/register" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $registerBody
    
    $token = $registerResponse.data.token
    $userId = $registerResponse.data.user.id
    Write-Host "✅ Usuario registrado: $($registerResponse.data.user.email)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al registrar: $_" -ForegroundColor Red
    exit 1
}

# Test 3: Create Account 1
Write-Host "`nTest 3: Crear Cuenta 1" -ForegroundColor Yellow
$account1Body = @{
    username = "user$(Get-Date -Format 'HHmmss')"
    displayName = "Test Account 1"
    accountType = "personal"
} | ConvertTo-Json

try {
    $account1Response = Invoke-RestMethod -Uri "http://localhost:3000/accounts" `
        -Method POST `
        -Headers @{
            "Content-Type"="application/json"
            "Authorization"="Bearer $token"
        } `
        -Body $account1Body
    
    $account1Id = $account1Response.data.id
    Write-Host "✅ Cuenta 1 creada: $($account1Response.data.username)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al crear cuenta 1: $_" -ForegroundColor Red
    exit 1
}

# Test 4: Create Account 2
Write-Host "`nTest 4: Crear Cuenta 2" -ForegroundColor Yellow
$account2Body = @{
    username = "user2$(Get-Date -Format 'HHmmss')"
    displayName = "Test Account 2"
    accountType = "business"
} | ConvertTo-Json

try {
    $account2Response = Invoke-RestMethod -Uri "http://localhost:3000/accounts" `
        -Method POST `
        -Headers @{
            "Content-Type"="application/json"
            "Authorization"="Bearer $token"
        } `
        -Body $account2Body
    
    $account2Id = $account2Response.data.id
    Write-Host "✅ Cuenta 2 creada: $($account2Response.data.username)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al crear cuenta 2: $_" -ForegroundColor Red
    exit 1
}

# Test 5: Create Relationship
Write-Host "`nTest 5: Crear Relación" -ForegroundColor Yellow
$relationshipBody = @{
    accountAId = $account1Id
    accountBId = $account2Id
} | ConvertTo-Json

try {
    $relationshipResponse = Invoke-RestMethod -Uri "http://localhost:3000/relationships" `
        -Method POST `
        -Headers @{
            "Content-Type"="application/json"
            "Authorization"="Bearer $token"
        } `
        -Body $relationshipBody
    
    $relationshipId = $relationshipResponse.data.id
    Write-Host "✅ Relación creada: $relationshipId" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al crear relación: $_" -ForegroundColor Red
    exit 1
}

# Test 6: Add Context
Write-Host "`nTest 6: Agregar Contexto" -ForegroundColor Yellow
$contextBody = @{
    authorAccountId = $account1Id
    content = "Prefiere comunicación formal"
    type = "preference"
} | ConvertTo-Json

try {
    $contextResponse = Invoke-RestMethod -Uri "http://localhost:3000/relationships/$relationshipId/context" `
        -Method POST `
        -Headers @{
            "Content-Type"="application/json"
            "Authorization"="Bearer $token"
        } `
        -Body $contextBody
    
    Write-Host "✅ Contexto agregado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al agregar contexto: $_" -ForegroundColor Red
}

# Test 7: Create Conversation
Write-Host "`nTest 7: Crear Conversación" -ForegroundColor Yellow
$conversationBody = @{
    relationshipId = $relationshipId
    channel = "web"
} | ConvertTo-Json

try {
    $conversationResponse = Invoke-RestMethod -Uri "http://localhost:3000/conversations" `
        -Method POST `
        -Headers @{
            "Content-Type"="application/json"
            "Authorization"="Bearer $token"
        } `
        -Body $conversationBody
    
    $conversationId = $conversationResponse.data.id
    Write-Host "✅ Conversación creada: $conversationId" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al crear conversación: $_" -ForegroundColor Red
    exit 1
}

# Test 8: Send Message
Write-Host "`nTest 8: Enviar Mensaje" -ForegroundColor Yellow
$messageBody = @{
    conversationId = $conversationId
    senderAccountId = $account1Id
    content = @{
        text = "Hola, este es un mensaje de prueba automático."
    }
    type = "outgoing"
} | ConvertTo-Json -Depth 3

try {
    $messageResponse = Invoke-RestMethod -Uri "http://localhost:3000/messages" `
        -Method POST `
        -Headers @{
            "Content-Type"="application/json"
            "Authorization"="Bearer $token"
        } `
        -Body $messageBody
    
    Write-Host "✅ Mensaje enviado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al enviar mensaje: $_" -ForegroundColor Red
}

# Test 9: Get Messages
Write-Host "`nTest 9: Obtener Mensajes" -ForegroundColor Yellow
try {
    $messagesResponse = Invoke-RestMethod -Uri "http://localhost:3000/conversations/$conversationId/messages" `
        -Method GET `
        -Headers @{"Authorization"="Bearer $token"}
    
    Write-Host "✅ Mensajes obtenidos: $($messagesResponse.data.Count) mensajes" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al obtener mensajes: $_" -ForegroundColor Red
}

Write-Host "`n🎉 Pruebas completadas!" -ForegroundColor Cyan
Write-Host "`nDatos de prueba:" -ForegroundColor Yellow
Write-Host "User ID: $userId"
Write-Host "Account 1 ID: $account1Id"
Write-Host "Account 2 ID: $account2Id"
Write-Host "Relationship ID: $relationshipId"
Write-Host "Conversation ID: $conversationId"
Write-Host "Token: $($token.Substring(0, 20))..."
```

## 🎯 Ejecutar el Script

```powershell
# Asegúrate de que el servidor esté corriendo
cd c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat
.\test-manual.ps1
```

## ⚠️ Problemas Conocidos

### 1. Error 401 Unauthorized en Rutas Protegidas

**Síntoma**: Las rutas de accounts, relationships, etc. retornan 401 incluso con token válido.

**Causa**: El macro `isAuthenticated` no funciona correctamente en Elysia 1.3.0.

**Solución Temporal**: Las rutas ya tienen verificación manual de `user`, pero puede haber problemas de tipos TypeScript.

### 2. Swagger No Disponible

**Síntoma**: `http://localhost:3000/swagger` retorna NOT_FOUND.

**Causa**: Swagger deshabilitado por incompatibilidad con Elysia 1.3.0.

**Solución**: Usar esta documentación manual o Postman/Insomnia.

### 3. WebSocket No Disponible

**Síntoma**: No se puede conectar a `ws://localhost:3000/ws`.

**Causa**: WebSocket deshabilitado por incompatibilidad.

**Solución**: Usar HTTP polling o esperar a que se resuelva la compatibilidad.

## 📚 Documentación Adicional

- `docs/HITO_1_IDENTITY.md` - Documentación completa de autenticación
- `docs/HITO_2_CHAT_CORE.md` - Documentación completa de chat
- `ESTADO_ACTUAL_Y_SOLUCION.md` - Estado actual y problemas conocidos

## 🆘 Soporte

Si encuentras problemas:
1. Verifica que PostgreSQL esté corriendo
2. Verifica que las migraciones estén aplicadas: `bun run packages/db/src/migrate.ts`
3. Verifica que el servidor esté corriendo: `curl http://localhost:3000/health`
4. Revisa los logs del servidor para errores

---

**Última actualización**: 2025-12-06
**Versión API**: 0.2.0
