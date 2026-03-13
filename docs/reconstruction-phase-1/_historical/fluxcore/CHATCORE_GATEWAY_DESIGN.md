# Diseño Técnico: ChatCore Reality Adapter (`chatcore-gateway`)

> **Estado:** Propuesta de Diseño (RFC)
> **Fecha:** 2026-02-18
> **Objetivo:** Definir el componente que certifica la realidad de la comunicación humana interna ante el Kernel de FluxCore.

---

## 1. Definición de Observación del Mundo

En el contexto de ChatCore, debemos distinguir tres niveles de eventos para no confundir el mapa con el territorio:

1.  **Evento de UI (Intención):** El usuario hace clic en "Enviar". Es efímero, ocurre en el cliente y no garantiza que el sistema lo haya recibido. No es un hecho certificado hasta que cruza la frontera del sistema.
2.  **Cambio de Base de Datos (Estado):** Un registro insertado en la tabla `messages`. Esto es una consecuencia interna, un efecto secundario del software. Puede ocurrir por replicación, restauración de backups, migraciones o scripts. **No es una observación válida** porque carece de contexto causal (¿quién lo causó? ¿cuándo? ¿bajo qué condiciones?).
3.  **Acción Humana Real (Hecho):** El momento en que la frontera del sistema (API/WebSocket) recibe, valida y acepta un payload de comunicación proveniente de un agente externo autenticado. **Esta es la única observación válida.**

**Definición:** Una "observación del mundo" en ChatCore es la recepción exitosa de un paquete de datos comunicativo en la frontera del sistema, autenticado como proveniente de un actor humano o externo legítimo.

---

## 2. El Punto de Certeza Causal

El único momento donde existe certeza causal irrefutable de que "un humano intentó comunicarse" es en el **Controller/Handler de la API**, inmediatamente después de la autenticación y validación del payload, pero **antes** de cualquier persistencia o lógica de negocio.

*   **Por qué NO en `message.created` (DB Trigger/Hook):**
    *   La DB no sabe si el mensaje vino de un humano, de un script de seed, de una migración o de un restore.
    *   La DB no tiene acceso a la "evidencia cruda" (headers HTTP, IP, device info) necesaria para la certificación forense.
    *   Acopla el Kernel al esquema de almacenamiento, violando la soberanía.

*   **Por qué NO en el Cliente (UI):**
    *   El cliente es tierra hostil (inseguro, modificable).
    *   No podemos confiar en que el cliente diga "esto pasó". El servidor debe certificar "yo vi que esto pasó".

**Punto Exacto:** El `ChatCoreGateway` debe interceptar la solicitud en la capa de transporte (API Route / WS Event Handler).
1.  Recibe Request.
2.  Valida Auth (Token).
3.  **CERTIFICA HECHO (Llama a Kernel).**
4.  Si Kernel acepta -> Procede a `MessageCore` (Lógica de Negocio).

---

## 3. Modelo Causal del Adapter

### Quién es el Observador
El observador no es "la base de datos" ni "el usuario".
El observador es **`fluxcore/chatcore-gateway`**.
Es el componente de software autorizado para dar fe ante el Kernel de que recibió comunicación interna.

### Identidad que Firma
La observación se firma con la identidad del componente de infraestructura, no del usuario.
*   `certified_by_adapter`: `fluxcore/chatcore-gateway`
*   `provenance_driver_id`: `@fluxcore/chatcore` (Representa el canal "Chat Interno")

### Prevención de Auto-Observación (Loops)
El sistema genera mensajes (AI responses, system notifications). El Kernel NUNCA debe reaccionar a sus propios ecos.

**Mecanismo de Defensa:**
1.  El Gateway solo certifica payloads que provienen de rutas/eventos **exclusivos de usuarios** (e.g., `POST /messages` con token de usuario).
2.  Los mensajes generados por la IA (`actionExecutor`) se inyectan directamente en la capa de servicio (`MessageCore`) **bypasseando el Gateway**.
3.  **Regla de Oro:** Si el origen es interno (servicio, worker, script), NO pasa por el Gateway. Solo el tráfico de frontera (Ingress) pasa por el Gateway.

---

## 4. Idempotencia y Replay

El Kernel es un *append-only log*. No se puede "deshacer" una observación.
Si restauramos la base de datos de ChatCore o re-procesamos logs, no podemos duplicar señales en el Kernel.

