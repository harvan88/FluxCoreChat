---
id: "capability-offer.service"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/capability-offer.service.ts"
---

# 🤖 capability-offer.service

## 🎯 Propósito
Es el motor de decisión que determina qué capacidades específicas (`FluxCoreCapability`) se ofrecen a la IA en una solicitud de inferencia dada. Consolida la lógica de disponibilidad y autorización, asegurando que el asistente solo vea las herramientas que tiene permitido usar.

## 🏗️ Arquitectura
El servicio utiliza el `CapabilityRegistryService` para obtener todas las definiciones base y luego aplica filtros dinámicos basados en la `runtimeConfig` (configuración del asistente) y el `authorizedContext` (contexto del turno actual).

Divide las capacidades en dos tipos de ejecución:
- `inference_query`: Herramientas sincrónicas para obtener datos (RAG).
- `declarative_action`: Comandos que generan efectos (Envío de plantillas).

## 🧱 Dependencias
- **Depende de:** `capability-registry.service.ts`, `capability-translation.service.ts`.
- **Es usado por:** `cognitive-dispatcher.service.ts`, `runtime-input-factory.service.ts`.

## 💡 Ejemplo de Uso
```typescript
import { capabilityOfferService } from './services/capability-offer.service';

const offers = capabilityOfferService.resolveForExecution({
  runtimeConfig: assistant.config,
  authorizedContext: turnContext
});

// Devuelve solo las herramientas autorizadas (p.ej: ['search_knowledge', 'send_template'])
```
