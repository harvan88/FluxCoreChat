---
id: "schedule-service"
type: "core"
status: "needs_review"
criticality: "high"
location: "apps/api/src/services/schedule.service.ts"
---

# 🤖 ScheduleService

## 🎯 Propósito
Motor central para la gestión de horarios operativos universales en FluxCore. Implementa la lógica polimórfica que permite asociar calendarios semanales y excepciones de fechas a cualquier entidad (sedes, empleados, servicios) sin acoplamiento rígido en la base de datos.

## ⚙️ Arquitectura
El servicio opera sobre cuatro tablas principales (`weekly_schedules`, `weekly_intervals`, `special_dates`, `special_intervals`) utilizando el patrón `ownerType` + `ownerId` para identificar a la entidad propietaria del horario.

### Flujo de Datos
1. **Consulta de Horario (`getSchedule`)**: Recupera en una sola operación (paralelizada mediante `Promise.all`) el esquema semanal completo, todos los intervalos horarios y las excepciones de fechas con sus respectivos bloques de tiempo.
2. **Persistencia Transaccional**: Todas las operaciones de escritura (`upsertWeeklySchedule`, `replaceWeeklyIntervals`, `upsertSpecialDate`) se ejecutan dentro de transacciones de base de datos para garantizar la integridad entre las tablas de fechas e intervalos.

## 🧩 Métodos Principales
- `getSchedule(ownerType, ownerId)`: Obtiene el objeto de horario completo.
- `upsertWeeklySchedule(...)`: Actualiza el estado abierto/cerrado de los días de la semana.
- `replaceWeeklyIntervals(...)`: Reemplaza atómicamente los bloques horarios de un día específico.
- `upsertSpecialDate(...)`: Gestiona excepciones (feriados, cierres) y sus intervalos específicos.

## 🛡️ Reglas de Integridad
- **Cascada Manual**: El método `deleteSchedulesForOwner` garantiza la limpieza total de registros relacionados cuando una entidad (ej: una sede) es eliminada del sistema.
- **Validación de Intervalos**: Los intervalos deben ser validados en la capa de servicio para evitar solapamientos y asegurar que `openTime < closeTime`.

> [!IMPORTANT]
> **Duda Técnica / Pendiente**: El algoritmo `isBusinessOpen` y la caché Redis (Fase 3.1) aún no están implementados en esta versión del servicio.
