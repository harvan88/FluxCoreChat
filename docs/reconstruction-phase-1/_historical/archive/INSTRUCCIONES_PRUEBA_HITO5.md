# Instrucciones de Prueba - Hito 5: @fluxcore/fluxcore

## Requisitos Previos

1. **PostgreSQL** corriendo con base de datos `fluxcore`
2. **Migraciones** aplicadas (Hito 4)
3. **(Opcional)** API Key de Groq para generación real de IA

---

## Paso 1: Configurar API Key de Groq (Opcional)

### 1.1 Obtener API Key
1. Ir a https://console.groq.com
2. Crear cuenta o iniciar sesión
3. Generar API Key

### 1.2 Configurar Variable de Entorno
```powershell
$env:GROQ_API_KEY = "gsk_your_api_key_here"
```

> **Nota**: Sin API Key, las pruebas funcionan pero no generan respuestas reales.

---

## Paso 2: Iniciar el Servidor

```powershell
cd c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat\apps\api
bun run src/index.ts
```

**Resultado esperado:**
```
🚀 FluxCore API running at http://localhost:3000
📚 Swagger docs at http://localhost:3000/swagger
```

---

## Paso 3: Ejecutar Pruebas Automatizadas

### 3.1 Script Unificado (Recomendado)
```powershell
cd c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat
bun run scripts/run-tests.ts
```

**Resultado esperado:**
```
✅ Chat System               8/8
✅ Extension System          11/11
✅ AI Core                   12/12
   Total                     31/31
🎉 ¡Todas las pruebas pasaron!
```

### 3.2 Solo Pruebas de IA
```powershell
bun run scripts/run-tests.ts ai
```

---

## Paso 4: Pruebas Manuales con PowerShell

### 4.1 Preparar Datos de Test
```powershell
# Registrar usuario
$reg = Invoke-RestMethod -Uri "http://localhost:3000/auth/register" `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"aitest@test.com","password":"test123","name":"AI Tester"}'

$token = $reg.data.token
$headers = @{ Authorization = "Bearer $token" }

# Crear cuenta
$acc = Invoke-RestMethod -Uri "http://localhost:3000/accounts" `
  -Method POST -Headers $headers -ContentType "application/json" `
  -Body '{"username":"aitester","displayName":"AI Tester","accountType":"personal"}'

$accountId = $acc.data.id

# Crear segunda cuenta
$acc2 = Invoke-RestMethod -Uri "http://localhost:3000/accounts" `
  -Method POST -Headers $headers -ContentType "application/json" `
  -Body '{"username":"aitester2","displayName":"AI Tester 2","accountType":"personal"}'

$accountId2 = $acc2.data.id

# Crear relación
$rel = Invoke-RestMethod -Uri "http://localhost:3000/relationships" `
  -Method POST -Headers $headers -ContentType "application/json" `
  -Body "{`"accountAId`":`"$accountId`",`"accountBId`":`"$accountId2`"}"

$relationshipId = $rel.data.id

# Crear conversación
$conv = Invoke-RestMethod -Uri "http://localhost:3000/conversations" `
  -Method POST -Headers $headers -ContentType "application/json" `
  -Body "{`"relationshipId`":`"$relationshipId`",`"channel`":`"web`"}"

$conversationId = $conv.data.id
```

### 4.2 Verificar Estado de IA
```powershell
$status = Invoke-RestMethod -Uri "http://localhost:3000/ai/status" `
  -Method GET -Headers $headers

Write-Host "Provider: $($status.data.provider)"
Write-Host "Model: $($status.data.model)"
Write-Host "Configured: $($status.data.configured)"
Write-Host "Connected: $($status.data.connected)"
```

### 4.3 Generar Sugerencia
```powershell
$suggestion = Invoke-RestMethod -Uri "http://localhost:3000/ai/generate" `
  -Method POST -Headers $headers -ContentType "application/json" `
  -Body "{`"conversationId`":`"$conversationId`",`"accountId`":`"$accountId`",`"message`":`"Hola, ¿cómo estás?`"}"

if ($suggestion.data) {
  Write-Host "Suggestion ID: $($suggestion.data.id)"
  Write-Host "Content: $($suggestion.data.content)"
  Write-Host "Model: $($suggestion.data.model)"
  Write-Host "Tokens: $($suggestion.data.usage.totalTokens)"
} else {
  Write-Host "No suggestion generated (API key may not be configured)"
}
```

### 4.4 Obtener Sugerencias Pendientes
```powershell
$pending = Invoke-RestMethod `
  -Uri "http://localhost:3000/ai/suggestions/$conversationId" `
  -Method GET -Headers $headers

Write-Host "Pending suggestions: $($pending.data.Count)"
```

### 4.5 Aprobar Sugerencia
```powershell
# Si tienes un suggestionId
$approved = Invoke-RestMethod `
  -Uri "http://localhost:3000/ai/suggestion/$suggestionId/approve" `
  -Method POST -Headers $headers

Write-Host "Status: $($approved.data.status)"
```

---

## Paso 5: Verificar en Swagger

1. Abrir: **http://localhost:3000/swagger**
2. Expandir sección **AI**
3. Probar endpoints directamente

---

## Resumen de Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /ai/status | Estado del servicio |
| POST | /ai/generate | Generar sugerencia |
| GET | /ai/suggestions/:convId | Sugerencias pendientes |
| GET | /ai/suggestion/:id | Obtener sugerencia |
| POST | /ai/suggestion/:id/approve | Aprobar |
| POST | /ai/suggestion/:id/reject | Rechazar |
| POST | /ai/suggestion/:id/edit | Editar y aprobar |

---

## Checklist de Verificación

- [ ] PostgreSQL corriendo
- [ ] Servidor iniciado (puerto 3000)
- [ ] 31/31 pruebas pasando (script unificado)
- [ ] Endpoint /ai/status responde
- [ ] Endpoints de sugerencias accesibles
- [ ] (Con API Key) Generación de IA funciona
- [ ] Documentación en Swagger visible

---

## Troubleshooting

### Error: "API key not configured"
- Configurar `GROQ_API_KEY` en variables de entorno
- Las pruebas siguen pasando sin API key

### Error: Puerto 3000 en uso
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### Error: Módulo no encontrado
```powershell
cd c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat
bun install
```

---

**Última actualización**: 2025-12-06
