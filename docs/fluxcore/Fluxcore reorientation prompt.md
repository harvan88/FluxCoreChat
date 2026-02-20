# Instrucción de Re-encauzamiento — FluxCore v8.2

Usa este prompt cuando el asistente haya derivado del Canon, tome decisiones arquitectónicas sin fundamento, o proponga soluciones que contradicen el diseño establecido.

---

## PROMPT DE RE-ENCAUZAMIENTO

```
Detente. Antes de continuar, necesito re-establecer el contexto arquitectónico completo.

Estás implementando FluxCore v8.2. Existe un Canon arquitectónico que es la única fuente 
de verdad de este sistema. Si el código contradice el Canon, el código está en error.
El Canon no se negocia durante la implementación; se actualiza por decisión explícita.

---

LOS CINCO PRINCIPIOS QUE NO SE DISCUTEN:

1. EL KERNEL ES INMUTABLE
   `fluxcore_signals` es append-only. Solo los Reality Adapters clase SENSOR o GATEWAY 
   pueden escribir en él. Los INTERPRETER (IA) jamás escriben en el Kernel.
   RFC-0001 está congelado. No hay debates sobre el Kernel.

2. LOS PROYECTORES SON PUROS Y ATÓMICOS
   Un proyector lee del Journal, escribe en tablas derivadas, y actualiza su cursor.
   Todo en una sola transacción. Nunca llama servicios externos. Nunca tiene efectos 
   fuera de la transacción. Si ves código que hace await serviceX.doSomething() dentro 
   de un proyector sin pasar tx, es una violación.

3. LA UNIDAD DE DECISIÓN ES EL TURNO, NO LA SEÑAL
   El ChatProjector encola en fluxcore_cognition_queue usando upsert con extensión de 
   ventana. Las señales EXTERNAL_STATE_OBSERVED (typing, recording) también extienden 
   la ventana pero NO crean mensajes y NO actualizan last_signal_seq.
   El CognitionWorker no interpreta señales. Solo consume turnos cuya ventana venció.

4. LOS RUNTIMES SON SOBERANOS CON CONTRATO ÚNICO
   Todos los runtimes implementan: handleMessage(input: RuntimeInput): Promise<ExecutionAction[]>
   Ningún runtime accede a DB durante handleMessage. Ninguno ejecuta efectos directamente.
   Ninguno llama a getAccountConfig() ni a messageCore.send(). Todo lo que necesitan 
   llega en RuntimeInput.policyContext, ya resuelto.
   Si ves un runtime que accede a DB, es una violación crítica.

5. EL POLICYCONTEXT ES COMPLETO Y NO DELEGABLE
   FluxPolicyContext contiene TODO lo que el runtime necesita: mode, tone, useEmojis, 
   language, responseDelayMs, turnWindowMs, turnWindowTypingMs, turnWindowMaxMs, 
   offHoursPolicy, contactRules, activeRuntimeId, assistantInstructions, 
   authorizedTools, authorizedTemplates, activeWork, workDefinitions.
   El principio de completitud es absoluto: si el runtime necesita un dato para decidir, 
   ese dato pertenece al PolicyContext. No hay excepciones.

---

LA SEPARACIÓN CHATCORE / FLUXCORE:

ChatCore = Cuerpo: mensajes, conversaciones, plantillas, contactos, canales, WebSockets.
           Existe sin IA. No sabe que existe la IA. No tiene lógica de negocio.

FluxCore = Cerebro: Journal, proyectores, cognición, runtimes, works, PolicyContext.
           Nunca toca la red directamente. Traduce intención en acciones mediadas.

Test ontológico: ¿Este dato/tabla/servicio existiría si no hubiera IA?
  → SÍ: pertenece a ChatCore
  → NO: pertenece a FluxCore

---

EL FLUJO ES SIEMPRE ESTE. NO HAY OTRO:

Señal → Kernel (Journal) → ChatProjector (atómico) → fluxcore_cognition_queue
  → CognitionWorker (turn_window_expires_at < now())
  → CognitiveDispatcher (resuelve PolicyContext, lee historial de messages)
  → RuntimeGateway → runtime.handleMessage(input) → ExecutionAction[]
  → ActionExecutor (único que produce efectos) → messages(pending) + WebSocket

---

VIOLACIONES QUE DEBES DETECTAR Y RECHAZAR:

- Un runtime que hace import { db } from '...' o llama await db.query.anything
- Un proyector que llama await messageCore.receive() o cualquier servicio con efectos
- Un proyector que actualiza su cursor fuera de la misma transacción que sus writes
- Un ActionExecutor que NO marca processed_at en cognition_queue al completar
- Un CognitionWorker que lee el tipo de señal para decidir si procesar
- Un PolicyContext sin mode, sin turnWindowMs, sin tone
- Cualquier componente que no sea un Reality Adapter escribiendo en fluxcore_signals
- Un runtime que llama a otro runtime
- SmartDelay implementado dentro de un runtime (pertenece al CognitionWorker)

---

AHORA RETOMAMOS:

Con este contexto claro, revisa lo que estabas implementando y verifica que cumple 
el Canon antes de continuar. Si encontrás una contradicción entre el Canon y el código 
existente, el código está en error. Si encontrás algo que el Canon no especifica, 
pregunta antes de inventar.

El Canon está en FLUXCORE_CANON_FINAL_v8.2.md. Es el único documento que importa.
```