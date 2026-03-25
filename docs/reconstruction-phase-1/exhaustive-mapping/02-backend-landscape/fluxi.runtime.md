---
id: "fluxi-runtime"
type: "sovereign-runtime"
status: "ratified"
criticality: "critical"
location: "apps/api/src/services/fluxcore/runtimes/fluxi.runtime.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "LLMClient, WorkDefinitions, ActionExecutor, ActionGateway" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Automatización de Tareas (WES)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Active Work slot ingestion, Semantic confirmation logic (non-LLM), Transactional intent interpretation, Confidence gate enforcement (0.6 min), Declarative action generation (no-side-effects)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Fluxi Runtime (WES)

## 🎯 Propósito
El `FluxiRuntime` es el cerebro transaccional de FluxCore (WES - Work Engine System). Su función es convertir el lenguaje natural desestructurado en registros deterministas de trabajo (Tasks/Works). Es el único componente autorizado para orquestar cambios en el estado de las tareas de negocio.

## 🚥 Las 4 Fases de Ejecución (Canon §3)
1.  **Ingesta de Tarea Activa**: Si ya hay una tarea en curso, intenta extraer valores para los "slots" (campos) faltantes del mensaje del usuario.
2.  **Confirmación Semántica**: Detecta patrones como "sí", "ok" o "dale" sin usar LLM para avanzar estados de confirmación de forma rápida y barata.
3.  **Interpretación de Intención**: Si no hay tarea viva, usa el LLM para comparar el mensaje contra las `WorkDefinitions` disponibles (Ventas, Soporte, etc.).
4.  **Generación de Acciones**: Devuelve un set de instrucciones declarativas (`propose_work`, `advance_work_state`), nunca realiza los cambios directamente.

## 🧬 Invariantes de Seguridad (Canon Inv. 10)
-   **Sin Acceso a DB**: El runtime tiene prohibido realizar consultas a la base de datos. Todo el contexto (configuración, definiciones, historial) debe ser inyectado por el orquestador.
-   **Aislamiento de Lógica**: Nunca delega en asistentes conversacionales genéricos. Su lógica es 100% orientada a transacciones y cumplimiento de esquemas de datos.

## 🛡️ El Gate de Confianza
Para evitar ejecuciones erróneas, el runtime impone un umbral de confianza mínimo de **0.6**. Si la IA no está lo suficientemente segura de haber entendido la intención transaccional o no hay evidencia textual clara para los campos obligatorios, el sistema devuelve `no_action`, protegiendo la integridad de los datos de negocio.

## 💡 Ejemplo de Uso
```typescript
// El adaptador/runtime se registra en el sistema
import { runtime } from 'apps/api/src/services/fluxcore/runtimes/fluxi.runtime.ts';

// Invocado por el RuntimeGateway según la configuración de cuenta
const actions = await runtime.handleMessage(runtimeInput);
```
