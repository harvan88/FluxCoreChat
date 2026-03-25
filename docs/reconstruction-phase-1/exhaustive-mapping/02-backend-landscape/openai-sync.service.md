---
id: "openai-sync-service"
type: "infrastructure-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/openai-sync.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "OpenAI SDK, AI Tool Service, Local DB (Reflect state)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Conector Soberano con OpenAI Assistants API" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Assistant/Thread/Run management, Vector Store sync, File physical deletion, Tool output submission, Exponential backoff polling" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ OpenAISyncService

## 🎯 Propósito
Este servicio es la implementación técnica de la integración con OpenAI. Sigue las reglas de soberanía donde OpenAI es la Fuente de Verdad para asistentes y archivos, y la base de datos local de FluxCore solo actúa como un reflejo para UI y métricas.

## 🚥 Flujo de Ejecución (Assistants V2)
-   **Threads & Runs**: Crea hilos de conversación efímeros en OpenAI, inyecta los mensajes y orquesta la ejecución (`Run`).
-   **Tool Execution**: Si el run requiere acción (`requires_action`), el servicio intercepta las llamadas, las ejecuta localmente en `aiToolService` y envía los resultados de vuelta a OpenAI para continuar la generación.
-   **Exponential Backoff Polling**: Implementa un mecanismo de espera inteligente mientras el asistente "piensa" en los servidores de OpenAI.

## 📂 Sincronización de Conocimiento
-   **Vector Stores**: Sincroniza nombres, estados de expiración y metadatos.
-   **Limpieza Física**: Asegura que cuando un archivo se borra en FluxCore, se borre físicamente de los servidores de OpenAI para cumplir con regulaciones de privacidad y evitar cargos por almacenamiento innecesario.

## 🛡️ Resiliencia
-   **Model Switching**: Facilita la transición entre modelos (mini vs grandes) manejando dinámicamente las capacidades de los asistentes (file_search, function calling).

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { openaiSyncService } from 'apps/api/src/services/openai-sync.service.ts';

// Ejemplo de invocación típica
const result = await openaiSyncService.execute(params);
```
