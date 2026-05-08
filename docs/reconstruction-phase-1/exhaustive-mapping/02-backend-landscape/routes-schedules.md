---
id: "schedules-routes"
type: "core"
status: "stable"
criticality: "medium"
location: "apps/api/src/routes/schedules.routes.ts"
---

# 🤖 Schedules Routes

## 🎯 Propósito
Expone la interfaz API para la gestión del Sistema Universal de Horarios. Permite a los clientes (Web, Mobile, Integraciones) consultar y modificar la disponibilidad operativa de diferentes entidades del sistema.

## 🚥 Endpoints

### 1. Obtener Horario Completo
`GET /schedules/:ownerType/:ownerId`
- **Resumen**: Recupera la configuración semanal y las excepciones de una entidad.
- **Respuesta**: `{ success: true, data: { weekly, intervals, special } }`

### 2. Actualizar Estado Semanal
`POST /schedules/:ownerType/:ownerId/weekly`
- **Body**: `{ days: [{ dayOfWeek: number, isClosed: boolean }] }`
- **Resumen**: Actualiza masivamente qué días de la semana la entidad está operativa.

### 3. Reemplazar Intervalos Diarios
`POST /schedules/:ownerType/:ownerId/weekly/:dayOfWeek/intervals`
- **Body**: `{ intervals: [{ openTime: string, closeTime: string }] }`
- **Resumen**: Borra y sobreescribe los bloques horarios para un día específico.

### 4. Gestionar Excepciones (Fechas Especiales)
`POST /schedules/:ownerType/:ownerId/special`
- **Body**: `{ date: string, isClosed: boolean, label?: string, intervals?: [...] }`
- **Resumen**: Crea o actualiza una excepción de fecha con sus propios intervalos.

`DELETE /schedules/special/:specialDateId`
- **Resumen**: Elimina una excepción de fecha y sus intervalos asociados.

## 🛡️ Seguridad
- **Middleware**: Todas las rutas requieren `authMiddleware` (JWT válido).
- **Validación**: Utiliza `Elysia.t` para la validación estricta del esquema de entrada (Body y Params).
