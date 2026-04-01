---
id: "ai-template-service"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/ai-template.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "TemplateService, TemplateRegistryService" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Soberanía de Plantillas para IA" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Authorized template listing, Security check, Template execution delegation" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# AITemplateService

## Propósito
`AITemplateService` es la fachada de seguridad que permite a la IA interactuar con el sistema canónico de plantillas sin acceder directamente a la lógica de render y persistencia. Su función es listar solo plantillas autorizadas y delegar su envío al `TemplateService` después de una validación final.

## Arquitectura
El servicio implementa dos operaciones reales:

- `getAvailableTemplates(accountId)`
  - devuelve únicamente las plantillas autorizadas para IA usando `templateRegistryService.getAuthorizedTemplates(...)`

- `sendAuthorizedTemplate({ templateId, accountId, conversationId, variables })`
  - valida con `templateRegistryService.canExecute(...)`
  - delega en `templateService.executeTemplate(...)`
  - fuerza `generatedBy: 'ai'` para que el mensaje quede marcado como emitido por IA dentro de ChatCore

## Flujo operativo
1. la IA propone o llama una plantilla
2. la plataforma resuelve el `templateId`
3. `AITemplateService` revalida la autorización
4. `TemplateService` construye el mensaje final con texto y assets
5. ChatCore persiste y distribuye el mensaje como cualquier otro mensaje canónico

## Dependencias
- **Depende de:** `template-registry.service.ts`, `template.service.ts`
- **Es usado por:** `templates.capability.ts`

## Ejemplo de uso
```ts
const result = await aiTemplateService.sendAuthorizedTemplate({
  accountId,
  conversationId,
  templateId,
  variables,
});
```
