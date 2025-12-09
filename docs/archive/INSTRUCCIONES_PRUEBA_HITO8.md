# Instrucciones de Prueba - Hito 8: Adaptadores (WhatsApp)

## Requisitos Previos

1. **PostgreSQL** corriendo con base de datos `fluxcore`
2. **Servidor** iniciado en puerto 3000
3. **(Opcional)** Credenciales de WhatsApp Business para pruebas reales

---

## Paso 1: Iniciar el Servidor

```powershell
cd c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat\apps\api
bun run src/index.ts
```

---

## Paso 2: Ejecutar Pruebas Automatizadas

### Script Unificado (67 pruebas)
```powershell
cd c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat
bun run scripts/run-tests.ts
```

**Resultado esperado:**
```
✅ Chat System               8/8
✅ Extension System          11/11
✅ AI Core                   12/12
✅ Context System            16/16
✅ Appointments              12/12
✅ Adapters                  8/8
   Total                     67/67
🎉 ¡Todas las pruebas pasaron!
```

### Solo Pruebas de Adapters
```powershell
bun run scripts/run-tests.ts adapt
```

---

## Paso 3: Pruebas Manuales con PowerShell

### 3.1 Verificar Estado de Adaptadores (Público)
```powershell
$status = Invoke-RestMethod -Uri "http://localhost:3000/adapters/status" -Method GET

Write-Host "Canales disponibles: $($status.data.channels -join ', ')"
Write-Host "WhatsApp configurado: $($status.data.configured.whatsapp)"
Write-Host "Telegram configurado: $($status.data.configured.telegram)"
```

### 3.2 Simular Verificación de Webhook
```powershell
$verifyToken = "fluxcore_verify"
$challenge = "test_challenge_123"

$response = Invoke-WebRequest `
  -Uri "http://localhost:3000/adapters/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=$verifyToken&hub.challenge=$challenge" `
  -Method GET

Write-Host "Challenge response: $($response.Content)"
# Debe retornar: test_challenge_123
```

### 3.3 Simular Mensaje Entrante de WhatsApp
```powershell
$webhookPayload = @{
  object = "whatsapp_business_account"
  entry = @(@{
    id = "123456789"
    changes = @(@{
      value = @{
        messaging_product = "whatsapp"
        metadata = @{
          display_phone_number = "1234567890"
          phone_number_id = "test_phone_id"
        }
        contacts = @(@{
          profile = @{ name = "Test User" }
          wa_id = "5491122334455"
        })
        messages = @(@{
          from = "5491122334455"
          id = "wamid.test123"
          timestamp = [math]::Floor((Get-Date -UFormat %s))
          type = "text"
          text = @{ body = "Hola desde WhatsApp!" }
        })
      }
      field = "messages"
    })
  })
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri "http://localhost:3000/adapters/whatsapp/webhook" `
  -Method POST -ContentType "application/json" -Body $webhookPayload

Write-Host "Webhook response: $response"
# Debe retornar: OK
```

### 3.4 Enviar Mensaje (requiere credenciales)
```powershell
# Primero registrar usuario
$reg = Invoke-RestMethod -Uri "http://localhost:3000/auth/register" `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"adapter@test.com","password":"test123","name":"Adapter Tester"}'

$token = $reg.data.token
$headers = @{ Authorization = "Bearer $token" }

# Intentar enviar mensaje
$sendPayload = @{
  to = "5491122334455"
  content = @{
    type = "text"
    text = "Test message from FluxCore"
  }
} | ConvertTo-Json

try {
  $response = Invoke-RestMethod -Uri "http://localhost:3000/adapters/whatsapp/send" `
    -Method POST -Headers $headers -ContentType "application/json" -Body $sendPayload
  Write-Host "Mensaje enviado: $($response.data.messageId)"
} catch {
  Write-Host "Error esperado (sin credenciales): $($_.Exception.Message)"
}
```

---

## Paso 4: Configurar WhatsApp (Producción)

### 4.1 Crear App en Meta
1. Ir a **developers.facebook.com**
2. Crear nueva app → Business → WhatsApp
3. Configurar producto WhatsApp Business

### 4.2 Obtener Credenciales
1. Phone Number ID: Copiar de WhatsApp → API Setup
2. Access Token: Generar token temporal o permanente
3. Webhook Verify Token: Definir uno propio

### 4.3 Configurar Variables de Entorno
```powershell
$env:WHATSAPP_PHONE_NUMBER_ID = "your_phone_number_id"
$env:WHATSAPP_ACCESS_TOKEN = "your_access_token"
$env:WHATSAPP_WEBHOOK_VERIFY_TOKEN = "fluxcore_verify"
```

### 4.4 Configurar Webhook en Meta
1. URL: `https://your-domain/adapters/whatsapp/webhook`
2. Verify Token: El mismo que configuraste
3. Suscribirse a: `messages`

---

## Paso 5: Verificar en Swagger

1. Abrir: **http://localhost:3000/swagger**
2. Expandir sección **Adapters**
3. Probar endpoints directamente

---

## Resumen de Endpoints

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | /adapters/status | No | Estado de adapters |
| GET | /adapters/whatsapp/webhook | No | Verificación webhook |
| POST | /adapters/whatsapp/webhook | No | Recibir mensajes |
| POST | /adapters/:channel/send | Sí | Enviar mensaje |
| GET | /adapters/:channel/status | Sí | Estado de adapter |

---

## Checklist de Verificación

- [ ] Servidor iniciado
- [ ] 67/67 pruebas pasando
- [ ] Endpoint /adapters/status accesible
- [ ] Webhook verification funciona
- [ ] Webhook POST procesa mensajes
- [ ] Endpoint de envío responde
- [ ] Documentación en Swagger visible

---

## Troubleshooting

### Error: Adapter not found
- El adapter no está configurado (faltan credenciales)
- Verificar variables de entorno

### Error: Webhook verification failed
- Verificar que `hub.verify_token` coincida con `WHATSAPP_WEBHOOK_VERIFY_TOKEN`

### Error al enviar mensaje
- Sin credenciales: esperado en desarrollo
- Con credenciales: verificar token y phone number ID

---

**Última actualización**: 2025-12-06
