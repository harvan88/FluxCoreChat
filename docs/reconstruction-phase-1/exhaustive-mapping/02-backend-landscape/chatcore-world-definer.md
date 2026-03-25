---
id: "chatcore-world-definer"
type: "kernel-logic"
status: "stable"
criticality: "high"
location: "apps/api/src/core/chatcore-world-definer.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Reality Adapters, MessageCore, Kernel" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Componente de Percepción y Definición de Mundo" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Channel resolution (Web/WA/TG), Source identification (Human/Sys/Adapter), Priority calculation, Routing policy definition (RequiresAI flag), Metadata normalization" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🏗️ ChatCore World Definer

## 🎯 Propósito
El `ChatCoreWorldDefiner` es la autoridad única que decide cómo FluxCore percibe un evento externo. Su función es transformar datos crudos de red (headers, user-agents, IPs) en un objeto estructurado de "Mundo" (`WorldContext`) que dictamina cómo debe ser procesada la información.

## 🚥 Resolución de Canal (Canonicidad)
Centraliza la lógica de detección para evitar hardcodeos en los adaptadores. Identifica:
-   **Canales Físicos**: Webchat (vía origin), WhatsApp/Telegram (vía driverId o headers).
-   **Canales Virtuales**: API, Internal (sistemas propios), Test (entornos de prueba).

## 🧬 Ontología de Origen y Prioridad
Define la naturaleza del emisor para prevenir bucles:
-   **Sources**: Distingue entre `human` (requiere atención), `system` (informativo), `adapter` (vía gateway externo) y `automated` (tareas programadas).
-   **Prioridades**: Asigna niveles (`low` a `urgent`) basándose en flags de emergencia o estatus premium del usuario, permitiendo que el sistema de colas priorice peticiones críticas.

## 🛡️ Políticas de Routing
Este componente inyecta la lógica de "Siguiente Paso":
-   **Requires AI**: Bandera que decide si el mensaje debe ser proyectado hacia el pipeline cognitivo o si es puramente administrativo.
-   **Skip Processing**: Permite descartar eventos de "ruido" antes de que lleguen al Kernel, ahorrando recursos de Journal.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: chatcore-world-definer
import { chatcoreWorldDefiner } from 'apps/api/src/core/chatcore-world-definer.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await chatcoreWorldDefiner.process(input);
```
