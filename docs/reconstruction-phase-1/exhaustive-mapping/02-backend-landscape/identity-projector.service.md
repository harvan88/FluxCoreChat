---
id: "identity-projector-service"
type: "projection-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/fluxcore/identity-projector.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Kernel (BaseProjector), Actor Resolution Service, Core Event Bus, Drizzle (signals, actors, addresses)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Proyector de Identidad Ontológica (RFC-0001)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Signal observation, Provisional actor creation (B1), Identity linking (B2), Authenticated actor resolution, Evidence parsing" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ IdentityProjector

## 🎯 Propósito
Este proyector es el responsable de traducir el stream de señales del Kernel en el estado persistente de los **Actores** del sistema. Es el encargado de procesar la procedencia física de las señales y resolver quién es el autor de cada hecho observado.

## 🚥 Lógica de Proyección
El proyector observa las señales en orden secuencial e invoca al `ActorResolutionService` según el origen:
1.  **Ruta Autenticada (`chatcore-gateway`)**: Resuelve actores para usuarios que ya tienen una cuenta en el sistema (`@fluxcore/internal`).
2.  **Ruta de Visitante (`chatcore-webchat-gateway`)**:
    -   **Señal `EXTERNAL_INPUT_OBSERVED` (B1)**: Crea un **Actor Provisional** si el `visitorToken` es nuevo.
    -   **Señal `CONNECTION_EVENT_OBSERVED` (B2)**: Registra el vínculo inmutable entre un actor provisional y una cuenta real en `fluxcore_actor_identity_links`.

## 🛡️ Determinismo e Idempotencia
Basándose en el Journal:
-   **Sin duplicados**: Utiliza `onConflictDoNothing` para asegurar que procesar la misma señal de vinculación dos veces no genere basura en la DB.
-   **Evidence Extraction**: Posee una lógica robusta de parseo de JSON para extraer `displayName`, `tenantId` y `visitorToken` de los campos crudos de evidencia de la señal.

## 📡 Sincronización
Al finalizar una proyección exitosa, emite el evento `identity:resolved` al bus de eventos del sistema, permitiendo que otros componentes (como el monitor en tiempo real) actualicen sus vistas instantáneamente.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { identityProjectorService } from 'apps/api/src/services/fluxcore/identity-projector.service.ts';

// Ejemplo de invocación típica
const result = await identityProjectorService.execute(params);
```
