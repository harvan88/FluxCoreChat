---
id: "actor-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/actor.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (actors)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Sistema de Trazabilidad de Actores (COR-004)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Actor registry, Multi-type lookup (account/user/ai/extension), Built-in actor retrieval, Display name management" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ ActorService

## 🎯 Propósito
El `ActorService` implementa el estándar `COR-004` para la trazabilidad completa de acciones en FluxCore. Su función es identificar de manera inequívoca "quién" es el autor de un mensaje o evento, diferenciando entre humanos, cuentas, extensiones y componentes internos de IA.

## 🚥 Tipología de Actores
-   **Account**: Representa a la cuenta en su totalidad (utilizado para mensajes automáticos del sistema).
-   **User**: El usuario humano autenticado.
-   **Built-in AI**: Componentes de inteligencia nativos de FluxCore.
-   **Extension**: Agentes o integraciones externas (ej: `@fluxcore/asistentes`).

## 🧬 Trazabilidad In-Process
Este servicio es fundamental para los logs y el Kernel, ya que permite que cada señal (`Signal`) lleve consigo el ID del actor, permitiendo depurar flujos complejos donde una extensión genera un mensaje en nombre de una cuenta.

## 🔄 Gestión de Existencia
Proporciona métodos "Get or Create" para asegurar que cada cuenta de nueva creación tenga siempre un actor asociado listo para ser referenciado en el bus de eventos y en la persistencia de mensajes.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { actorService } from 'apps/api/src/services/actor.service.ts';

// Ejemplo de invocación típica
const result = await actorService.execute(params);
```
