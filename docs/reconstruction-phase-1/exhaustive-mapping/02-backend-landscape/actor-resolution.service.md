---
id: "actor-resolution-service"
type: "logic-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/fluxcore/actor-resolution.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (actors, addresses, actor_address_links, account_actor_contexts)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Identidad Ontológica y Resolución de Sujetos" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Physical address resolution, Heuristic matching (Email), Actor shell creation, Relationship context scoping, Actor merging (LinkActors)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ ActorResolutionService (Identity Core)

## 🎯 Propósito
Este servicio resuelve el dilema de "Quién es quién" en un sistema multicanal. Su responsabilidad es mapear direcciones físicas (un número de WhatsApp, un email de invitante, un ID de dispositivo) a un **Actor** global y único en el sistema.

## 🧩 Capas de Resolución
El proceso de resolución sigue tres capas de abstracción:
1.  **Capa Física (`fluxcore_addresses`)**: Identifica el canal (`driverId`) y el identificador externo (`externalId`). Si el par no existe, lo crea.
2.  **Capa Ontológica (`fluxcore_actor_address_links`)**: Vincula la dirección a un `actorId`.
    -   **Exact Match**: Si ya existe una relación previa.
    -   **Email Heuristic**: Si la nueva dirección es un email que ya pertenece a otro actor conocido (con confianza del 90%).
    -   **New Actor**: Crea una "célula" de identidad vacía si no hay coincidencias.
3.  **Capa Comercial (`fluxcore_account_actor_contexts`)**: Vincula al Actor con una Cuenta de negocio específica, permitiendo nombres y estados de relación diferenciados por cliente.

## 🔄 Fusión de Identidades (`linkActors`)
Cuando el sistema descubre que dos actores son en realidad la misma persona (p. ej., se autentica un visitante anónimo):
-   Mueve todos los links de direcciones del actor "perdedor" al "ganador".
-   Migra los contextos de relación entre cuentas.
-   Destruye el "shell" del actor duplicado para mantener la base de datos limpia.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { actorResolutionService } from 'apps/api/src/services/fluxcore/actor-resolution.service.ts';

// Ejemplo de invocación típica
const result = await actorResolutionService.execute(params);
```
