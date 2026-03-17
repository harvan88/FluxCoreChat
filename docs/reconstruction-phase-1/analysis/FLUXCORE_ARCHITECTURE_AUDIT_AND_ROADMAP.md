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

### 📍 HITO 1: Migración Definitiva de WES (Fluxi) - ✅ COMPLETADO
Fluxi/WES ha sido migrado satisfactoriamente al nuevo pipeline. `ActionExecutor` maneja los flujos transaccionales (`propose_work`, `open_work`) y el sistema de `stopPropagation` funciona correctamente para evitar colisiones entre el flujo conversacional y el flujo de trabajo.

### 📍 HITO 2: Purga del `ExtensionHost` y Despachadores Viejos - ✅ COMPLETADO
Se ha realizado una limpieza profunda del código:
- **`manifest-dispatch.service.ts`**: Eliminado.
- **`extension-host.service.ts`**: Eliminado.
- **`ai-orchestrator.old.ts`**: Eliminado.
- **`FLUX_NEW_ARCHITECTURE`**: Feature flag eliminada; la nueva arquitectura es ahora el estándar permanente y el `CognitionWorker` corre perpetuamente.
- **`message-core.ts`**: Refactorizado para ser un servicio agnóstico de IA, enfocado únicamente en persistencia y notificación al Kernel.

### 📍 HITO 3: Blindaje de ChatCore - ✅ COMPLETADO
Asegurar que **absolutamente ningún** controlador de UI lance invocaciones cognitivas.
- **Logro:** Se han eliminado los endpoints directos de `generate` y `suggestions` en `ai.routes.ts`.
- **Logro:** Se ha corregido la referencia rota a `extensionHost` en las rutas de mensajes, consolidando el uso de `ai-branding.service`.
- **Logro:** El `ws-handler` ya bloquea las solicitudes de sugerencia legacy, forzando el uso del pipeline soberano.

### 📍 HITO 4: Consolidación de Telemetría (Phase Checkout) - ✅ COMPLETADO
Extender la lógica actual de telemetría a capturar escenarios extremos en el visualizador.
- **Logro:** Se ha implementado el `triggerSignalId` como hilo conductor de toda la traza.
- **Logro:** Los 7 nodos (Ingreso -> Entrega) ahora se agrupan bajo el ID de la señal original, permitiendo ver el "Viaje del Mensaje" completo.
- **Logro:** Se han corregido inconsistencias de tipos en `ActionExecutor` y `messageCore` que afectaban la estabilidad del pipeline.

---
*Este documento invalida versiones de arquitectura anteriores no respaldadas por el Live Cognitive Pipeline. Es el cimiento oficial del esfuerzo de migración remanente.*
