---
id: "template-registry-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/fluxcore/template-registry.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Template Settings Service, Drizzle (Templates)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Single Source of Truth para Inyección de Plantillas en IA" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Instruction block building (Markdown), Authorized template listing, Execution validation (canExecute), Legacy block stripping" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ TemplateRegistryService

## 🎯 Propósito
Este servicio centraliza la forma en que la IA visualiza y usa las plantillas de respuesta. Su objetivo es garantizar que tanto el runtime de OpenAI como el Local tengan exactamente la misma definición de qué plantillas están permitidas y cómo deben invocarse.

## 🚥 Generación de Catálogo (Markdown Table)
El método `buildInstructionBlock` construye dinámicamente una sección de prompt:
1.  **Librería de Intenciones**: Genera una tabla Markdown con `ID`, `Nombre`, `Instrucciones de Uso` y `Variables`.
2.  **Directiva Determinista**: Inyecta una regla estricta: si hay coincidencia, la IA debe responder **exclusivamente** con el comando `CALL_TEMPLATE:<id>`.
3.  **Sanitización**: Limpia caracteres conflictivos (como pipes `|`) para evitar romper la estructura de la tabla en el prompt.

## 🧹 Limpieza de Legado (`stripLegacyBlocks`)
Debido a la migración de un sistema de prompts manual a uno dinámico, este servicio incluye lógica para detectar y eliminar bloques de plantillas "quemados" (hardcoded) en las instrucciones de los asistentes, evitando así instrucciones duplicadas o contradictorias.

## 🛡️ Seguridad de Ejecución
Proporciona `canExecute`, una guarda final que verifica no solo si la plantilla existe, sino si tiene el switch `authorizeForAI` activo en la cuenta específica.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { templateRegistryService } from 'apps/api/src/services/fluxcore/template-registry.service.ts';

// Ejemplo de invocación típica
const result = await templateRegistryService.execute(params);
```
