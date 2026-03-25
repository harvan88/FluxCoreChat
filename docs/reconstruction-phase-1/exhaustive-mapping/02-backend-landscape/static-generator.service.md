---
id: "static-generator-service"
type: "logic-service"
status: "stable"
criticality: "low"
location: "apps/api/src/services/static-generator.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Extensions (Karen Website Builder)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Generador de Sitios Estáticos (Karen Facade)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Page generation export, Site structure definitions, Theme configuration types, Karen extension integration" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ StaticGeneratorService

## 🎯 Propósito
El `StaticGeneratorService` actúa como una fachada (facade) que expone las capacidades de generación de sitios web de la extensión **Karen** hacia el resto del backend de FluxCore. Permite la creación dinámica de páginas HTML y configuraciones de sitio basadas en datos del sistema.

## 🚥 Arquitectura de Re-exportación
Este servicio no implementa lógica propia en el directorio de servicios principal. En su lugar, utiliza un patrón de re-exportación limpio desde `../../../../extensions/Karen/src/static-generator.service`. Esto asegura que:
1.  La lógica pesada de construcción de sitios resida en su propia extensión modular.
2.  Los servicios del API principal puedan importar tipos e instancias sin conocer la ruta interna de la extensión.

## 🧬 Capacidades de Tipado
Expone los contratos fundamentales para el Website Builder:
-   **GeneratedPage**: Definición de una página individual (Rutas, SEO, Contenido).
-   **GeneratedSite**: Estructura completa de un sitio web.
-   **ThemeConfig**: Tokens de diseño (colores, fuentes) para la personalización visual.

## 🛡️ Modularidad
Al desacoplar el generador estático mediante esta fachada, FluxCore facilita la actualización independiente de la extensión "Karen" sin afectar la estabilidad de los servicios de mensajería o IA core que pudieran querer disparar la generación de un landing page automáticamente tras un flujo agéntico.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { staticGeneratorService } from 'apps/api/src/services/static-generator.service.ts';

// Ejemplo de invocación típica
const result = await staticGeneratorService.execute(params);
```
