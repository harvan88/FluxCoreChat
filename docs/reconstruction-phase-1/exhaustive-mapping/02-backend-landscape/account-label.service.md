---
id: "account-label-service"
type: "logic-service"
status: "stable"
criticality: "low"
location: "apps/api/src/services/account-label.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (accounts)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Utilidad de Identificación Legible" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Name resolution with fallback, TTL Caching" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AccountLabelService

## 🎯 Propósito
Proporciona una forma rápida y eficiente de obtener un nombre legible (Label) para cualquier cuenta del sistema a partir de su ID. Es una utilidad fundamental para logs, interfaces administrativas y notificaciones donde mostrar un UUID crudo no es aceptable.

## 🛡️ Resolución con Fallbacks
Implementa una cadena de resolución robusta para garantizar que siempre haya un nombre que mostrar:
1.  **`displayName`**: Si la cuenta tiene un nombre configurado por el usuario.
2.  **`alias`**: Si no hay nombre, usa el alias de sistema.
3.  **`id.slice(0, 7)`**: Como último recurso, muestra los primeros 7 caracteres del UUID.

## ⚡ Caché de Alto Rendimiento
Para evitar miles de consultas repetitivas a la base de datos por el mismo nombre, el servicio mantiene un `Map` interno con una política de **TTL (Time To Live) de 5 minutos**. Esto balancea la frescura del dato (si el usuario cambia su nombre) con la velocidad de respuesta del sistema.

## 🚥 Manejo de Nulos
Si se solicita un label para un ID inexistente u vacío, retorna consistentemente el string `'unknown'`, previniendo errores de ejecución en componentes que esperan siempre un string.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { accountLabelService } from 'apps/api/src/services/account-label.service.ts';

// Ejemplo de invocación típica
const result = await accountLabelService.execute(params);
```
