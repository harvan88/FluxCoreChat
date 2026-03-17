# 🏛️ Auditoría Arquitectónica y Roadmap: La Consolidación de FluxCore

**Documento Maestro y Fuente Única de Verdad**
**Fecha:** 2026-03-16
**Autor:** Antigravity (IA)

---

## 🎯 1. Propósito Ejecutivo

A petición de la dirección del proyecto, este documento realiza un escrutinio exhaustivo de la documentación canónica y del código fuente real de FluxCore. Su objetivo es establecer, sin ambigüedades:
1. **La verdad arquitectónica** (lo que dicta el canon y cómo funciona el código hoy).
2. **Qué debe ser purgado** (la arquitectura legacy).
3. **Qué debe permanecer** (la nueva arquitectura basada en el *Live Cognitive Pipeline*).
4. **El Roadmap estratégico** para finalizar la transición y eliminar la deuda técnica.

---

## 📖 2. Repaso de la Documentación Canónica y Código

### El Canon de FluxCore (La Ley Fundamental)
Según `fluxcore-overview.md` y `canonical-definitions.md`, la separación de poderes en el sistema exige:
* **ChatCore (El Cuerpo):** Maneja el estado conversacional persistente HTTP/WS. Es estúpido; solo obedece y muestra lo que hay.
* **Kernel (La Ley/El Notario):** Todo lo que pasa debe quedar registrado como un evento inmutable (Signals). Nada existe si el Kernel no lo certifica.
* **FluxCore (El Cerebro):** No habla directamente con los clientes. Observa el Kernel (`ChatProjector`), encola deliberaciones (`fluxcore_cognition_queue`), decide (`CognitiveDispatcher`, `ActionExecutor`) y certifica sus respuestas de vuelta al Kernel (`CognitionGateway`).

### La Realidad del Código (La Nueva Arquitectura)
El pipeline implementado y que estamos visualizando exitosamente refleja el canon de la siguiente manera:
1. `ChatProjector` lee del Kernel y mete el turno a la `fluxcore_cognition_queue`.
2. `CognitionWorker` extrae el turno maduro.
3. `CognitiveDispatcher` cruza el contexto (Policy + RuntimeConfig).
4. El Runtime (`fluxi` o `asistentes` vía `RuntimeGateway`) mastica la historia y genera un array de `ExecutionAction`.
5. `ActionExecutor` interpreta (`send_message`, WES actions, etc.).
6. `CognitionGateway` envía la respuesta certificada al Kernel.

**Diagnóstico:** ✅ El código del nuevo pipeline está perfectamente alineado con el canon documental.

---

## 🗑️ 3. Lo que HAY QUE QUITAR (Arquitectura Legacy)

La arquitectura anterior operaba como un conducto directo y sucio: el mensaje llegaba del WebSocket, y de inmediato se despachaba a la IA sin garantías notariadas. 

**Debemos eliminar sistemáticamente:**
1. **Rutas Viejas de Despacho Directo:** Archivos como `message-dispatch.service.ts` u otros vestigios que interceptan mensajes de la DB de ChatCore para enviarlos a la IA esquivando la proyección del Kernel.
2. **`ExtensionHost` (El Fantasma Transaccional):** Como documenta `ANALYSIS_FLUXI_WES.md`, el sistema WES original dependía del `ExtensionHost` anclado al path legacy. Este debe morir, dado que sus piezas ahora residen (o deben residir por completo) dentro de `fluxi.runtime.ts` interactuando vía el nuevo `ActionExecutor`.
3. **Múltiples escuchas reactivas (Double Processing):** Cualquier trozo de código en `ws-handler.ts` o en los controladores de API que intente "reaccionar" haciendo llamados cognitivos directos debe ser amputado.
4. **Banderas de convivencia temporal:** El booleano `FLUX_NEW_ARCHITECTURE` debe desaparecer. Sólo existe una verdad ahora.

---

## 🏛️ 4. Lo que SE QUEDA (La Nueva Arquitectura Definitiva)

Todo lo construido como parte del **Live Cognitive Pipeline** es el futuro intocable del sistema:
1. **La infraestructura de colas (`fluxcore_cognition_queue`):** Porque agrupa turnos asíncronos en bloques herméticos que le dan tiempo a la IA a no fragmentar respuestas y respetan la "ventana de silencio".
2. **El Semáforo / Telemetría (El EventBus):** La inyección de eventos a través de `coreEventBus` que el `ws-handler` distribuye a la Consola de Harvan para visualización en tiempo real de los 7 nodos y la soberanía de runtime.
3. **El Árbitro (`CognitiveDispatcher`):** Un punto de control absoluto que verifica el modo (`auto`, `suggest`, `off`) antes de encender motores caros de IA.
4. **`ActionExecutor` polimórfico:** Un mediador que no toma lado; recibe `ExecutionAction[]` abstractas y devuelve `{ results, executionContext }` manejando el *Stop Propagation* si se invocan flujos transaccionales de **Fluxi/WES** (`wes:propose_work`, etc.).
5. **WES/Fluxi Moderno (`fluxi.runtime.ts`):** Las máquinas de estado deterministas de *Work Engine Service* encapsuladas como un `Runtime` válido en el ecosistema, conviviendo pacíficamente sin *hacks*.

---

## 🚀 5. ROADMAP: Finalización de la Nueva Arquitectura

Para cruzar la línea de meta y declarar a FluxCore saneado y moderno, debemos ejecutar este plan secuencial y quirúrgico:

### 📍 HITO 1: Migración Definitiva de WES (Fluxi)
Actualmente, Fluxi/WES tiene lógicas amarradas al sistema legacy, y aunque `ActionExecutor` ya tiene los manejadores (`propose_work`, `open_work`), necesitamos cerciorarnos de que la clase `FluxiRuntime` supla el flujo transaccional nativo sin invadir a otros runtimes.
- **Acción:** Verificar y auditar internamente `fluxi.runtime.ts`. Asegurar que los pasos transaccionales emiten el flag `stopPropagation` y que fluyen correctamente por el nuevo dispatcher que ya soporta validación WES desde la última corrección.

### 📍 HITO 2: Purga del `ExtensionHost` y Despachadores Viejos
Una vez Fluxi esté verificado sobre `RuntimeGateway`:
- **Acción:** Deprecar y borrar de la base de código `message-dispatch.service.ts` y todas las clases relacionadas a `ExtensionHost`.
- **Acción:** Eliminar `FLUX_NEW_ARCHITECTURE` del `.env` global y asumir valor permanente a `true`.

### 📍 HITO 3: Blindaje de ChatCore
Asegurar que **absolutamente ningún** controlador de UI lance invocaciones cognitivas.
- **Acción:** Restringir todo Ingress de ChatCore a únicamente: persistir mensaje en `messageCore` y certificar al Kernel. Cerrar puertos clandestinos entre UI y FluxCore.

### 📍 HITO 4: Consolidación de Telemetría (Phase Checkout)
Extender la lógica actual de telemetría a capturar escenarios extremos en el visualizador (Timeouts severos en el LLM, cuelgues del worker y fallos de validación en el Dispatcher antes del Runtime).
- **Acción:** Revisión transversal de validadores y throw errors para que el semáforo siempre termine en rojo reportado al usuario y evitemos "Cajas Negras / Trazas Grises Infinitas". 

---
*Este documento invalida versiones de arquitectura anteriores no respaldadas por el Live Cognitive Pipeline. Es el cimiento oficial del esfuerzo de migración remanente.*
