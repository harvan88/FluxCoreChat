# Reporte de Auditoría Física de Algoritmo de Ubicaciones

Fecha: 4/5/2026, 20:15:00

## Mapeo: Base de Datos vs. Frontend

Esta tabla define cómo cada columna de la base de datos se representa en la interfaz que el usuario utiliza.

| Columna en Base de Datos (DB) | Campo en Frontend (UI) | Función y Comportamiento |
| :--- | :--- | :--- |
| **`name`** | Input "Sede" | Nombre identificador (ej. "Dr. Jones - Sede A"). Pre-llenado automático. |
| **`address`** | Input "Dirección Completa" | La dirección legible que devuelve Google o que el usuario escribe. |
| **`country`** | Input "País" | Se llena automáticamente al seleccionar una búsqueda. |
| **`state`** | Input "Provincia" | Se llena automáticamente al seleccionar una búsqueda. |
| **`city`** | Input "Ciudad" | Se llena automáticamente al seleccionar una búsqueda. |
| **`neighborhood`** | Input "Barrio" | Se llena automáticamente al seleccionar una búsqueda. |
| **`streetAddress`** | Input "Calle y Altura" | **Crítico**: Almacena el nombre de la calle + número (ej. "Tacuarí 1040"). |
| **`postalCode`** | *Oculto / No asignado* | Actualmente no se muestra en el formulario principal. |
| **`lat`** / **`lon`** | Marcador de Mapa | Coordenadas técnicas. Se actualizan al arrastrar el Pin en el mapa. |
| **`isDefault`** | Checkbox "Principal" | Determina si es la sede central de la cuenta. |
| **`phone`** / **`email`** | *Pendiente* | Campos existentes en DB pero aún no integrados en este formulario. |
| **`status`** | *Interno* | Por defecto 'active'. Gestiona si la sede está abierta o cerrada. |
| **`serviceType`** | *Interno* | Define si la sede hace delivery, pickup o ambos (Default: 'both'). |

---

## Estructura Técnica de `account_locations`

**Esquema Completo:**
`id, accountId, name, address, country, state, city, neighborhood, streetAddress, postalCode, lat, lon, serviceType, coverageRadiusKm, phone, email, timezone, status, isDefault, metadata, createdAt, updatedAt`

### Notas para Orientación:
*   **Fuente de Verdad**: Al guardar, el sistema toma los valores de los Inputs de la tabla de arriba y los persiste directamente.
*   **Geolocalización**: El mapa es el responsable de "corregir" únicamente los campos `lat` y `lon` mediante el arrastre del marcador.
