---
id: "ScheduleEditor"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/schedule/ScheduleEditor.tsx"
---

# 🤖 ScheduleEditor

## 🎯 Propósito
Componente avanzado para la edición de horarios operativos. Proporciona una interfaz dual para gestionar tanto el horario semanal regular como las excepciones (feriados/eventos). Está diseñado para ser agnóstico del tipo de entidad (`ownerType`), permitiendo su uso para sedes, empleados o servicios.

## 💡 Ejemplo de Uso
```tsx
import { ScheduleEditor } from './components/schedule/ScheduleEditor';

<ScheduleEditor 
  ownerType="location"
  ownerId={locationId}
  onSave={() => notifySuccess()}
  onCancel={() => closeEditor()}
/>
```

## 🧩 Composición
El archivo contiene dos sub-componentes principales:
1. **WeeklyEditor**: Gestiona el estado operativo global (Abierto/Cerrado) y los intervalos de tiempo para los 7 días de la semana.
2. **SpecialEditor**: Gestiona una lista dinámica de fechas específicas que sobrescriben el horario semanal.

## 🔄 Flujos de Interacción
1. **Gestión de Drafts**: El componente utiliza un estado local de "borradores" (`drafts`) para permitir al usuario realizar múltiples cambios en intervalos y días antes de persistirlos definitivamente en la base de datos.
2. **Validación de Integridad**: El botón "Guardar" se deshabilita automáticamente si algún día marcado como "Abierto" no contiene al menos un intervalo de tiempo definido.
3. **Persistencia Transaccional**: Al guardar, el componente orquestra múltiples llamadas al `useSchedules` hook para actualizar tanto el estatus de la sede como los intervalos detallados.

## 🛡️ Notas Arquitectónicas
- **Desacoplamiento**: Se comunica con el backend exclusivamente a través del hook `useSchedules`, manteniendo la lógica de red fuera de la capa de presentación.
- **Formato de Tiempo**: Maneja internamente strings en formato `HH:mm` para compatibilidad con la base de datos Postgres (tipo `TIME`).
- **Polimorfismo**: Aunque actualmente se usa principalmente para `locations`, su estructura está lista para recibir cualquier `ownerId` de la plataforma.
