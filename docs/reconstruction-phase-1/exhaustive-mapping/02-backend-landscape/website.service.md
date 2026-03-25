---
id: "website-service"
type: "logic-service"
status: "stable"
criticality: "low"
location: "apps/api/src/services/website.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Extensions (Karen Website Builder)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Sitios Web (Karen Facade)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Website CRUD export, Page management export, Params and Status types, Karen extension integration" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ WebsiteService

## 🎯 Propósito
El `WebsiteService` expone la lógica de gestión de sitios web de la extensión **Karen** hacia el API unificado de FluxCore. Permite a los usuarios y agentes administrar la estructura de sus sitios, crear páginas y configurar dominios.

## 🚥 Arquitectura Karen-Native
Al igual que el generador estático, este servicio actúa como una fachada que re-exporta la implementación real desde `../../../../extensions/Karen/src/website.service.ts`. Esto mantiene el core del API ligero y centraliza la lógica de "Site Builder" en su propio módulo funcional.

## 🧬 Operaciones de Gestión
Expone los métodos y tipos para:
-   **Create/Update Website**: Manejo de la configuración raíz del sitio (nombre, dominio).
-   **Page Management**: Adición y edición de páginas dentro de un sitio.
-   **Status Tracking**: Monitoreo del estado del sitio (Draft, Published, Archived).

## 🛡️ Compatibilidad
Esta fachada asegura que cualquier controlador de ruta (Route) o proceso interno que estuviera usando `websiteService` antes de la exportación a extensiones siga funcionando sin cambios en sus imports, preservando la estabilidad del sistema durante la modularización.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { websiteService } from 'apps/api/src/services/website.service.ts';

// Ejemplo de invocación típica
const result = await websiteService.execute(params);
```
