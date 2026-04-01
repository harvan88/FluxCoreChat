---
id: "template-registry-service"
type: "core"
status: "needs_review"
criticality: "high"
location: "apps/api/src/services/fluxcore/template-registry.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Template Settings Service, Drizzle (Templates)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Single Source of Truth para Inyección de Plantillas en IA" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Instruction block building (Markdown), Authorized template listing, Execution validation (canExecute), Legacy block stripping" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# TemplateRegistryService

## Propósito
`TemplateRegistryService` es la fuente única de verdad para la relación entre IA y plantillas autorizadas. Centraliza qué plantillas puede ver la IA, cómo se describen en instrucciones dinámicas y cómo se valida si una plantilla concreta puede ejecutarse.

**Actualización 2026-04-01:** Se simplificó el protocolo de instrucciones para usar exclusivamente `CALL_TEMPLATE:<template_id>` en lugar de `send_template`. Se reestructuró el formato de instrucciones con 4 reglas claras y se eliminó la tabla Markdown en favor de un formato más legible para el LLM.

## Arquitectura
El servicio expone cuatro operaciones reales:

- `getAuthorizedTemplates(accountId)`
  - delega en `fluxCoreTemplateSettingsService.listAuthorizedTemplates(accountId)`
  - devuelve únicamente plantillas activas y autorizadas para IA

- `buildInstructionBlock(accountId)`
  - genera un bloque de instrucciones con 4 reglas claras para el uso de `CALL_TEMPLATE:`
  - formato simplificado: cada plantilla con ID, nombre, caso de uso y variables
  - incluye reglas específicas para múltiples plantillas y texto complementario
  - **cambio 2026-04-01:** eliminada tabla Markdown, agregado formato de reglas numeradas

- `canExecute(templateId, accountId)`
  - valida que la plantilla esté autorizada para IA y pertenezca al conjunto efectivamente autorizado para la cuenta

- `stripLegacyBlocks(content)`
  - elimina bloques heredados de inyección estática para evitar duplicación o contradicción en instrucciones antiguas

## Consumidores verificados
- `apps/api/src/services/ai-template.service.ts`
  - usa `getAuthorizedTemplates` y `canExecute`
- `apps/api/src/services/fluxcore/runtime.service.ts`
  - usa `stripLegacyBlocks` y `buildInstructionBlock` al armar la composición del asistente

## Relación con el flujo actual de templates
Este servicio no envía mensajes por sí mismo. Su papel es previo a la ejecución:

1. define qué plantillas son visibles para la IA
2. inyecta la descripción oficial de esas plantillas en el prompt/composición cuando corresponde
3. actúa como guard final antes de que una acción termine en `templateService.executeTemplate(...)`

## Límites actuales
- **Protocolo unificado:** El servicio ahora genera instrucciones exclusivamente para `CALL_TEMPLATE:` eliminando la doble semántica con `send_template`.
- **Formato mejorado:** Las instrucciones usan un formato de reglas numeradas más claro que la tabla Markdown anterior.
- **Compatibilidad:** Se mantiene `stripLegacyBlocks` para limpiar instrucciones antiguas que puedan contaminar el prompt.
- **Validación:** `canExecute` sigue siendo el guard final antes de la ejecución de plantillas.

## Ejemplo de uso
```ts
const templateBlock = await templateRegistryService.buildInstructionBlock(accountId);

if (templateBlock) {
  instructions.push({
    id: 'system-templates-context',
    content: templateBlock.content,
  } as any);
}
```
