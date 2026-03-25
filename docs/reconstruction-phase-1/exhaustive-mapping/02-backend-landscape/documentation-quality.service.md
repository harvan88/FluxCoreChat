---
id: "documentation-quality-service"
type: "logic-service"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/fluxcore/documentation-quality.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FileSystem (docs, src), Grey-matter (Parser), Static Analysis patterns" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Análisis y Aseguramiento de Calidad de Documentación" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Recursive scanning, Frontmatter validation, Tier-based scoring, Orphan detection, Auto-scaffolding (Genesis Layer 1), Mathematical validation (SSOT)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ DocumentationQualityService

## 🎯 Propósito
Este servicio es la herramienta de gobernanza que asegura que la documentación técnica de FluxCore sea precisa, completa y refleje la realidad del código. Proporciona las métricas que alimentan el "Panel de Calidad" en la interfaz administrativa.

## 🚥 Metodología de Análisis
El servicio realiza un escaneo asimétrico:
1.  **Escaneo de Código**: Identifica componentes React (.tsx) y servicios de Backend (.ts) reales en el árbol de fuentes.
2.  **Escaneo de Docs**: Lee todos los archivos `.md` en `docs/reconstruction-phase-1/exhaustive-mapping`.
3.  **Validación Cruzada (SSOT)**:
    -   **Cobertura**: ¿Qué porcentaje de archivos reales tienen un documento con un campo `location` que haga match?
    -   **Huérfanos (Orphans)**: Identifica documentos que apuntan a archivos que ya no existen.
    -   **Precisión**: Valida que si un documento tiene "Dudas Técnicas", su status no pueda ser `stable`.

## 📈 Sistema de Puntuación (Scoring)
Aplica reglas basadas en **Tiers de Documentación**:
-   **Frontmatter (20 pts)**: Presencia Obligatoria de `id`, `type`, `status` y `location`.
-   **Contenido Técnico (30 pts)**: Existencia de secciones de Propósito, Arquitectura y Dependencias según el tipo de componente.
-   **Ejemplos (10 pts)**: Presencia de bloques de código.
-   **Penalizaciones**: Resta puntos severos por inconsistencias (ej: dudas técnicas en un documento marcado como estable).

## 🚀 Génesis Automática (Auto-Scaffolding)
Para los componentes detectados que carecen de documentación, el servicio puede auto-generar archivos Markdown con:
-   Frontmatter prellenado (Capa 1: Discovery completada).
-   Ruta de ubicación correcta.
-   Template base siguiendo el estándar 00-STANDARD.

## 🧮 Validación Matemática
Garantiza la veracidad del reporte mediante una comprobación lógica: `Docs Totales = Unicos Documentados + No Documentados + Huérfanos`. Si el cálculo no cuadra, el servicio marca un error de integridad en el Snapshot.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { documentationQualityService } from 'apps/api/src/services/fluxcore/documentation-quality.service.ts';

// Ejemplo de invocación típica
const result = await documentationQualityService.execute(params);
```
