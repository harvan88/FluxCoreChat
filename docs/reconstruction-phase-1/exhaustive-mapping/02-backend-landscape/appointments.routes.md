---
id: "appointments-routes"
type: "backend-route"
status: "stable"
criticality: "medium"
location: "apps/api/src/routes/appointments.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Appointments Extension, Auth Middleware" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gateway de Gestión de Turnos y Citas" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Service listing/creation, Availability check, Appointment CRUD, AI Tool integration" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🚀 AppointmentsRoutes

## 🎯 Propósito
Expone la funcionalidad del sistema de gestión de turnos (Appointments) a través de la API REST. Este componente no implementa la lógica de negocio directamente, sino que actúa como un proxy hacia la **Extensión de Appointments**, inyectando el contexto de la cuenta de forma dinámica.

## 📅 Gestión de Agenda
- **Servicios:** Endpoints para definir qué tipos de citas se ofrecen (nombre, duración, precio).
- **Disponibilidad:** Consulta dinámica de huecos libres para una fecha y servicio específicos.
- **Turnos:** Flujo completo de reserva (Crear), visualización (Listar por cliente/fecha) y cancelación con motivo.

## 🤖 Integración con IA
- **`POST /tools/:toolName`**: Permite que el motor de IA de FluxCore invoque herramientas específicas de la agenda (ej: `book_appointment`, `list_free_slots`) directamente a través de esta ruta, permitiendo una experiencia de reserva conversacional.

## 🛠️ Arquitectura de Extensión
Utiliza `getAppointmentsExtension(accountId)` para instanciar el servicio correcto según el contexto de la solicitud. Esto permite que cada cuenta tenga su propia configuración de agenda independiente, manteniendo el aislamiento de los datos en la lógica de negocio.

## 🛡️ Seguridad
Todas las rutas están protegidas por el `authMiddleware`, garantizando que solo usuarios autenticados puedan operar sobre la agenda de una cuenta.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './appointments.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/appointments', router);
```
