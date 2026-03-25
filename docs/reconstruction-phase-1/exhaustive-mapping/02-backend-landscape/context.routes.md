---
id: "context-routes"
type: "api-routes"
status: "stable"
criticality: "high"
location: "apps/api/src/routes/context.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "RelationshipContextService, AuthMiddleware" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API de Gestión de Contexto Relacional" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Context entries CRUD (notes/rules), Perspective management (tags/saved names), Character limit tracking, Automated-use flagging" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Context Routes

## 🎯 Propósito
Las `Context Routes` gestionan la "memoria estructurada" de una relación. Permiten que los usuarios humanos y los sistemas de IA almacenen y recuperen información persistente sobre un contacto (como su nombre preferido, notas internas o reglas de atención específicas) que no depende de los mensajes efímeros del chat.

## 🚥 Gestión de Entradas
Permite un CRUD completo sobre las `entries` del contexto:
-   **Tipos**: Clasifica las notas como `note` (informativo), `preference` (deseos del cliente) o `rule` (instrucciones para la IA).
-   **Control de Automatización**: El flag `allowAutomatedUse` decide si esa información específica debe ser inyectada en el prompt del agente de IA.

## 🧬 Perspectiva de Relación
Además de los datos compartidos, gestiona la "perspectiva" (percepción) de un actor sobre otro:
-   **Saved Name**: Cómo el usuario ha decidido llamar al contacto en su libreta local.
-   **Tags**: Etiquetas organizativas (ej: "VIP", "Lead", "Soporte Técnico").
-   **Status**: Estado de la relación (activa, bloqueada o archivada).

## 🛡️ Límites de Almacenamiento
Expone el endpoint `/chars` para que el frontend pueda validar en tiempo real cuánto espacio de contexto queda disponible para una relación, previniendo el desbordamiento de tokens en futuras llamadas a modelos de lenguaje.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './context.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/context', router);
```
