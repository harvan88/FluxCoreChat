---
id: "runtime-service"
type: "orchestration-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/fluxcore/runtime.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (Assistants, Instructions, VectorStores, Tools), Template Registry, Assistants Service, OpenAI Sync Service" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Ensamblador de Composición Cognitiva" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Assistant resolution, Composition reconstruction (Graph), Version pinning logic, Managed instruction expansion, Dynamic template context injection" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ RuntimeService

## 🎯 Propósito
Este servicio es el orquestador que reconstruye el "Mapa Mental" completo de un Asistente antes de su ejecución. Resuelve todas las referencias indirectas de la base de datos para entregar un objeto `AssistantComposition` listo para ser consumido por un motor de IA.

## 🧩 Composición Cognitiva (`AssistantComposition`)
Un asistente no es solo un prompt; es un grafo de dependencias que este servicio ensambla:
-   **Instrucciones**: Trae múltiples bloques ordenados, manejando el "Pinning" de versiones específicas si el usuario las congeló.
-   **Instrucciones Gestionadas**: Identifica bloques marcados como `isManaged` para expandirlos dinámicamente (ej: datos del perfil del negocio).
-   **Conocimiento (RAG)**: Lista los Vector Stores activos con sus modos de acceso.
-   **Herramientas (Functions)**: Resuelve las definiciones de herramientas y sus credenciales de conexión.

## 🚥 Inyección de Plantillas (New Feature)
El servicio detecta si el asistente tiene la herramienta `templates` activa. De ser así, invoca al `templateRegistryService` para inyectar un bloque de sistema prioritario que contiene la librería de plantillas autorizadas, asegurando que la IA siempre sepa qué contenidos oficiales puede disparar.

## 🛡️ Soberanía de Resolución
Implementa `resolveActiveAssistant`, que respeta el `Master Switch` de la cuenta:
-   Si hay un `preferredAssistantId` en el `RuntimeConfig`, lo prioriza.
-   Si no, asegura y retorna el asistente "Default" de la cuenta.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { runtimeService } from 'apps/api/src/services/fluxcore/runtime.service.ts';

// Ejemplo de invocación típica
const result = await runtimeService.execute(params);
```
