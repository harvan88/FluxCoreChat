# Instrucciones de Prueba - Hito 7: Sistema de Turnos

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

### Script Unificado (59 pruebas)
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
   Total                     59/59
🎉 ¡Todas las pruebas pasaron!
```

### Solo Pruebas de Appointments
```powershell
bun run scripts/run-tests.ts appt
```

---

## Paso 3: Pruebas Manuales con PowerShell

### 3.1 Preparar Datos
```powershell
# Registrar usuario
$reg = Invoke-RestMethod -Uri "http://localhost:3000/auth/register" `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"appttest@test.com","password":"test123","name":"Appointments Tester"}'

$token = $reg.data.token
$headers = @{ Authorization = "Bearer $token" }

# Crear cuenta de negocio
$business = Invoke-RestMethod -Uri "http://localhost:3000/accounts" `
  -Method POST -Headers $headers -ContentType "application/json" `
  -Body '{"username":"peluqueria123","displayName":"Peluquería Test","accountType":"business"}'
$businessId = $business.data.id

# Crear cuenta de cliente
$client = Invoke-RestMethod -Uri "http://localhost:3000/accounts" `
  -Method POST -Headers $headers -ContentType "application/json" `
  -Body '{"username":"cliente123","displayName":"Cliente Test","accountType":"personal"}'
$clientId = $client.data.id
```

### 3.2 Crear Servicio
```powershell
$service = Invoke-RestMethod -Uri "http://localhost:3000/appointments/$businessId/services" `
  -Method POST -Headers $headers -ContentType "application/json" `
  -Body '{"name":"Corte de pelo","description":"Corte clásico","duration":30,"price":5000}'

$serviceId = $service.data.id
Write-Host "Servicio creado: $($service.data.name)"
```

### 3.3 Listar Servicios
```powershell
$services = Invoke-RestMethod -Uri "http://localhost:3000/appointments/$businessId/services" `
  -Method GET -Headers $headers

Write-Host "Servicios: $($services.data.Count)"
```

### 3.4 Verificar Disponibilidad
```powershell
$tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
$avail = Invoke-RestMethod `
  -Uri "http://localhost:3000/appointments/$businessId/availability?date=$tomorrow&service=$serviceId" `
  -Method GET -Headers $headers

Write-Host "Disponible: $($avail.data.available)"
Write-Host "Slots: $($avail.data.slots.Count)"
```

### 3.5 Crear Turno
```powershell
$appt = Invoke-RestMethod -Uri "http://localhost:3000/appointments/$businessId" `
  -Method POST -Headers $headers -ContentType "application/json" `
  -Body "{`"clientAccountId`":`"$clientId`",`"serviceId`":`"$serviceId`",`"date`":`"$tomorrow`",`"time`":`"10:00`",`"notes`":`"Primera visita`"}"

$appointmentId = $appt.data.id
Write-Host "Turno creado: $appointmentId"
Write-Host "Estado: $($appt.data.status)"
```

### 3.6 Listar Turnos
```powershell
$appointments = Invoke-RestMethod -Uri "http://localhost:3000/appointments/$businessId" `
  -Method GET -Headers $headers

Write-Host "Turnos: $($appointments.data.Count)"
```

### 3.7 Ejecutar Tool (check_availability)
```powershell
$toolResult = Invoke-RestMethod `
  -Uri "http://localhost:3000/appointments/$businessId/tools/check_availability" `
  -Method POST -Headers $headers -ContentType "application/json" `
  -Body "{`"date`":`"$tomorrow`",`"service`":`"$serviceId`"}"

Write-Host "Tool result: $($toolResult.message)"
```

### 3.8 Cancelar Turno
```powershell
$cancel = Invoke-RestMethod `
  -Uri "http://localhost:3000/appointments/$businessId/$appointmentId" `
  -Method DELETE -Headers $headers -ContentType "application/json" `
  -Body '{"reason":"Test cancellation"}'

Write-Host "Estado: $($cancel.data.status)"
```

---

## Paso 4: Verificar en Swagger

1. Abrir: **http://localhost:3000/swagger**
2. Expandir sección **Appointments**
3. Probar endpoints directamente

---

## Resumen de Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /appointments/:accId/services | Listar servicios |
| POST | /appointments/:accId/services | Crear servicio |
| GET | /appointments/:accId/availability | Verificar disponibilidad |
| GET | /appointments/:accId | Listar turnos |
| POST | /appointments/:accId | Crear turno |
| DELETE | /appointments/:accId/:apptId | Cancelar turno |
| POST | /appointments/:accId/tools/:tool | Ejecutar tool IA |

---

## Checklist de Verificación

- [ ] Servidor iniciado
- [ ] 59/59 pruebas pasando
- [ ] Crear servicio funciona
- [ ] Verificar disponibilidad funciona
- [ ] Crear turno funciona
- [ ] Listar turnos funciona
- [ ] Cancelar turno funciona
- [ ] Tools de IA ejecutables

---

**Última actualización**: 2025-12-06
