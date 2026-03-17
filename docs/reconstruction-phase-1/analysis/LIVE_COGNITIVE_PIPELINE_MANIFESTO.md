# Manifiesto del Live Cognitive Pipeline (v4.0)

## 🎯 El Estado del Arte
Al completar los **Hitos 3 y 4**, FluxCore ha alcanzado un nivel de madurez arquitectónica donde el "cerebro" (FluxCore) y el "cuerpo" (ChatCore) operan en perfecta armonía pero con total independencia. 

El **Live Cognitive Pipeline** no es solo una funcionalidad; es la garantía de que cada decisión tomada por la IA es auditable, soberana y perfectamente rastreable.

---

## 🏗️ La Traza de los 7 Nodos (El Viaje del Mensaje)
Hemos consolidado una traza unificada que agrupa los eventos bajo el **ID de la Señal Original** (`triggerSignalId`). Este es el ciclo de vida actual:

1.  **Ingreso (800)**: ChatCore capta el mensaje del usuario y lo certifica como señal en el Kernel.
2.  **Proyección**: El Kernel proyecta la señal a la cola de cognición (`fluxcore_cognition_queue`).
3.  **Worker**: El `CognitionWorker` despierta y reclama el turno para procesamiento.
4.  **Runtime**: La IA (Local o Cloud) analiza el contexto y genera una propuesta de acción.
5.  **Dispatcher**: El mediador de FluxCore verifica políticas y coordina la ejecución de efectos.
6.  **Certificación**: La respuesta de la IA se "firma" de vuelta en el Kernel como una señal de salida (`AI_RESPONSE_GENERATED`).
7.  **Entrega**: ChatCore observa la señal certificada y la proyecta al cliente final (vía WebSocket/Push).

### Variantes por Modo

| Modo | Nodos recorridos | Descripción |
|------|-----------------|-------------|
| **auto** | 1 → 2 → 3 → 4 → 5 → 6 → 7 | Traza completa. Mensaje enviado automáticamente. |
| **suggest** | 1 → 2 → 3 → 4 → 5 | Traza acortada. El Dispatcher (nodo 5) guarda la respuesta como `ai_suggestion` y retorna sin ejecutar acciones. Nodos 6-7 **solo ocurren** cuando el humano aprueba la sugerencia. |
| **off** | 1 → 2 → 3 (stop) | El Dispatcher cierra el turno sin invocar Runtime. |

---

## 🔒 Blindaje de ChatCore (Sovereign Terminal)
ChatCore ha sido "despojado" de su capacidad de invocar IA directamente. Ahora es un **Terminal Soberano**:
- **No decide**: Solo envía señales al Kernel.
- **No genera**: Solo proyecta lo que el Kernel certifica.
- **Certidumbre**: Si un mensaje aparece en la UI, es porque pasó por todo el pipeline de certificación.

---

## 🛠️ Protocolo de Telemetría Unificada
Para mantener esta visibilidad, hemos estandarizado el uso de `triggerSignalId` en todos los servicios críticos:
- `CognitionWorker`
- `CognitiveDispatcher`
- `ActionExecutor`
- `CognitionGateway`
- `ChatProjector`
- `MessageCore`

Cualquier nuevo nodo que se añada al pipeline **DEBE** propagar este ID para no romper el hilo de Ariadna en el visualizador.

---

## 📈 Próximos Pasos (Fase 1 Remanente)
- **Hito 5**: Unificación de acciones WES (Work Engine Service) bajo este mismo protocolo.
- **Hito 6**: Finalización del "Checkout" de Fase 1 para iniciar la optimización de latencia masiva.

---
*Documento sellado tras la implementación exitosa de la Telemetría de 7 Nodos.*
