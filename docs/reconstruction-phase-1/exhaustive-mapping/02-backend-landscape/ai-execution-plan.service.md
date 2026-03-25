---
id: "ai-execution-plan-service"
type: "infrastructure-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/ai-execution-plan.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FluxCoreService, PolicyContextService, EntitlementsService, CreditsService, ExtensionInstallations" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Pre-vuelo y Resolución de Estrategia de IA" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Assistant resolution, Policy enforcement, Credit gating (OpenAI), Provider order building, Plan categorization (Eligible vs Blocked)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AIExecutionPlanService

## 🎯 Propósito
Este servicio es el guardián del proceso cognitivo. Se encarga de evaluar si un mensaje **puede o no** ser procesado por la IA antes de que se gaste un solo token. Centraliza todas las reglas de negocio, financieras y técnicas.

## 🚥 El Mapa de Decisión
Antes de ejecutar, el servicio resuelve:
1.  **Asistente**: ¿Hay un asistente activo? (Si no, bloquea con `no_assistant`).
2.  **Política**: ¿El modo de chat está en `off`? (Si sí, bloquea con `mode_off`).
3.  **Extensión**: ¿El cliente tiene la extensión activada? (Si no, bloquea con `ai_disabled`).
4.  **Finanzas**: Si usa OpenAI, ¿tiene créditos suficientes? (Si no, bloquea con `insufficient_credits`).
5.  **Infraestructura**: ¿Tenemos API keys configuradas para el proveedor solicitado?.

## 🧬 Planes de Ejecución
-   **EligiblePlan**: Contiene todo lo necesario para llamar a la IA (Modelo, Temperatura, Credentials, CreditsSessionId).
-   **BlockedPlan**: Contiene la razón técnica del bloqueo y un mensaje amigable para el usuario, permitiendo diagnósticos rápidos en el frontend.
-   **Fallbacks Automáticos**: Si un asistente pide un proveedor sin API key, el servicio intenta rutear hacia el primer proveedor válido disponible (ej. Groq).

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { aiExecutionPlanService } from 'apps/api/src/services/ai-execution-plan.service.ts';

// Ejemplo de invocación típica
const result = await aiExecutionPlanService.execute(params);
```
