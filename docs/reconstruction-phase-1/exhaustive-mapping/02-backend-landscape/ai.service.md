---
id: "ai-service"
type: "orchestration-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/ai.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Asistentes Extension, ManifestLoader, AI Entitlements, Credits Service, Execution Plan, Branding Service, Suggestion Store, Trace Service, Context Service, Rate Limiter" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Orquestador Central de Capacidades Cognitivas" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Dynamic extension loading, Runtime service injection (RAG/Templates), WebSocket emission (ai:suggestion), Account config resolution, Connection probing (Groq/OpenAI), Suggestion lifecycle management" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AIService

## 🎯 Propósito
El `AIService` es el componente central que integra la inteligencia artificial en el flujo de trabajo de FluxCore. Su función principal es servir de puente entre el núcleo del sistema y la extensión de soberanía `@fluxcore/asistentes`, gestionando la carga dinámica de runtimes y la orquestación de sugerencias.

## 🚥 Carga de Runtime y Soberanía
-   **Inyección de Servicios**: Al cargar la extensión de asistentes, `AIService` inyecta servicios de "lado de servidor" (como `retrievalService` y `aiTemplateService`) para que la IA pueda realizar búsquedas RAG y enviar plantillas sin necesidad de realizar peticiones HTTP hacia sí misma (llamadas in-process).
-   **On-Demand Loading**: Utiliza `ManifestLoader` para encontrar el entrypoint de la extensión en el filesystem y realizar un `import()` dinámico, permitiendo que el sistema funcione incluso si la extensión de IA no está instalada o falla al cargar.

## 📡 Gestión de Sugerencias
-   **WebSocket Bridge**: Captura las sugerencias generadas por el runtime y las emite vía WebSockets (`ai:suggestion`) para que el frontend las muestre en tiempo real.
-   **Suggestion Lifecycle**: Centraliza las operaciones de `approve`, `reject` y `edit` delegando al `AISuggestionStore`.

## 🛡️ Configuración y Probing
-   **Hierarchical Config**: Resuelve la configuración efectiva sumando permisos (`Entitlements`), preferencias del usuario (`ExtensionInstallations`) y configuraciones específicas del asistente activo.
-   **Connectivity Probing**: Implementa métodos de "latido" para verificar la salud de los proveedores (Groq/OpenAI) y sus API keys, permitiendo reportar errores de conexión antes de que un usuario intente chatear.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { aiService } from 'apps/api/src/services/ai.service.ts';

// Ejemplo de invocación típica
const result = await aiService.execute(params);
```
