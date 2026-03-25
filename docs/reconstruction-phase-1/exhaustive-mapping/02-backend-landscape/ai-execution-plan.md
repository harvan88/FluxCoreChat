---
id: "ai-execution-plan"
type: "core"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/ai-execution-plan.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "AI Entitlements, Runtime Service, Assistant Composition" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Single Source of Truth de Ejecución IA" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Eligibility resolution, Block reason mapping, Plan typification" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AIExecutionPlan

## 🎯 Propósito
Este componente es el **Unico Punto de Verdad** para decidir si una respuesta de IA puede (o debe) ejecutarse para un mensaje entrante. En lugar de tener lógica de autorización dispersa, el `ExecutionPlan` resuelve toda la matriz de decisión en un solo objeto fuertemente tipado.

## 🏛️ Arquitectura/Flujo (Matriz de Decisión)
Un plan evalúa de forma atómica:
- **Estado Global:** ¿La IA está encendida para la cuenta?
- **Recursos:** ¿Hay asistentes configurados? ¿Hay créditos suficientes? ¿Existen API Keys válidas?
- **Entitlements:** ¿Tiene el usuario permiso para usar el modelo/provider solicitado?
- **Ratelimits:** ¿Se ha excedido la cuota de uso?

## 🛡️ Tipado Discriminante (`ExecutionPlan`)
El resultado nunca es ambiguo:
- **`EligiblePlan`**: Contiene TODA la configuración necesaria para la ejecución (Modelo, Proveedor, Credenciales, Runtime, Parámetros LLM, Sesión de Créditos). Es un objeto listo para ser consumido por el motor de ejecución sin validaciones adicionales.
- **`BlockedPlan`**: Contiene un motivo técnico claro (`BlockReason`) y un mensaje legible para el usuario final, explicando por qué no se generó una respuesta.

## 💡 Principales Beneficios
- **Sin Degradación Silenciosa:** Si la IA no responde, el sistema sabe exactamente por qué.
- **Optimización:** Una sola llamada resuelve toda la jerarquía de configuración.
- **Auditoría:** Los planes pueden ser persistidos o logueados para entender por qué se tomó cada decisión de ejecución.

## 🔗 Dependencias
- **ai-entitlements.service**: Resuelve permisos y cuotas LLM (`AIProviderId`).
- **runtime.service**: Consulta la composición de asistentes configurada por el usuario (`AssistantComposition`).

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: ai-execution-plan
import { aiExecutionPlan } from 'apps/api/src/services/ai-execution-plan.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await aiExecutionPlan.process(input);
```
