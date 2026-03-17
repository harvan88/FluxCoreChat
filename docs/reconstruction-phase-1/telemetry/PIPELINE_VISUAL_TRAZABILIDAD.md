# 🎯 Pipeline Visual de Trazabilidad Completa

**Fecha:** 2026-03-16  
**Objetivo:** Crear un "semáforo secuencial visual" en tiempo real que trace el viaje de un mensaje desde su certificación en el Kernel hasta la respuesta de la IA, asegurando en todo momento visibilidad sobre la soberanía del runtime y procesos internos.

---

## 🗺️ 1. Mapeo del Viaje del Mensaje (Los 7 Nodos del Kernel)

A partir de la idea recuperada en `TELEMETRIA_IDEA_RECUPERADA.md` y cruzando con la realidad actual de `system-flows.md`, este es el recorrido exacto por el pipeline donde se debe emitir telemetría.

| Nodo | Componente | Descripción Visual (Semáforo) | Archivo Central de Intervención |
|:---:|---|---|---|
| 1️⃣ | **ChatCore Gateway** | "Certificando Ingreso Humano" | `fluxcore/chatcore-gateway.service.ts` |
| 2️⃣ | **ChatProjector** | "Mensaje observado, encolando para IA" | `projections/chat-projector.ts` |
| 3️⃣ | **CognitionWorker** | "Analizando contexto / Esperando silencio" | `workers/cognition-worker.ts` |
| 4️⃣ | **CognitiveDispatcher** | *"Soberanía garantizada: [Runtime ID]"* | `fluxcore/cognitive-dispatcher.service.ts` |
| 5️⃣ | **Runtime Gateway** | "IA generando respuesta activa..." | `fluxcore/runtime-gateway.service.ts` |
| 6️⃣ | **CognitionGateway** | "Respuesta certificada en Kernel" | `fluxcore/cognition-gateway.service.ts` |
| 7️⃣ | **WS Handler** | "Respuesta distribuida al Chat" | `websocket/ws-handler.ts` (O en su defecto `message-core.ts`) |

---

## 📐 2. Contrato de Telemetría (Event Sourcing Puro)

El flujo de telemetría debe ser "desacoplado". Ninguna falla en la telemetría debe interferir con el pipeline principal. Se usará `coreEventBus`.

```typescript
// Contrato base para los eventos del semáforo
export interface PipelineTelemetryEvent {
  messageId: string;               // Identificador primario del rastro
  conversationId: string;          // Para agrupamiento en la UI
  step: PipelineNodeStep;          // 'ingreso', 'proyeccion', 'worker', 'dispatcher', 'runtime', 'certificacion', 'entrega'
  status: 'pending' | 'processing' | 'success' | 'error';
  metadata?: {
    runtimeId?: string;            // Ej. @fluxcore/fluxi (Demo de Soberanía)
    model?: string;
    errorDetail?: string;
    latencyMs?: number;
  };
  timestamp: string;
}
```

---

## 🏗️ 3. Fases de Implementación (Basado en SYSTEM_REFACTORING_METHODOLOGY.md)

Para evitar el "desvío" que sufrió la idea original (implementación apresurada, broadcasting masivo que rompió el protocolo), dividimos el trabajo en **3 fases incrementales y validadas**:

### 🟢 Fase 1: Inyección Silenciosa (Backend Core)
**Criterio de éxito:** Los eventos fluyen en la consola del servidor sin romper nada.
1. Crear un archivo `telemetry.types.ts` con los contratos de eventos.
2. Intervenir los 7 archivos listados arriba inyectando `coreEventBus.emit('telemetry:pipeline_step', data)`.
3. Propagar el `messageId` a lo largo del paso de Worker y Dispatcher (asegurarse de que el contexto de ejecución no pierda el ID del mensaje origen).
4. Crear un logger de debugging nativo en el bus que solo imprima `[Telemetría] Mensaje {id} -> Paso {step}: {status}`.

### 🟡 Fase 2: Pista Controlada de WebSocket
**Criterio de éxito:** Los eventos llegan *solo* al frontend de Kernel Console.
1. Modificar `ws-handler.ts` (`apps/api/src/websocket/ws-handler.ts`).
2. Implementar regla restrictiva (Error 1 superado): El broadcasting de estos eventos **solo** se emitirá si la conexión WebSocket declara explícitamente ser de la Kernel Console en su handshake (`role: 'kernel_console'` o similar).
3. Suscribir el `ws-handler` al `coreEventBus` (`telemetry:pipeline_step`).

### 🔴 Fase 3: Renderizado Visual de Soberanía (Frontend Kernel Console)
**Criterio de éxito:** El usuario "ve" el semáforo y se siente en control.
1. En el frontend de Kernel Console (`KERNEL_CONSOLE_V4_SPECIFICATION.md`), añadir el panel **"Pipeline Cognitivo en Vivo"**.
2. Almacenar el estado de los mensajes activos en memoria y dibujar la matriz:
   - `⚪ Gris`: Pendiente
   - `🟡 Amarillo`: Activo/Pulsante
   - `🟢 Verde`: Completado
   - `🔴 Rojo`: Fallo
3. Destacar enfáticamente la metadata `runtimeId` cuando el paso 4 (CognitiveDispatcher) emita su evento.

---

## 🚨 Prevención de Regresiones
Siguiendo los **Principios de Diseño Seguro**:
- **Cambios Compatibles:** El `coreEventBus` emitirá eventos opcionales. No interrumpe flujos.
- **Errores Silenciosos en Telemetría:** Es el ÚNICO lugar donde usaremos `catch` silencioso (o logger). "*Un error pintando el semáforo no debe matar el mensaje que va a la IA*".
- **Filtro de Ruido:** Limpieza automática en UI para mensajes cuyo pipeline terminó hace > 60 segundos.
