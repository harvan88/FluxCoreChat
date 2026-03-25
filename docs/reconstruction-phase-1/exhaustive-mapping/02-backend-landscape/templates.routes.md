---
id: "templates-routes"
type: "api-routes"
status: "ratified"
criticality: "high"
location: "apps/api/src/routes/templates.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "TemplateService, TemplateSettingsService, AuthMiddleware" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestión de Plantillas Enriquecidas con IA" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Template CRUD, AI Settings enrichment (authorizeForAI), Variable-based rendering & execution, Asset linking (Slots), Enriched multi-table response" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Templates Routes

## 🎯 Propósito
La API de plantillas permite gestionar mensajes predefinidos que pueden ser usados tanto por humanos como por la IA de FluxCore. Se diferencia de una API de plantillas tradicional por su profunda integración con la capa cognitiva.

## 🚥 Enriquecimiento IA
Cada plantilla recuperada se mezcla con sus `FluxCoreTemplateSettings`:
-   **authorizeForAI**: Indica si la IA tiene permiso para usar esta plantilla por sí misma.
-   **aiUsageInstructions**: Guía específica para el LLM sobre cuándo y cómo aplicar esta plantilla.
-   **Presicion de Inclusión**: Flags para decidir si la IA debe ver el nombre, el contenido o las instrucciones internas de la plantilla en su prompt.

## 🧬 Ejecución y Renderizado
El endpoint `/execute` permite disparar una plantilla directamente:
1.  Recibe variables dinámicas (Record de strings).
2.  Renderiza el contenido final.
3.  Lo inyecta como un mensaje saliente en la conversación, marcándolo como generado por `human` pero basado en plantilla.

## 🛡️ Gestión de Assets y CoSlots
Soporta la vinculación de assets a través de "slots" dentro de la plantilla. Esto permite que una plantilla de "Folleto" tenga slots para el PDF actual o imágenes, facilitando que la IA adjunte los archivos correctos automáticamente al usar la respuesta predefinida.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './templates.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/templates', router);
```
