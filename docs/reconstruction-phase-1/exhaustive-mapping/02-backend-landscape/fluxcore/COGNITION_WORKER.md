# Cognition Worker – El Corazón del Sistema

**Ubicación:** `apps/api/src/workers/cognition-worker.ts`  
**Responsabilidad:** "The Turn-Window Clock". Es el motor de latido (heartbeat) de FluxCore. Detecta cuándo el usuario ha dejado de escribir y dispara el procesamiento cognitivo.

---

## 🧩 1. Propósito y Canon

Según el **Canon §4.5 (The Turn-Window Clock)**, la IA no debe interrumpir al humano mientras piensa o escribe. El `CognitionWorker` es responsable de:
1. Observar la cola `fluxcore_cognition_queue`.
2. Detectar "turnos listos" (donde el tiempo límite expiró y no hay actividad reciente).
3. Asegurar concurrencia segura usando bloqueos de base de datos.
4. Delegar el procesamiento al `CognitiveDispatcher`.

---

## 🔄 2. Flujo de Procesamiento (Processing Flow)

El worker opera en un modelo híbrido (Event-Driven + Polling de respaldo):

1. **Wakeup Event:** `ChatProjector` emite `kernel:cognition:wakeup` cuando llega un mensaje o cesa la actividad de escritura.
2. **Búsqueda (Polling):** Busca entradas en `fluxcore_cognition_queue` donde:
   - `processed_at IS NULL`
   - `turn_window_expires_at < NOW()`
   - `attempts < MAX_ATTEMPTS` (máximo 3 reintentos).
3. **Bloqueo (Concurrency):** Usa una consulta cruda SQL `FOR UPDATE SKIP LOCKED` para asegurar que ningún otro worker procese la misma conversación.
4. **Delegación:** Pasa la estafeta llamando a `cognitiveDispatcher.dispatch()`.
5. **Backoff (Resiliencia):** Si hay un error, incrementa el contador `attempts` y aplica backoff exponencial (espera más tiempo antes del próximo reintento).

---

## ⏱️ 3. SmartDelay v8.2

Es la característica clave para una interacción natural:
- Cada nuevo mensaje **extiende** la ventana de turno (hecho por `ChatProjector`).
- Cada señal de "typing" (escribiendo) **también extiende** la ventana.
- El Worker **solo se dispara cuando detecta silencio** prolongado, permitiendo al usuario completar su pensamiento antes de que la IA responda.

---

## 📡 4. Telemetría y Trazabilidad

El worker emite métricas a `coreEventBus` bajo el evento `telemetry:pipeline_step`:
- **Inicio:** `status: 'processing'`
- **Éxito:** `status: 'success'`
- **Error:** `status: 'error'` con metadatos del fallo.
Estas señales se utilizan para construir la vista en vivo del pipeline cognitivo.

---

## 📋 5. Dependencias Clave

- **`db.execute()`:** Requiere SQL crudo porque Drizzle ORM no soporta de forma nativa bloqueos de nivel de fila (`FOR UPDATE SKIP LOCKED`) en todas sus variantes.
- **`cognitiveDispatcher`:** Recibe el `turnId`, `conversationId`, `accountId` y la última secuencia de señal.
- **`coreEventBus`:** Para recibir el `wakeup` y emitir telemetría.
