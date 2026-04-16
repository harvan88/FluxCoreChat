---
id: "documentation-quality-service"
type: "core"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/fluxcore/documentation-quality.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-04-08", confidence: 100, notes: "FileSystem, gray-matter, escaneo de fuentes frontend/backend y snapshot documental" }
  subsystem: { status: "complete", completed_date: "2026-04-08", confidence: 100, notes: "Motor SSOT de validación, cobertura y limpieza documental" }
  operations: { status: "complete", completed_date: "2026-04-08", confidence: 100, notes: "Scans recursivos, scoring por tiers, auto-purga de huérfanos, snapshot y build mecánico de conexiones" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ DocumentationQualityService

## 🎯 Propósito
`DocumentationQualityService` es el backend que convierte la documentación en una herramienta operativa y no en texto estático. Lee el código real, valida `exhaustive-mapping/` contra ese código, elimina inconsistencias huérfanas y produce las métricas consumidas por `DocumentationQualityPanel`.

## 🏗️ Arquitectura
El servicio opera sobre tres fuentes de verdad complementarias:

1. **Código frontend**
   - escanea `apps/web/src` para detectar componentes React `.tsx` reales.
   - excluye ruido técnico y superficies retiradas que ya no forman parte del paisaje oficial.

2. **Código backend**
   - escanea `apps/api/src` para detectar rutas/servicios/core reales.
   - ignora scripts, tests y artefactos no arquitectónicos.

3. **Documentación oficial**
   - lee únicamente `docs/reconstruction-phase-1/exhaustive-mapping/`.
   - parsea frontmatter con `gray-matter` y valida el contenido según `00-STANDARD.md`.

## 🔗 Dependencias
- **Depende de:** `fs`, `path`, `gray-matter` y el estándar documental de `exhaustive-mapping`.
- **Es usado por:** `documentation-quality.routes.ts`, `DocumentationQualityPanel` y el proceso de generación del snapshot documental.

## 🔄 Flujos de Operación
1. **Cálculo de métricas (`getQualityMetrics`)**
   - recolecta markdowns oficiales.
   - valida cada documento y compara cobertura contra frontend/backend reales.
   - calcula score, confidence index, huérfanos, warnings y validación matemática.

2. **Auto-limpieza de huérfanos**
   - cuando detecta documentos cuyo `location` ya no existe, ejecuta `cleanupOrphans(...)`.
   - luego re-ejecuta las métricas para devolver un estado limpio.

3. **Snapshot documental**
   - `updateDocumentationSnapshot(...)` actualiza el snapshot usado como contexto operativo para IA.

4. **Capa 2 mecánica**
   - `buildLayer2Connections()` lee importaciones y actualiza la capa de conexiones en los markdowns sin destruir el contenido existente.

## 📈 Sistema de Puntuación (Scoring)
- **Frontmatter**
  - exige `id`, `type`, `status` y `location`.
- **Tiers del estándar**
  - valida secciones mínimas según el tipo documental.
- **Consistencia semántica**
  - penaliza documentos con dudas técnicas marcados como `stable`.
- **Cobertura SSOT**
  - cruza documentos existentes con archivos reales detectados por scan.

## 🧮 Validación Matemática
Garantiza la veracidad del reporte comparando el paisaje documental contra el paisaje físico del código. El resultado se expone como `mathematicalValidation` para que la UI pueda marcar explícitamente si el inventario está íntegro o inconsistente.

## 💡 Ejemplo de Uso
```typescript
import { documentationQualityService } from 'apps/api/src/services/fluxcore/documentation-quality.service';

const metrics = await documentationQualityService.getQualityMetrics();
const layer2 = await documentationQualityService.buildLayer2Connections();
```
