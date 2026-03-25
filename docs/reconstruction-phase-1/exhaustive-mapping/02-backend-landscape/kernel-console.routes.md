---
id: "kernel-console-routes"
type: "api-routes"
status: "stable"
criticality: "high"
location: "apps/api/src/routes/kernel-console.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FluxCore Signals (DB), AuthMiddleware" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API de Exploración del Kernel (Harvan Console)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Harvan ID enforcement (Security), Signal search (type/namespace/keys), EvidenceRaw deep search (SQL ILIKE), Sequence-based ordering, Result pagination" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Kernel Console Routes

## 🎯 Propósito
La `Kernel Console Routes` es una API de acceso restringido diseñada exclusivamente para la depuración profunda del motor de realidad de FluxCore. Permite inspeccionar el flujo incesante de "Señales" que el Kernel procesa, permitiendo entender por qué un agente tomó una decisión específica o qué evidencia sustentó un hecho.

## 🚥 Seguridad de Programador (Hardcoded)
Debido a la sensibilidad de los datos expuestos (toda la realidad del sistema es visible), esta ruta implementa un control de acceso ultra-estricto:
-   **HARVAN_ACCOUNT_ID**: Solo la cuenta con el ID `3e94f74e...` puede llamar a estos endpoints.
-   **Rechazo Directo**: Cualquier otra cuenta, incluso administradores del sistema, reciben un error 403 (Forbidden).

## 🧬 Exploración de Señales (Signals)
Ofrece capacidades avanzadas de filtrado sobre la tabla `fluxcore_signals`:
-   **Filtros Estructurales**: Por `factType` o `sourceNamespace`.
-   **Búsqueda Semántica/Texto**: Permite buscar palabras clave no solo en las llaves (`sourceKey`, `subjectKey`), sino también dentro del JSON de evidencia (`evidenceRaw`) mediante cast SQL a texto.

## 🛡️ Trazabilidad de Secuencia
Los resultados se devuelven ordenados por `sequenceNumber` descendente, permitiendo al desarrollador ver los hechos más recientes que han ocurrido en el universo de FluxCore en tiempo real, facilitando la detección de bucles o fallos de lógica agéntica.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './kernel-console.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/kernel/console', router);
```
