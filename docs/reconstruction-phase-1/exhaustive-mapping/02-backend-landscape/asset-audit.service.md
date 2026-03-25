---
id: "asset-audit-service"
type: "infrastructure-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/asset-audit.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (assetAuditLogs)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Historial Inmutable de Archivos" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Append-only logging, Operation-specific methods (upload, download, security), Compliance report generation, IP/UserAgent tracking" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AssetAuditService

## 🎯 Propósito
El `AssetAuditService` es el responsable de mantener un registro inmutable y detallado de todas las interacciones con los archivos (Assets) del sistema. Es un componente crítico para el cumplimiento (compliance) y la seguridad, permitiendo reconstruir quién hizo qué y cuándo sobre cualquier documento.

## 🚥 Principio de Inmutabilidad
El servicio sigue una política estricta de **Solo Inserción (Append-only)**. No existen métodos para editar o eliminar registros de auditoría una vez creados, garantizando la integridad de la cadena de custodia de la información.

## 🧬 Eventos Auditados
Rastrea el ciclo de vida completo de un asset:
-   **Acceso**: Descargas, generación de URLs firmadas y denegaciones de acceso (`access_denied`).
-   **Integridad**: Checksums SHA256 tras subida exitosa y aplicaciones de deduplicación.
-   **Gestión**: Cambios de estado (ej: de `pending` a `active`), vinculaciones a entidades (mensajes, planes) y eliminaciones (`purged`).

## 📊 Reportes de Compliance
Proporciona capacidades para generar reportes agregados por cuenta y rango de fechas, facilitando la identificación de patrones de uso o intentos de acceso no autorizado mediante la consolidación de métricas de `accessDenied`, `uploads` y `downloads`.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { assetAuditService } from 'apps/api/src/services/asset-audit.service.ts';

// Ejemplo de invocación típica
const result = await assetAuditService.execute(params);
```
