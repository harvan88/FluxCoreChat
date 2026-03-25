---
id: "fluxcore-service"
type: "orchestration-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/fluxcore.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "AssistantsService, VectorStoreService, RuntimeService, TemplateRegistry, ToolDefinitions" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Orquestador Maestro de la Composición Cognitiva" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Assistant resolution, Managed instruction generation, Tool connection management, Vector store synchronization, Composition aggregation" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ FluxcoreService

## 🎯 Propósito
El `FluxcoreService` es el núcleo de la arquitectura de FluxCore. Su responsabilidad es orquestar los cuatro pilares que forman un agente inteligente: **Asistentes** (quién es), **Instrucciones** (cómo se comporta), **Vector Stores** (qué sabe) y **Tools** (qué puede hacer).

## 🚥 La Composición Cognitiva
Este servicio agrupa todas las piezas para formar una "Composición". Cuando el sistema necesita procesar un mensaje, consulta a `FluxcoreService` para obtener el objeto completo que define al asistente activo del tenant, incluyendo sus permisos de acceso a bases de conocimiento y herramientas autorizadas.

## 🧬 Instrucciones Gestionadas (Managed)
Implementa el concepto de `isManaged` para instrucciones. Si una instrucción está marcada como gestionada, el servicio genera su contenido dinámicamente basándose en el perfil de la cuenta y configuraciones globales, asegurando consistencia de marca sin que el usuario tenga que escribir prompts desde cero.

## 🛠️ Ecosistema de Herramientas
Gestiona las "Conexiones de Herramientas" (`ToolConnections`). Asegura que las herramientas del sistema (como el envío de plantillas) estén siempre disponibles y configuradas correctamente para cada cuenta, manejando los estados de conexión y autorización.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { fluxcoreService } from 'apps/api/src/services/fluxcore.service.ts';

// Ejemplo de invocación típica
const result = await fluxcoreService.execute(params);
```
