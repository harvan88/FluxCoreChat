---
id: "reality-adapter-service"
type: "gateway-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/fluxcore/reality-adapter.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Kernel (Signal Ingestion), Message Core (ChatCore), HMAC Signatures" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Puente entre Drivers Externos y el Kernel (Ontología)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "External observation processing, Ontology mapping (Normalized -> Fact), Signal signing, ChatCore delegation, Receipt certification" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ RealityAdapterService

## 🎯 Propósito
Es el componente que "traduce" el mundo exterior sucio (mensajes de WhatsApp, eventos de red) al lenguaje sagrado del Kernel (Señales). Su responsabilidad es certificar que un hecho ha ocurrido y delegar su persistencia al sistema de mensajería.

## 🚥 Ciclo de Adaptación
1.  **Mapeo Ontológico**: Convierte un `NormalizedMessage` (proveniente de un driver) en un `PhysicalFactType`.
2.  **Construcción de Evidencia**: Captura el payload original ("La Verdad Cruda") y metadatos de procedencia (driver, cuenta).
3.  **Firma HMAC**: Firma digitalmente la señal usando el secreto autorizado para ese driver, garantizando que el Kernel acepte la ingesta.
4.  **Delegación a ChatCore**: Inyecta el mensaje en `messageCore` para que se guarde en la base de datos de "Realidad" y se certifique el estado de la conversación.

## 📡 Gestión de Recibos (Status)
A diferencia de los mensajes, los recibos de lectura/entrega (`NormalizedStatusEvent`) se certifican **directamente** ante el Kernel como `DELIVERY_SIGNAL_OBSERVED`, ya que son actualizaciones de estado de un hecho previo y no comunicaciones nuevas.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { realityAdapterService } from 'apps/api/src/services/fluxcore/reality-adapter.service.ts';

// Ejemplo de invocación típica
const result = await realityAdapterService.execute(params);
```
