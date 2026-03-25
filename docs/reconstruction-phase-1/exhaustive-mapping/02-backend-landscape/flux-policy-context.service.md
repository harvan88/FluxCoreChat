---
id: "flux-policy-context-service"
type: "orchestration-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/flux-policy-context.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Core Event Bus, Drizzle (Policies, Assistants, Accounts, Relationships), Asset Policy, Automation Controller" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Source of Truth para Gobernanza de Negocio (Canon §4.3)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Context resolution (The Chain), Hierarchical mode resolution, Business profile projection, Contact rule extraction, Cache invalidation via EventBus" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ FluxPolicyContextService

## 🎯 Propósito
Este servicio es el encargado de responder la pregunta: "¿Cómo debe comportarse la IA en este preciso instante?". Resuelve el `FluxPolicyContext`, que es el objeto de gobernanza que rige el comportamiento del asistente antes de que se invoque cualquier lógica técnica de LLM.

## 🚥 Resolución Jerárquica del Modo (The Resolve Chain)
El modo de respuesta (`auto`, `suggest`, `off`) se resuelve siguiendo una cascada de prioridades:
1.  **Excepción por Contacto**: Si existe una regla específica de automatización para esa persona (`AutomationRules`).
2.  **Regla Global/Visitantes**: Si existe una regla para visitantes o una política de cuenta general (`AccountPolicies`).
3.  **Default**: `off` si no se encuentra nada.

## 🧬 Composición del Contexto
El objeto resultante contiene:
-   **Límites de Tiempo**: `turnWindowMs`, `responseDelayMs` para simulación humana.
-   **Reglas de Contacto**: Notas y preferencias del cliente marcadas con `allow_automated_use`.
-   **Perfil Proyectado**: Datos del negocio (Bio, Avatar) que la IA tiene permitido conocer.
-   **Work Engine Context**: Si hay un proceso de trabajo (WES) activo, inyecta su estado y definiciones autorizadas.

## ♻️ Gestión de Caché
El servicio mantiene una caché local agresiva para reducir la carga en la DB, la cual se invalida reactivamente escuchando eventos del `coreEventBus` como `account.profile.updated` o `assistant.config.updated`.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { fluxPolicyContextService } from 'apps/api/src/services/flux-policy-context.service.ts';

// Ejemplo de invocación típica
const result = await fluxPolicyContextService.execute(params);
```
