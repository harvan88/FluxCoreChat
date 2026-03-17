# Estrategia: Pipeline Visual en Kernel Console (UI)

**Fecha:** 2026-03-16  
**Estado:** 🎯 **ESTRATEGIA DEFINIDA**  
**Objetivo:** Visualizar en tiempo real el flujo de vida de un mensaje a través del sistema cognitivo, mostrando los estados de cada componente según el *Runtime Sovereignty Canon*.

---

## 1. Diseño Conceptual (El Semáforo Secuencial)

Para cada mensaje que entra al sistema, mostraremos una línea de progreso (pipeline) con nodos que representan cada componente crítico del Canon.

Cada nodo tendrá 3 estados posibles:
- ⚪ **Gris (Pending):** Aún no ha llegado a este paso.
- 🟡 **Amarillo/Pulsante (Processing):** El componente está trabajando actualmente.
- 🟢 **Verde (Success):** El componente completó su tarea correctamente.
- 🔴 **Rojo (Error):** El componente falló o se bloqueó el flujo.

### Los Nodos del Pipeline (Fidelidad al Canon):
1. **📥 Ingesta (ChatCore)** -> `Message received`
2. **🛡️ Certificación (Kernel)** -> `EXTERNAL_INPUT_OBSERVED`
3. **🧠 Encolado (ChatProjector)** -> `Enqueued for Cognition`
4. **⚙️ Dispatcher (CognitiveDispatcher)** -> `Runtime Selected (Respetando Soberanía)`
5. **🤖 Runtime (Asistentes/Fluxi)** -> `AI Generating Response`
6. **🚀 Ejecución (ActionExecutor)** -> `Executing Actions`
7. **✅ Certificación Final (CognitionGateway)** -> `AI_RESPONSE_GENERATED`

---

## 2. Arquitectura de Implementación

Para lograr esto en tiempo real sin saturar la base de datos principal con logs efímeros, usaremos **Telemetría vía EventBus + WebSocket**.

### A. Capa de Telemetría Backend (Eventos de Progreso)
En cada componente clave, emitiremos un evento de telemetría interno (`coreEventBus`).

*Ejemplo en `ChatProjector`:*
```typescript
coreEventBus.emit('telemetry:pipeline_step', {
    messageId: signal.evidenceRaw.content.id,
    conversationId: conversationId,
    step: 'projector_enqueued',
    status: 'success', // 'processing' | 'success' | 'error'
    metadata: { turnId: newTurnId }
});
```

*Ejemplo en `CognitiveDispatcher`:*
```typescript
coreEventBus.emit('telemetry:pipeline_step', {
    messageId: params.messageId, // Necesitamos propagar el messageId original
    conversationId: params.conversationId,
    step: 'dispatcher_routed',
    status: 'success',
    metadata: { runtimeId: userSelection } // Muestra que se respetó la soberanía
});
```

### B. Capa WebSocket (Broadcast al Kernel Console)
Un listener en el backend escuchará estos eventos `telemetry:pipeline_step` y los enviará vía WebSocket *únicamente* a los clientes conectados al Kernel Console (rol de admin/sistema).

### C. Capa Frontend (Kernel Console UI)
Crearemos un nuevo componente `VisualPipelineViewer` en el Kernel Console.

**Estructura de Datos Local (Zustand/React State):**
```typescript
interface PipelineTrace {
  messageId: string;
  conversationId: string;
  timestamp: Date;
  steps: {
    ingest: 'pending' | 'success' | 'error';
    kernel_in: 'pending' | 'success' | 'error';
    projector: 'pending' | 'success' | 'error';
    dispatcher: 'pending' | 'success' | 'error'; // Muestra: "Runtime: @fluxcore/fluxi"
    runtime: 'pending' | 'success' | 'error';
    executor: 'pending' | 'success' | 'error';
    kernel_out: 'pending' | 'success' | 'error';
  };
  errors: string[];
}
```

---

## 3. Plan de Ejecución (Hitos)

### Fase 1: Infraestructura de Telemetría (Backend)
1. Definir los tipos de eventos de telemetría (`TelemetryStep`, `TelemetryStatus`).
2. Implementar `coreEventBus.emit` en los 5 componentes clave (ChatProjector, CognitionWorker, CognitiveDispatcher, ActionExecutor, CognitionGateway).
3. Asegurar que el `messageId` original viaje a través del queue y el context para poder agrupar los eventos en el UI.

### Fase 2: Transmisión en Tiempo Real (WebSocket)
1. En `ws-handler.ts`, suscribirse a `telemetry:pipeline_step`.
2. Emitir el payload hacia la sala específica de administradores/kernel (`kernel_monitors`).

### Fase 3: Interfaz Gráfica (Frontend Kernel Console)
1. Crear el componente visual de línea de tiempo horizontal/vertical (usando iconos de Lucide-React: `CheckCircle`, `CircleDashed`, `AlertCircle`).
2. Integrar el listener del socket en el frontend.
3. Mostrar tarjetas expandibles por mensaje. Si se hace clic en un paso (ej. Dispatcher), mostrar la metadata técnica (ej. `Runtime seleccionado: asistentes-local`).

---

## 4. Beneficios Alineados al Canon
- **Transparencia Absoluta:** Si un mensaje se queda "colgado" en el Dispatcher porque el Runtime falló, la línea se quedará roja en el paso 5. Ya no habrá "cajas negras".
- **Verificación de Soberanía:** El paso 4 (Dispatcher) mostrará explícitamente qué runtime se eligió, confirmando visualmente que se respetó la configuración del usuario.
