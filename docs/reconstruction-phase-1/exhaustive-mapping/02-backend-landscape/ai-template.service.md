---
id: "ai-template-service"
type: "logic-service"
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

# ⚙️ AITemplateService

## 🎯 Propósito
Actúa como la capa de seguridad y abstracción entre la IA y el sistema maestro de plantillas. Su función es garantizar que la IA nunca envíe mensajes que no hayan sido explícitamente autorizados por el administrador de la cuenta.

## 🚥 Seguridad Multinivel
1.  **Visibilidad**: Solo expone a la IA las plantillas que tienen el permiso habilitado en `TemplateRegistry`.
2.  **Ejecución**: Antes de enviar cualquier mensaje, vuelve a validar con `TemplateRegistry.canExecute` para prevenir ataques de inyección donde la IA intente adivinar IDs de plantillas privadas.

## 🔄 Delegación (Kernel Sovereignty)
El servicio no "envía" el mensaje directamente. Una vez aprobada la seguridad, delega la ejecución al `TemplateService` central, asegurando que se apliquen todas las reglas de formato, variables y guardado de mensajes estándar de FluxCore.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { aiTemplateService } from 'apps/api/src/services/ai-template.service.ts';

// Ejemplo de invocación típica
const result = await aiTemplateService.execute(params);
```
