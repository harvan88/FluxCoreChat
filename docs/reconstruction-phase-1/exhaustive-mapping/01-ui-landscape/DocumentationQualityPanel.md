---
id: "documentation-quality-panel"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/monitor/DocumentationQualityPanel.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-04-08", confidence: 100, notes: "Consume `documentation/quality` y `documentation/build-layer-2` desde el backend FluxCore" }
  subsystem: { status: "complete", completed_date: "2026-04-08", confidence: 100, notes: "Superficie canónica de gobernanza documental dentro del monitoring activo" }
  operations: { status: "complete", completed_date: "2026-04-08", confidence: 100, notes: "Carga de métricas, discovery mecánico, build de conexiones y validación SSOT visible en UI" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 DocumentationQualityPanel

## 🎯 Propósito
`DocumentationQualityPanel` es la superficie oficial para evaluar la salud documental del sistema. Expone cobertura, integridad matemática, listas de documentos problemáticos y acciones mecánicas para mantener `exhaustive-mapping/` alineado con el código real.

## 📦 Estado y Datos
- `metrics: DocumentationMetrics | null`
  - snapshot vivo devuelto por `/api/fluxcore/documentation/quality`.
- `isLoading`, `error`
  - controlan estados de carga y fallo del dashboard.
- `forceRefresh`
  - fuerza recarga manual de métricas.
- `isDiscovering`
  - reutilizado para discovery y build de capa 2.
- `expandedSections`
  - controla el colapso de listas extensas de warnings, huérfanos e incidencias.

## 🔄 Flujos de Interacción
1. **Carga de métricas**
   - `loadMetrics()` consulta `/api/fluxcore/documentation/quality?t=<timestamp>` para evitar caché.
   - la respuesta alimenta score, cobertura, listas de warnings y validación matemática.

2. **Discovery mecánico**
   - `triggerDiscovery()` llama `/api/fluxcore/documentation/quality?forceDiscovery=true&t=<timestamp>`.
   - se usa para generar esqueletos documentales faltantes desde el backend.

3. **Build de capa 2**
   - `triggerLayer2Build()` ejecuta `POST /api/fluxcore/documentation/build-layer-2`.
   - después refresca las métricas para reflejar las conexiones detectadas.

4. **Operación diaria de auditoría**
   - la UI muestra integridad SSOT (`mathematicalValidation`), listas de huérfanos/no documentados y utilidades de copiado mediante `CopyButton`.
   - también puede abrir un reporte estático adicional desde `VALIDATION_REPORT.md`.

## 💡 Ejemplo de Uso
```tsx
import { DocumentationQualityPanel } from '../../components/monitor/DocumentationQualityPanel';

// Integrado mediante render dinámico del DynamicContainer.
{view === 'documentation' && <DocumentationQualityPanel />}
```
