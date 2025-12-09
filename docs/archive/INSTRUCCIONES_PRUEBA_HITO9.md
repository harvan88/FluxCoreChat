# Instrucciones de Prueba - Hito 9: Workspaces Colaborativos

## Requisitos Previos

1. **PostgreSQL** corriendo con base de datos `fluxcore`
2. **Tablas de workspaces** creadas (ver migración abajo)
3. **Servidor** iniciado en puerto 3000

---

## Paso 0: Ejecutar Migración (si es necesario)

```powershell
cd c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat
$env:DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/fluxcore'
bun run packages/db/src/migrate-workspaces.ts
```

---

## Paso 1: Iniciar el Servidor

```powershell
cd c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat\apps\api
bun run src/index.ts
```

---

## Paso 2: Ejecutar Pruebas Automatizadas

### Script Unificado (83 pruebas)
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
✅ Workspaces                16/16
   Total                     83/83
🎉 ¡Todas las pruebas pasaron!
```

### Solo Pruebas de Workspaces
```powershell
bun run scripts/run-tests.ts ws
```

---

## Paso 3: Pruebas Manuales con PowerShell

### 3.1 Registrar Usuarios
```powershell
# Usuario 1 (Owner)
$owner = Invoke-RestMethod -Uri "http://localhost:3000/auth/register" `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"wsowner@test.com","password":"test123","name":"Workspace Owner"}'

$tokenOwner = $owner.data.token
$headersOwner = @{ Authorization = "Bearer $tokenOwner" }
$userId1 = $owner.data.user.id

# Usuario 2 (Member)
$member = Invoke-RestMethod -Uri "http://localhost:3000/auth/register" `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"wsmember@test.com","password":"test123","name":"Workspace Member"}'

$tokenMember = $member.data.token
$headersMember = @{ Authorization = "Bearer $tokenMember" }
$userId2 = $member.data.user.id
```

### 3.2 Crear Cuenta de Negocio
```powershell
$account = Invoke-RestMethod -Uri "http://localhost:3000/accounts" `
  -Method POST -Headers $headersOwner -ContentType "application/json" `
  -Body '{"username":"mybusiness","displayName":"My Business","accountType":"business"}'

$accountId = $account.data.id
Write-Host "Account ID: $accountId"
```

### 3.3 Crear Workspace
```powershell
$workspace = Invoke-RestMethod -Uri "http://localhost:3000/workspaces" `
  -Method POST -Headers $headersOwner -ContentType "application/json" `
  -Body "{`"accountId`":`"$accountId`",`"name`":`"Mi Equipo`",`"description`":`"Workspace de prueba`"}"

$workspaceId = $workspace.data.id
Write-Host "Workspace ID: $workspaceId"
```

### 3.4 Listar Workspaces del Usuario
```powershell
$workspaces = Invoke-RestMethod -Uri "http://localhost:3000/workspaces" `
  -Method GET -Headers $headersOwner

Write-Host "Workspaces: $($workspaces.data.Count)"
foreach ($ws in $workspaces.data) {
  Write-Host "  - $($ws.name) (rol: $($ws.role))"
}
```

### 3.5 Obtener Workspace por ID
```powershell
$ws = Invoke-RestMethod -Uri "http://localhost:3000/workspaces/$workspaceId" `
  -Method GET -Headers $headersOwner

Write-Host "Nombre: $($ws.data.name)"
Write-Host "Rol: $($ws.data.role)"
```

### 3.6 Agregar Miembro
```powershell
$newMember = Invoke-RestMethod -Uri "http://localhost:3000/workspaces/$workspaceId/members" `
  -Method POST -Headers $headersOwner -ContentType "application/json" `
  -Body "{`"userId`":`"$userId2`",`"role`":`"operator`"}"

Write-Host "Miembro agregado con rol: $($newMember.data.role)"
```

### 3.7 Listar Miembros
```powershell
$members = Invoke-RestMethod -Uri "http://localhost:3000/workspaces/$workspaceId/members" `
  -Method GET -Headers $headersOwner

Write-Host "Miembros: $($members.data.Count)"
foreach ($m in $members.data) {
  Write-Host "  - $($m.user.name) ($($m.role))"
}
```

### 3.8 Actualizar Rol de Miembro
```powershell
$updated = Invoke-RestMethod `
  -Uri "http://localhost:3000/workspaces/$workspaceId/members/$userId2" `
  -Method PATCH -Headers $headersOwner -ContentType "application/json" `
  -Body '{"role":"admin"}'

Write-Host "Nuevo rol: $($updated.data.role)"
```

### 3.9 Crear Invitación
```powershell
$invitation = Invoke-RestMethod `
  -Uri "http://localhost:3000/workspaces/$workspaceId/invitations" `
  -Method POST -Headers $headersOwner -ContentType "application/json" `
  -Body '{"email":"invited@test.com","role":"viewer"}'

Write-Host "Invitación creada: $($invitation.data.email)"
Write-Host "Token: $($invitation.data.token)"
```

### 3.10 Listar Invitaciones Pendientes
```powershell
$invitations = Invoke-RestMethod `
  -Uri "http://localhost:3000/workspaces/$workspaceId/invitations" `
  -Method GET -Headers $headersOwner

Write-Host "Invitaciones pendientes: $($invitations.data.Count)"
```

### 3.11 Remover Miembro
```powershell
$remove = Invoke-RestMethod `
  -Uri "http://localhost:3000/workspaces/$workspaceId/members/$userId2" `
  -Method DELETE -Headers $headersOwner

Write-Host "Miembro removido: $($remove.success)"
```

---

## Paso 4: Verificar en Swagger

1. Abrir: **http://localhost:3000/swagger**
2. Expandir sección **Workspaces**
3. Probar endpoints directamente

---

## Resumen de Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /workspaces | Listar workspaces |
| POST | /workspaces | Crear workspace |
| GET | /workspaces/:id | Obtener workspace |
| PATCH | /workspaces/:id | Actualizar workspace |
| DELETE | /workspaces/:id | Eliminar workspace |
| GET | /workspaces/:id/members | Listar miembros |
| POST | /workspaces/:id/members | Agregar miembro |
| PATCH | /workspaces/:id/members/:userId | Actualizar miembro |
| DELETE | /workspaces/:id/members/:userId | Remover miembro |
| GET | /workspaces/:id/invitations | Invitaciones |
| POST | /workspaces/:id/invitations | Crear invitación |
| DELETE | /workspaces/:id/invitations/:id | Cancelar |
| POST | /workspaces/invitations/:token/accept | Aceptar |

---

## Checklist de Verificación

- [ ] Migración de workspaces ejecutada
- [ ] Servidor iniciado
- [ ] 83/83 pruebas pasando
- [ ] Crear workspace funciona
- [ ] Agregar miembros funciona
- [ ] Cambiar roles funciona
- [ ] Remover miembros funciona
- [ ] Crear invitaciones funciona
- [ ] Verificación de permisos funciona

---

**Última actualización**: 2025-12-06
