# Instrucciones de Prueba - Hito 6: Contexto Relacional

## Requisitos Previos

1. **PostgreSQL** corriendo con base de datos `fluxcore`
2. **Servidor** iniciado en puerto 3000

---

## Paso 1: Iniciar el Servidor

```powershell
cd c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat\apps\api
bun run src/index.ts
```

---

## Paso 2: Ejecutar Pruebas Automatizadas

### Script Unificado (47 pruebas)
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
   Total                     47/47
🎉 ¡Todas las pruebas pasaron!
```

### Solo Pruebas de Contexto
```powershell
bun run scripts/run-tests.ts ctx
```

---

## Paso 3: Pruebas Manuales con PowerShell

### 3.1 Preparar Datos
```powershell
# Registrar usuario
$reg = Invoke-RestMethod -Uri "http://localhost:3000/auth/register" `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"ctxtest@test.com","password":"test123","name":"Context Tester"}'

$token = $reg.data.token
$headers = @{ Authorization = "Bearer $token" }

# Crear cuentas
$acc1 = Invoke-RestMethod -Uri "http://localhost:3000/accounts" `
  -Method POST -Headers $headers -ContentType "application/json" `
  -Body '{"username":"ctxuser1","displayName":"User 1","accountType":"personal"}'
$accountId = $acc1.data.id

$acc2 = Invoke-RestMethod -Uri "http://localhost:3000/accounts" `
  -Method POST -Headers $headers -ContentType "application/json" `
  -Body '{"username":"ctxuser2","displayName":"User 2","accountType":"personal"}'
$accountId2 = $acc2.data.id

# Crear relación
$rel = Invoke-RestMethod -Uri "http://localhost:3000/relationships" `
  -Method POST -Headers $headers -ContentType "application/json" `
  -Body "{`"accountAId`":`"$accountId`",`"accountBId`":`"$accountId2`"}"
$relationshipId = $rel.data.id
```

### 3.2 Agregar Entradas de Contexto
```powershell
# Agregar nota
Invoke-RestMethod -Uri "http://localhost:3000/context/$relationshipId/entries" `
  -Method POST -Headers $headers -ContentType "application/json" `
  -Body "{`"authorAccountId`":`"$accountId`",`"content`":`"Cliente VIP desde 2020`",`"type`":`"note`"}"

# Agregar preferencia
Invoke-RestMethod -Uri "http://localhost:3000/context/$relationshipId/entries" `
  -Method POST -Headers $headers -ContentType "application/json" `
  -Body "{`"authorAccountId`":`"$accountId`",`"content`":`"Prefiere WhatsApp`",`"type`":`"preference`"}"

# Agregar regla
Invoke-RestMethod -Uri "http://localhost:3000/context/$relationshipId/entries" `
  -Method POST -Headers $headers -ContentType "application/json" `
  -Body "{`"authorAccountId`":`"$accountId`",`"content`":`"Ofrecer 10% si cancela`",`"type`":`"rule`"}"
```

### 3.3 Obtener Contexto
```powershell
$ctx = Invoke-RestMethod -Uri "http://localhost:3000/context/$relationshipId" `
  -Method GET -Headers $headers

Write-Host "Entradas: $($ctx.data.entries.Count)"
Write-Host "Caracteres: $($ctx.data.charLimit.used)/$($ctx.data.charLimit.max)"

foreach ($entry in $ctx.data.entries) {
  Write-Host "  [$($entry.type)] $($entry.content)"
}
```

### 3.4 Actualizar Entrada
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/context/$relationshipId/entries/0" `
  -Method PATCH -Headers $headers -ContentType "application/json" `
  -Body '{"content":"Cliente VIP premium desde 2020"}'
```

### 3.5 Eliminar Entrada
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/context/$relationshipId/entries/2" `
  -Method DELETE -Headers $headers
```

### 3.6 Gestionar Perspectiva
```powershell
# Actualizar perspectiva
Invoke-RestMethod -Uri "http://localhost:3000/context/$relationshipId/perspective/$accountId" `
  -Method PATCH -Headers $headers -ContentType "application/json" `
  -Body '{"savedName":"Mi mejor cliente","tags":["vip","frecuente"]}'

# Obtener perspectiva
$persp = Invoke-RestMethod `
  -Uri "http://localhost:3000/context/$relationshipId/perspective/$accountId" `
  -Method GET -Headers $headers

Write-Host "Nombre guardado: $($persp.data.saved_name)"
Write-Host "Tags: $($persp.data.tags -join ', ')"
```

### 3.7 Verificar Límite de Caracteres
```powershell
$chars = Invoke-RestMethod -Uri "http://localhost:3000/context/$relationshipId/chars" `
  -Method GET -Headers $headers

Write-Host "Usados: $($chars.data.used)"
Write-Host "Disponibles: $($chars.data.available)"
Write-Host "Máximo: $($chars.data.max)"
```

---

## Paso 4: Verificar en Swagger

1. Abrir: **http://localhost:3000/swagger**
2. Expandir sección **Context**
3. Probar endpoints directamente

---

## Resumen de Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /context/:relId | Obtener contexto |
| POST | /context/:relId/entries | Agregar entrada |
| PATCH | /context/:relId/entries/:idx | Actualizar entrada |
| DELETE | /context/:relId/entries/:idx | Eliminar entrada |
| GET | /context/:relId/perspective/:accId | Obtener perspectiva |
| PATCH | /context/:relId/perspective/:accId | Actualizar perspectiva |
| GET | /context/:relId/chars | Ver límite de caracteres |

---

## Checklist de Verificación

- [ ] Servidor iniciado
- [ ] 47/47 pruebas pasando
- [ ] Agregar entradas funciona
- [ ] Actualizar entradas funciona
- [ ] Eliminar entradas funciona
- [ ] Límite de 2000 chars validado
- [ ] Perspectivas bilaterales funcionan
- [ ] Tags actualizables

---

**Última actualización**: 2025-12-06
