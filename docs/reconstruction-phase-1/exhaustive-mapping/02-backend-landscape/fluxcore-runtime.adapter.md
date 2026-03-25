---
id: "fluxcore-runtime-adapter"
type: "bridge-adapter"
status: "legacy-stable"
criticality: "high"
location: "apps/api/src/services/runtimes/fluxcore-runtime.adapter.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "AIService, SmartDelayService, MessageCore, RuntimeGateway" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Adaptador de Asistentes Conversacionales" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "SmartDelay integration (Debounce AI), Loop prevention (AI-to-AI blocking), Suggest vs Auto mode implementation, Declarative action mapping, Typing indicator orchestration" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ FluxCore Runtime Adapter

## 🎯 Propósito
Este adaptador actúa como el puente entre el nuevo `RuntimeGateway` y el motor tradicional de asistentes de FluxCore (`@fluxcore/asistentes`). Permite que la infraestructura de IA conversacional (sugerencias y respuestas automáticas) funcione bajo el contrato unificado del backend v8.

## 🚥 Integración con Smart Delay
Es el principal consumidor del `SmartDelayService`:
-   Si el modo es `auto` y el retardo inteligente está activo, el adaptador no responde inmediatamente.
-   Programa una tarea diferida que envía señales de escritura (`typing`) simulando pensamiento humano.
-   Solo dispara la generación del LLM cuando detecta que el hilo de mensajes del usuario se ha detenido por un tiempo prudencial.

## 🧬 Modos de Ejecución
Soporta la lógica dual de intervención:
1.  **Suggest (Modo Sugerencia)**: Genera una propuesta de respuesta pero no devuelve acciones al gateway. El resultado se guarda silenciosamente para que un humano lo apruebe.
2.  **Auto (Modo Automático)**: Ejecuta la acción `send_message` directamente. Si viene de un proceso retardado (SmartDelay), el adaptador maneja el envío manual vía `messageCore` ya que la petición original del gateway ya caducó.

## 🛡️ Prevención de Bucles Infinitos
Implementa una regla de oro en el borde de entrada: Si el mensaje entrante fue generado por otro agente o por el sistema (`generatedBy !== 'human'`), el adaptador ignora la señal. Esto previene que dos asistentes de IA entren en una conversación infinita entre ellos, protegiendo el consumo presupuestario.

## 💡 Ejemplo de Uso
```typescript
// El adaptador/runtime se registra en el sistema
import { runtime } from 'apps/api/src/services/runtimes/fluxcore-runtime.adapter.ts';

// Invocado por el RuntimeGateway según la configuración de cuenta
const actions = await runtime.handleMessage(runtimeInput);
```
