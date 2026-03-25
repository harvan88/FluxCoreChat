---
id: "kernel"
type: "kernel-core"
status: "ratified"
criticality: "critical"
location: "apps/api/src/core/kernel.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FluxCore Signals (Journal), RealityAdapters, Transactional Outbox, CoreEventBus" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Certificador Soberano de Realidad" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Ingestion Gates (Strict validation), HMAC signature verification, Deterministic Canonicalization & Fingerprinting, Journal atomicity, Outbox pattern, Idempotency (ExternalId/Fingerprint)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🏗️ FluxCore Kernel (The Sovereign)

## 🎯 Propósito
El `Kernel` es la pieza más sagrada de la arquitectura FluxCore. Actúa como el **Certificador Soberano de Realidad**. Su única función es recibir observaciones del mundo exterior (vía Adaptadores de Realidad) y certificar que esos hechos ocurrieron, persistíendolos en un log inmutable (Journal).

## 🚥 Las Puertas de Ingesta (Ingestion Gates)
Para que un hecho sea aceptado en la "Realidad Oficial", debe superar 5 puertas estrictas:
1.  **Clase de Hecho Físico**: El tipo debe estar dentro de la lista blanca permitida.
2.  **Registro de Adaptador**: El emisor debe ser un adaptador de realidad autorizado en la base de datos.
3.  **Clase de Adaptador**: Solo dispositivos `SENSOR` o `GATEWAY` pueden declarar hechos. Un `INTERPRETER` (IA) tiene prohibido certificar realidad física.
4.  **Coincidencia de Driver**: El driver declarado en la señal debe coincidir con el hardware del adaptador.
5.  **Verificación de Firma HMAC**: El adaptador debe firmar el contenido canónico usando su `signingSecret` privado. Si un solo bit del mensaje cambia o el secret es incorrecto, el Kernel rechaza el hecho.

## 🧬 Canonicidad y Huellas Digitales (Fingerprinting)
El Kernel utiliza una función `canonicalize` determinista para convertir objetos JSON en strings estables (ordenando llaves alfabéticamente). Con esto genera:
-   **Evidence Checksum**: SHA-256 del contenido crudo.
-   **Signal Fingerprint**: Una huella global única basada en el adaptador, el origen, el ID externo y el checksum. Esto garantiza que la misma observación enviada dos veces por error nunca se duplique en la realidad.

## 🛡️ Journal y Outbox Atómico
Toda ingesta exitosa ocurre dentro de una transacción ácida de PostgreSQL:
1.  Se escribe en `fluxcore_signals` (El Journal). Se le asigna un `sequence_number` inmutable.
2.  Se escribe en `fluxcore_outbox` (La Notificación).
Esta dualidad garantiza que cualquier hecho que sea "verdad" para el Kernel, sea eventualmente proyectado hacia el resto del sistema, sin excepciones.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: kernel
import { kernel } from 'apps/api/src/core/kernel.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await kernel.process(input);
```
