---
id: "template-settings-service"
type: "logic-service"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/fluxcore/template-settings.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (templates, fluxcore_template_settings)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Extensión de Gobernanza de Plantillas para FluxCore" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "AI authorization management, Granular permission toggles (Name/Content/Instructions), Upsert with conflict handling" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ TemplateSettingsService

## 🎯 Propósito
Este servicio gestiona los metadatos de "Inteligencia" de las plantillas de ChatCore. Es el responsable de decidir qué plantillas son visibles para la IA y qué instrucciones específicas debe seguir ésta para dispararlas.

## 🧩 Modelo de Datos Extendido
Mientras que `templates` vive en el núcleo, este servicio opera sobre `fluxcore_template_settings`:
-   **`authorizeForAI`**: El interruptor maestro de visibilidad para el LLM.
-   **`aiUsageInstructions`**: Texto en lenguaje natural que le explica al modelo cuándo es apropiado usar esta plantilla (p. ej., "Usar cuando el cliente pregunte por precios de estética").
-   **Permisos Granulares**: Controla si la IA puede ver el nombre técnico o el contenido completo de la plantilla para su análisis semántico.

## 🚥 Consultas Optimizadas
Implementa `getSettingsMap`, permitiendo obtener la configuración de IA de múltiples plantillas en un solo paso (batch), lo cual es crítico durante la fase de inyección de contexto de los runtimes para no penalizar la latencia del chat.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { templateSettingsService } from 'apps/api/src/services/fluxcore/template-settings.service.ts';

// Ejemplo de invocación típica
const result = await templateSettingsService.execute(params);
```
