---
id: "locations-routes"
type: "core"
status: "stable"
criticality: "medium"
location: "apps/api/src/routes/locations.routes.ts"
---

# 🤖 Locations Routes

## 🎯 Propósito
Interfaz API para la gestión de sedes físicas. Permite a las aplicaciones cliente listar, crear, actualizar y eliminar ubicaciones asociadas a una cuenta de negocio.

## 🚥 Endpoints

### 1. Listar Sedes de la Cuenta
`GET /locations`
- **Resumen**: Recupera todas las sedes vinculadas a la cuenta del usuario autenticado.
- **Respuesta**: `{ success: true, data: AccountLocation[] }`

### 2. Obtener Detalle de Sede
`GET /locations/:id`
- **Resumen**: Obtiene la información completa de una sede específica.

### 3. Crear Nueva Sede
`POST /locations`
- **Body**: `NewAccountLocation`
- **Resumen**: Registra una nueva sede. Gestiona automáticamente el flag `isDefault`.

### 4. Actualizar Sede
`PATCH /locations/:id`
- **Body**: `Partial<NewAccountLocation>`
- **Resumen**: Modifica datos de una sede existente.

### 5. Eliminar Sede
`DELETE /locations/:id`
- **Resumen**: Elimina la sede y limpia sus horarios asociados de forma atómica.

## 🛡️ Seguridad
- **Scope**: El usuario solo puede acceder y modificar sedes pertenecientes a su `accountId` actual.
- **Middleware**: Requiere `authMiddleware` activo.
