# Flux Core — Execution Trace Document (v2.0)

Este documento reconstruye la traza de ejecución **REAL** del sistema, basada en el código actual, para identificar la ruta de un mensaje desde su entrada hasta su efecto final.

---

## 1. El Orquestador Maestro (`ai-orchestrator.service.ts`)

Todo mensaje entrante sigue este flujo de decisión lineal y determinista:

1.  **Ingreso:** `MessageCore` recibe el mensaje y emite el evento `core:message_received`.
2.  **Soberanía de Dominio (Paso 1):** El orquestador invoca a `extensionHost.processMessage`.
    *   Este paso permite que extensiones del sistema (como **Fluxi**) o de terceros procesen el mensaje ANTES que cualquier lógica de IA.
    *   **Bifurcación:** Si alguna extensión retorna `stopPropagation: true`, el flujo se detiene aquí (Handled).
3.  **Evaluación de Trigger (Paso 2):** Se consulta al `automationController` si el mensaje debe ser procesado por la IA (Modos: `automatic`, `suggest`, `disabled`).
4.  **Bifurcación por Runtime (Paso 3):** Se recupera el `activeRuntimeId` de la cuenta.
    *   **Ruta @fluxcore/fluxi:** Llama a `tryWesInterpretation`.
    *   **Ruta @fluxcore/asistentes:** Llama a `scheduleAutoReply`.

---

## 2. Trace: Ruta Fluxi (WES)

1.  **Interpretación:** `tryWesInterpretation` importa el `WesInterpreterService`.
2.  **Detección:** El intérprete analiza el texto buscando una `WorkDefinition` match.
3.  **Persistencia de Hipótesis:** Si hay match, se guarda un `ProposedWork` con su evidencia textual.
4.  **Apertura de Trabajo:** Si el modo es `automatic`, se llama a `workEngine.openWork()`.
    *   Se crea el registro en `fluxcore_works`.
    *   Se envía un mensaje de sistema confirmando el inicio del proceso.
5.  **Finalización:** Retorna `true`, deteniendo el pipeline de chat.

---

## 3. Trace: Ruta Asistentes (Chat)

1.  **Programación:** `scheduleAutoReply` pone el mensaje en una cola con delay.
2.  **Generación:** Llama a `extensionHost.generateAIResponse()`.
3.  **Plan de Ejecución:** `resolveExecutionPlan` verifica créditos, modelo y proveedor.
4.  **Generación Local:** Llama a la extensión `@fluxcore/asistentes`.
5.  **Prompt & RAG:** La extensión construye el contexto (RAG, historial) y llama al LLM.
6.  **Efecto:** El resultado (texto o tool calls como `send_template`) se envía vía `messageCore.send()`.

---

## 4. Hallazgos de Integridad Corregidos

*   **Zero-Click WES:** La integración ahora es nativa en el orquestador bajo el runtime de Fluxi.
*   **Aislamiento de Runtimes:** Un asistente no puede disparar inadvertidamente un Work de Fluxi, y viceversa, cumpliendo la **Soberanía del Runtime**.
*   **Circularidad Eliminada:** Las extensiones ahora reciben servicios inyectados en lugar de llamarse a sí mismas por HTTP.
