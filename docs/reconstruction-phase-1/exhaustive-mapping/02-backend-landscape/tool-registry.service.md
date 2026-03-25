---
id: "tool-registry-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/tool-registry.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "CognitiveDispatcher, LLMClient, Drizzle (indirectly via deps)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Registro Central de Herramientas (Canon §4.15)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tool offering logic based on account context, Centralized definition of LLM functions (search_knowledge, send_template), Execution delegation with dependency injection, Authorization checks" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ ToolRegistry

## 🎯 Propósito
Siguiendo el canon §4.15 sobre **Soberanía de Herramientas**, el `ToolRegistry` centraliza el catálogo de capacidades que los agentes de IA pueden ejecutar. Es el puente entre el razonamiento del LLM y las acciones pragmáticas en el backend de FluxCore.

## 🚥 Oferta Basada en Contexto
El registro no ofrece todas las herramientas a todos los agentes. Utiliza un `ToolOfferContext` para decidir dinámicamente:
-   Si el usuario tiene una base de conocimientos configurada, se ofrece `search_knowledge`.
-   Si el usuario tiene plantillas autorizadas, se ofrece `send_template`.
Esto reduce la confusión del modelo y optimiza el consumo de tokens de salida.

## 🧬 Desacoplamiento de Implementación
El servicio utiliza un patrón de **Inyección de Dependencias** (`ToolRegistryDeps`). Las definiciones de las herramientas (parámetros, nombres, descripciones) residen en el registro, pero la ejecución real (ej: realizar el RAG o enviar el mensaje) se delega a las funciones inyectadas desde los servicios core, manteniendo la lógica desacoplada y testorable.

## 🛡️ Validación de Autorización
Antes de ejecutar cualquier llamada a función proveniente de un LLM, el registro verifica mediante `isAuthorized` que el asistente efectivamente tenía permitido el acceso a esa capacidad en su contexto actual, previniendo ejecuciones accidentales o malintencionadas de herramientas no deseadas.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { toolRegistryService } from 'apps/api/src/services/tool-registry.service.ts';

// Ejemplo de invocación típica
const result = await toolRegistryService.execute(params);
```
