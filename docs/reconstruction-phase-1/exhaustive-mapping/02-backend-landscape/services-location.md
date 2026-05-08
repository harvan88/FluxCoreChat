---
id: "location-service"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/location.service.ts"
---

# 🤖 LocationService

## 🎯 Propósito
Servicio encargado de la gestión del ciclo de vida de las sedes físicas (`account_locations`) de los negocios. Centraliza la lógica de CRUD, geolocalización básica y la coordinación con el sistema de horarios.

## ⚙️ Arquitectura
El servicio interactúa principalmente con la tabla `account_locations` y utiliza `scheduleService` para garantizar la limpieza de datos operacionales cuando una sede es eliminada.

### Responsabilidades
1. **Gestión de Sedes**: Creación, actualización y borrado de registros de ubicación.
2. **Soberanía de Sede Principal**: Implementa la lógica `unsetDefaultLocation` para asegurar que solo una sede esté marcada como predeterminada (`isDefault: true`) por cuenta.
3. **Integración de Horarios**: Al eliminar una sede, invoca automáticamente a `scheduleService.deleteSchedulesForOwner` para eliminar todos los calendarios asociados.

## 🧩 Métodos Principales
- `getLocationsByAccountId(accountId)`: Lista todas las sedes de una cuenta, priorizando la predeterminada.
- `createLocation(data)`: Crea una nueva sede y gestiona la exclusividad del flag `isDefault`.
- `updateLocation(locationId, accountId, data)`: Actualiza datos de la sede (dirección, coordenadas, estatus).
- `deleteLocation(locationId, accountId)`: Realiza un borrado limpio (Sede + Horarios).

## 🛡️ Notas de Implementación
- **Geolocalización**: El servicio persiste coordenadas `lat`/`lon` proporcionadas por el frontend. No realiza geocodificación en el servidor para optimizar costos de API.
- **Seguridad de Tenencia**: Todas las operaciones de actualización y borrado requieren el `accountId` para prevenir el acceso cruzado entre cuentas.