**Estrategia de Idempotencia Causal:**
El `signal_fingerprint` debe ser determinista y derivado únicamente de la evidencia, no de IDs autogenerados por la DB.

Formula del Fingerprint:
`HMAC_SHA256( provenance_driver_id + source_key + client_provided_id + timestamp_bucket )`

*   `client_provided_id`: Un UUID generado por el cliente (frontend) para cada mensaje (deduplicación optimista).
*   Si el cliente no envía ID, se usa hash del contenido + timestamp exacto.

**Comportamiento ante Replay:**
Al intentar insertar una señal con el mismo `signal_fingerprint`:
1.  El Kernel detecta colisión (Constraint Unique).
2.  El Kernel responde "Ya observado".
3.  El Gateway detiene el procesamiento (o lo marca como re-entrega segura), pero **no genera una nueva señal**.

---

## 5. Evidencia Cruda (`evidence_raw`)

Para que un auditor externo pueda validar el hecho sin ver la tabla `messages`, la evidencia debe contener:

```json
{
  "content": {
    "text": "Hola, necesito ayuda",
    "attachments": []
  },
  "metadata": {
    "clientTimestamp": "2026-02-18T14:30:00Z",
    "deviceInfo": "Mozilla/5.0...",
    "ip": "203.0.113.1"
  },
  "context": {
    "conversationId": "uuid-convo", // Si existe
    "targetAccountId": "uuid-dest"  // Intención de destino
  },
  "security": {
    "authMethod": "bearer_token",
    "scope": "user"
  }
}
```

*Nota:* No se incluyen IDs de base de datos internos (PKs) que aún no existen. Se incluyen los identificadores públicos o de intención.

---

## 6. Esquema de Identidad

El Kernel necesita saber QUIÉN y DÓNDE.

### Caso A: Comunicación Interna (Cuenta a Cuenta)
*   **Source Namespace:** `@fluxcore/internal`
*   **Source Key:** `uuid-account-id` (La identidad autenticada del remitente)
*   **Subject Namespace:** `@fluxcore/internal`
*   **Subject Key:** `uuid-account-id` (El actor es la misma cuenta)

### Caso B: Visitante Web Anónimo
*   **Source Namespace:** `@fluxcore/web-visitor`
*   **Source Key:** `fingerprint-browser-hash` (Identidad efímera)
*   **Subject Namespace:** `@fluxcore/anonymous`
*   **Subject Key:** `fingerprint-browser-hash`

### Caso C: Futuro Widget Público
*   **Source Namespace:** `@fluxcore/widget`
*   **Source Key:** `widget-session-id`
*   **Subject Namespace:** `@fluxcore/external`
*   **Subject Key:** `email-o-telefono-proporcionado` (si existe)

---

## 7. Flujo Completo Diseñado

1.  **Humano:** Escribe en UI y pulsa Enviar.
2.  **Cliente:** Genera `client_msg_id` (UUID) y envía `POST /api/chat/messages`.
3.  **API (Frontera):**
    *   Valida Token JWT.
    *   **INTERCEPTOR (ChatCoreGateway):**
        *   Construye `evidence_raw` con payload + headers.
        *   Calcula `signal_fingerprint`.
        *   Invoca `Kernel.ingestSignal(EXTERNAL_INPUT_OBSERVED)`.
4.  **Kernel:**
    *   Verifica unicidad de fingerprint.
    *   Persiste en `fluxcore_signals`.
    *   Emite `kernel:wakeup`.
    *   Retorna `signal_sequence` y `success`.
5.  **ChatCoreGateway:**
    *   Si Kernel rechaza (duplicado): Retorna 200 OK (idempotencia).
    *   Si Kernel acepta: Pasa el control a `MessageCore`.
6.  **MessageCore (Lógica):**
    *   Recibe el payload.
    *   (Opcional) Usa `signal_sequence` para correlacionar.
    *   Persiste en `messages` y `conversations`.
7.  **Projectors (Async):**
    *   `ChatProjector` lee la señal del Kernel.
    *   Verifica que el mensaje ya esté en `messages` (o lo crea si la arquitectura es puramente reactiva).
    *   Activa `CognitionQueue`.

**Resultado:** FluxCore reacciona a la **Señal del Kernel**, garantizando que la IA solo responde a hechos certificados, independientemente del estado de la base de datos de chat.
