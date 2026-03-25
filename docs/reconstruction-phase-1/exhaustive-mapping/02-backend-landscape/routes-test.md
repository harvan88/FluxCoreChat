---
id: "routes-test"
type: "backend-service"
status: "wip"
criticality: "medium"
location: "apps/api/src/routes/test.routes.ts"

# 🎯 SISTEMA DE CAPAS
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Auto-descubierto" }
  connections: { status: "pending", confidence: 0 }
  subsystem: { status: "pending", confidence: 0 }
  operations: { status: "pending", confidence: 0 }

evolution: { current_layer: 1, total_layers: 4, completion_percentage: 25 }
---

# 🤖 routes-test

Servicio/Ruta de Backend auto-detectado. 
**Ubicación Real:** `apps/api/src/routes/test.routes.ts`

## 🎯 Propósito
Módulo detectado en la Fase 1 de descubrimiento atómico. Requiere revisión de arquitectura.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './routes-test';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/routes/test', router);
```
