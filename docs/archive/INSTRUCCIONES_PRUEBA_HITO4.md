# Instrucciones de Prueba - Hito 4: Sistema de Extensiones

## Requisitos Previos

1. **PostgreSQL** corriendo
2. **Base de datos** `fluxcore` creada
3. **Migraciones** aplicadas (incluyendo extensiones)

---

## Paso 1: Preparar Base de Datos

### 1.1 Verificar PostgreSQL
```powershell
Get-Service -Name postgresql*
```

### 1.2 Aplicar Migración de Extensiones
```powershell
cd c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat
bun run packages/db/src/migrate-extensions.ts
```

**Resultado esperado:**
```
🔄 Running extension system migration...
✅ Migration completed successfully!
```

---

## Paso 2: Iniciar el Servidor

```powershell
cd apps/api
bun run src/index.ts
```

**Resultado esperado:**
```
🚀 FluxCore API running at http://localhost:3000
📚 Swagger docs at http://localhost:3000/swagger
```

---

## Paso 3: Ejecutar Pruebas Automatizadas

### 3.1 Pruebas de Chat (8 pruebas)
```powershell
bun run apps/api/src/test-chat.ts
```
**Esperado:** `✅ Passed: 8`

### 3.2 Pruebas de Extensiones (11 pruebas)
```powershell
bun run apps/api/src/test-extensions.ts
```
**Esperado:** `✅ Passed: 11`

---

## Paso 4: Pruebas Manuales con PowerShell

### 4.1 Registrar Usuario
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3000/auth/register" `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"test@ext.com","password":"test123","name":"Test"}'
$token = $response.data.token
$userId = $response.data.user.id
Write-Host "Token: $token"
```

### 4.2 Crear Cuenta
```powershell
$headers = @{ Authorization = "Bearer $token" }
$account = Invoke-RestMethod -Uri "http://localhost:3000/accounts" `
  -Method POST -Headers $headers -ContentType "application/json" `
  -Body '{"username":"exttest","displayName":"Extension Test","accountType":"personal"}'
$accountId = $account.data.id
Write-Host "Account ID: $accountId"
```

### 4.3 Listar Extensiones Disponibles
```powershell
$extensions = Invoke-RestMethod -Uri "http://localhost:3000/extensions" `
  -Method GET -Headers $headers
$extensions.data | ForEach-Object { Write-Host "- $($_.id): $($_.name)" }
```

### 4.4 Obtener Manifest de Extensión
```powershell
$manifest = Invoke-RestMethod -Uri "http://localhost:3000/extensions/manifest/%40fluxcore%2Ffluxcore" `
  -Method GET
Write-Host "Extension: $($manifest.data.name) v$($manifest.data.version)"
Write-Host "Permisos: $($manifest.data.permissions.Count)"
```

### 4.5 Instalar Extensión
```powershell
$install = Invoke-RestMethod -Uri "http://localhost:3000/extensions/install" `
  -Method POST -Headers $headers -ContentType "application/json" `
  -Body "{`"accountId`":`"$accountId`",`"extensionId`":`"@fluxcore/fluxcore`"}"
Write-Host "Instalada: $($install.data.extensionId)"
Write-Host "Habilitada: $($install.data.enabled)"
```

### 4.6 Listar Extensiones Instaladas
```powershell
$installed = Invoke-RestMethod -Uri "http://localhost:3000/extensions/installed/$accountId" `
  -Method GET -Headers $headers
$installed.data | ForEach-Object { Write-Host "- $($_.extensionId) (enabled: $($_.enabled))" }
```

### 4.7 Actualizar Configuración
```powershell
$extIdEncoded = [System.Web.HttpUtility]::UrlEncode("@fluxcore/fluxcore")
$update = Invoke-RestMethod `
  -Uri "http://localhost:3000/extensions/$accountId/$extIdEncoded" `
  -Method PATCH -Headers $headers -ContentType "application/json" `
  -Body '{"config":{"mode":"auto","responseDelay":60}}'
Write-Host "Config actualizada: mode=$($update.data.config.mode)"
```

### 4.8 Deshabilitar Extensión
```powershell
$disable = Invoke-RestMethod `
  -Uri "http://localhost:3000/extensions/$accountId/$extIdEncoded/disable" `
  -Method POST -Headers $headers
Write-Host "Habilitada: $($disable.data.enabled)"
```

### 4.9 Habilitar Extensión
```powershell
$enable = Invoke-RestMethod `
  -Uri "http://localhost:3000/extensions/$accountId/$extIdEncoded/enable" `
  -Method POST -Headers $headers
Write-Host "Habilitada: $($enable.data.enabled)"
```

### 4.10 Desinstalar Extensión
```powershell
$uninstall = Invoke-RestMethod `
  -Uri "http://localhost:3000/extensions/$accountId/$extIdEncoded" `
  -Method DELETE -Headers $headers
Write-Host "Desinstalada: $($uninstall.success)"
```

---

## Paso 5: Verificar en Swagger

1. Abrir: **http://localhost:3000/swagger**
2. Expandir sección **Extensions**
3. Probar endpoints directamente

---

## Resumen de Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /extensions | Listar disponibles |
| GET | /extensions/installed/:accountId | Listar instaladas |
| POST | /extensions/install | Instalar |
| DELETE | /extensions/:accountId/:extId | Desinstalar |
| PATCH | /extensions/:accountId/:extId | Actualizar config |
| POST | /extensions/:accountId/:extId/enable | Habilitar |
| POST | /extensions/:accountId/:extId/disable | Deshabilitar |
| GET | /extensions/manifest/:extId | Obtener manifest |

---

## Checklist de Verificación

- [ ] PostgreSQL corriendo
- [ ] Migración de extensiones aplicada
- [ ] Servidor iniciado (puerto 3000)
- [ ] 8/8 pruebas de chat pasando
- [ ] 11/11 pruebas de extensiones pasando
- [ ] Extensiones listadas en Swagger
- [ ] Instalar/desinstalar extensión funciona
- [ ] Configuración actualizable
- [ ] Habilitar/deshabilitar funciona

---

**Última actualización**: 2025-12-06
