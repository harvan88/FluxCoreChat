---
id: "openai-driver"
type: "api-driver"
status: "stable"
criticality: "high"
location: "apps/api/src/services/drivers/openai.driver.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "OpenAI API (Assistants v2), Vector Store Drivers" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Controlador de RAG en la Nube" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Vector Store CRUD, Multipart file upload (Assistants API), File unlinking/deletion, Header management (Beta: assistants=v2), ID canonicalization (File-ID as root)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 OpenAI Driver

## 🎯 Propósito
Este controlador es el encargado de interactuar con la API avanzada de OpenAI, específicamente con los servicios de **Assistants v2** y **Vector Stores**. Es la pieza clave que permite que FluxCore externalice la indexación y búsqueda semántica de documentos (RAG) en la infraestructura de OpenAI.

## 🚥 Gestión de Vector Stores
Implementa el ciclo de vida completo de los contenedores de conocimiento:
-   **Creación/Borrado**: Gestión de colecciones de documentos.
-   **Actualización**: Configuración de políticas de expiración automática de datos.

## 🧬 Protocolo de Subida Multipart
Para alimentar al RAG, el driver maneja un proceso de dos pasos transparente para el sistema:
1.  Sube el archivo físico al endpoint `/files` de OpenAI con el propósito `assistants`.
2.  Vincula el ID del archivo resultante al Vector Store correspondiente.
Utiliza `FormData` nativo de Bun/Node para el manejo eficiente de binarios.

## 🛡️ Canonicalización de Identificadores
Debido a la complejidad de la API de OpenAI (donde existen IDs de archivos y de vínculos de archivos), el driver impone el **FILE ID** (`file-xyz`) como el identificador único y universal dentro de FluxCore. Esto simplifica enormemente las tareas de borrado y auditoría, evitando confusiones entre la entidad de asociación y el recurso físico.

## 💡 Ejemplo de Uso
```typescript
// El adaptador/runtime se registra en el sistema
import { runtime } from 'apps/api/src/services/drivers/openai.driver.ts';

// Invocado por el RuntimeGateway según la configuración de cuenta
const actions = await runtime.handleMessage(runtimeInput);
```
