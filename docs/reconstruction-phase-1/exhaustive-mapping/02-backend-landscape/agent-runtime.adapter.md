---
id: "agent-runtime-adapter"
type: "logic-service"
status: "deprecated"
criticality: "low"
location: "apps/api/src/services/runtimes/agent-runtime.adapter.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Legacy Flow Registry, AI Service, Retrieval Service" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Antiguo Motor de Agentes" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Flow execution, Dependency injection for agents" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AgentRuntimeAdapter (DEPRECATED)

> [!WARNING]
> Este archivo es considerado **Código Muerto** bajo la revisión H7. Ha sido reemplazado por `FluxiRuntime` en el pipeline v8.2. Se mantiene únicamente por compatibilidad con el servicio `runtime-gateway.service.ts` hasta su desmantelamiento final.

## 🎯 Propósito (Legacy)
Actuaba como el adaptador principal para la ejecución de "Flows" (flujos de trabajo de agentes). Traducía los mensajes entrantes a disparadores de flujo y gestionaba la inyección de dependencias (LLM, Búsqueda, Herramientas) necesarias para que un agente operara.

## 🛠️ Funcionalidades Antiguas
- **Resolución de Agente:** Buscaba el agente activo para una cuenta basándose en la configuración de runtime.
- **Gestión de Dependencias:** Mapeaba los servicios internos (`aiService`, `retrievalService`, `aiToolService`) al formato que el motor de ejecución de flows esperaba.
- **Traducción de Salida:** Convertía el resultado del flujo (texto o acciones) en acciones de ejecución compatibles con el gateway de mensajería.

## 🔄 Motivo de Depreciación
El modelo de "Flows" ha sido evolucionado hacia un sistema más robusto y soberano dentro del namespace `fluxcore`, eliminando la necesidad de este adaptador de traducción pesado.

## 💡 Ejemplo de Uso
```typescript
// El adaptador/runtime se registra en el sistema
import { runtime } from 'apps/api/src/services/runtimes/agent-runtime.adapter.ts';

// Invocado por el RuntimeGateway según la configuración de cuenta
const actions = await runtime.handleMessage(runtimeInput);
```
