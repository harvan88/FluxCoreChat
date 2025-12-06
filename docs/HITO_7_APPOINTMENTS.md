# Hito 7: Extensión de Turnos (@fluxcore/appointments)

> **Estado**: ✅ Completado  
> **Fecha**: 2025-12-06

## Resumen

Implementación de la extensión de turnos/citas para FluxCore, permitiendo a negocios gestionar reservas con integración de IA mediante tools.

## Componentes Implementados

### Extensión @fluxcore/appointments

**Ubicación**: `extensions/appointments/`

```
extensions/appointments/
├── manifest.json              # Definición de la extensión
└── src/
    ├── index.ts               # Entry point
    ├── schema.ts              # Schema de BD (Drizzle)
    ├── appointments.service.ts # Lógica de negocio
    └── tools/
        └── index.ts           # Tools para IA
```

### Schema de Base de Datos

**Tablas creadas:**

| Tabla | Descripción |
|-------|-------------|
| `appointment_services` | Servicios ofrecidos |
| `appointment_staff` | Personal/empleados |
| `appointments` | Turnos/citas |

### Tools para IA

| Tool | Descripción |
|------|-------------|
| `check_availability` | Verifica disponibilidad de horarios |
| `create_appointment` | Crea un nuevo turno |
| `get_appointments` | Obtiene turnos de un cliente |
| `cancel_appointment` | Cancela un turno existente |

### API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /appointments/:accId/services | Listar servicios |
| POST | /appointments/:accId/services | Crear servicio |
| GET | /appointments/:accId/availability | Verificar disponibilidad |
| GET | /appointments/:accId | Listar turnos |
| POST | /appointments/:accId | Crear turno |
| DELETE | /appointments/:accId/:apptId | Cancelar turno |
| POST | /appointments/:accId/tools/:tool | Ejecutar tool IA |

## Flujo de Uso (según TOTEM.md)

```
1. Cliente: "Quiero turno mañana 3pm para corte"
2. IA detecta intención de turno
3. IA llama tool: check_availability("mañana 3pm", "corte")
4. Extensión consulta disponibilidad
5. Extensión retorna: "Disponible con Felipe o Marina"
6. IA responde: "Tengo disponible mañana 3pm con Felipe o Marina"
7. Cliente: "Con Felipe"
8. IA llama tool: create_appointment(...)
9. Extensión crea turno
10. IA confirma: "¡Listo! Turno confirmado"
```

## Configuración

```json
{
  "businessHours": {
    "monday": { "open": "09:00", "close": "18:00" },
    "tuesday": { "open": "09:00", "close": "18:00" },
    "wednesday": { "open": "09:00", "close": "18:00" },
    "thursday": { "open": "09:00", "close": "18:00" },
    "friday": { "open": "09:00", "close": "18:00" },
    "saturday": { "open": "09:00", "close": "13:00" },
    "sunday": null
  },
  "slotDuration": 30,
  "advanceBookingDays": 30,
  "cancellationHours": 24,
  "autoConfirm": false
}
```

## Estado de Pruebas

### Pruebas Automatizadas

| Suite | Pruebas | Estado |
|-------|---------|--------|
| Chat | 8/8 | ✅ |
| Extensions | 11/11 | ✅ |
| AI Core | 12/12 | ✅ |
| Context | 16/16 | ✅ |
| **Appointments** | **12/12** | ✅ |
| **Total** | **59/59** | ✅ |

### Tests de Appointments

1. Register User ✅
2. Create Business Account ✅
3. Create Client Account ✅
4. Create Service ✅
5. List Services ✅
6. Check Availability ✅
7. Create Appointment ✅
8. List Appointments ✅
9. Execute Tool: check_availability ✅
10. Execute Tool: get_appointments ✅
11. Cancel Appointment ✅
12. Verify Cancellation ✅

## Archivos Creados

### Extensión
- `extensions/appointments/manifest.json`
- `extensions/appointments/src/index.ts`
- `extensions/appointments/src/schema.ts`
- `extensions/appointments/src/appointments.service.ts`
- `extensions/appointments/src/tools/index.ts`

### API
- `apps/api/src/routes/appointments.routes.ts`
- `apps/api/src/test-appointments.ts`

### Migración
- `packages/db/src/migrations/005_appointments.sql`

## Uso

### Crear Servicio

```bash
curl -X POST http://localhost:3000/appointments/$ACCOUNT_ID/services \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Corte de pelo",
    "description": "Corte clásico o moderno",
    "duration": 30,
    "price": 5000
  }'
```

### Verificar Disponibilidad

```bash
curl "http://localhost:3000/appointments/$ACCOUNT_ID/availability?date=2025-12-10&service=$SERVICE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### Crear Turno

```bash
curl -X POST http://localhost:3000/appointments/$ACCOUNT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientAccountId": "uuid",
    "serviceId": "uuid",
    "date": "2025-12-10",
    "time": "10:00",
    "notes": "Primera visita"
  }'
```

### Ejecutar Tool vía API

```bash
curl -X POST http://localhost:3000/appointments/$ACCOUNT_ID/tools/check_availability \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-12-10",
    "service": "Corte de pelo"
  }'
```

## Próximos Pasos

1. **Hito 8**: Adaptadores (WhatsApp)
2. **Frontend**: Componentes de calendario
3. **Notificaciones**: Recordatorios de turnos
4. **Integración**: Conectar tools con extensión IA premium

---

**Última actualización**: 2025-12-06
