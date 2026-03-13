# FluxCore Signal Canon (v7.0)

> Actualizado 2026-02-14: Alineado con RFC-0001 (Kernel Freeze)

## 1. El Lenguaje de la Realidad

En FluxCore, el **Kernel** es ciego a la tecnología de los canales y a la semántica del negocio. No existen "mensajes de WhatsApp" ni "intenciones de compra"; solo existen **Observaciones Físicas Certificadas**.

Este documento define la ontología única y soberana de entrada de datos al sistema (`fluxcore_signals`).

---

## 2. Definición Canónica: `FluxcoreSignal`

Una señal es la representación inmutable de un suceso físico, certificada por un **Reality Adapter**.

### Propiedades Fundamentales (Invariant)

| Campo | Propósito |
| :--- | :--- |
| `sequence_number` | Reloj lógico global (orden total). Única fuente de verdad temporal del sistema. |
| `signal_fingerprint` | Hash SHA-256 determinista (`adapter + source + checksum`) para idempotencia física. |
| `fact_type` | Categoría ontológica física (ver sección 3). |
| `source` | `{namespace, key}`. Origen causal técnico (ej: `whatsapp/message_id`). |
| `evidence_raw` | Payload crudo del driver (JSONB). Jamás interpretado por el Kernel. |
| `provenance` | Metadatos de origen (`driver_id`, `entry_point`). |
| `certified_by` | Adapter ID + Versión + Firma HMAC. |

---

## 3. Ontología Física (Fact Types)

El Kernel **SOLO** acepta las siguientes 6 clases de hechos físicos. Cualquier semántica de negocio ("Cliente compró", "Usuario saludó") debe ser derivada en proyectores, no en el Kernel.

### A. `EXTERNAL_INPUT_OBSERVED`
Un actor externo envió información deliberada hacia el sistema.
*   **Ejemplos**: Mensaje de texto, audio, archivo, click en botón de respuesta rápida.
*   **Proyección**: Se convierte en `Message` o `Interaction` en el dominio de Chat.

### B. `EXTERNAL_STATE_OBSERVED`
Un cambio pasivo en el estado del mundo exterior.
*   **Ejemplos**: Confirmación de lectura (blue check), estado "escribiendo", cambio de perfil de usuario.
*   **Proyección**: Actualiza metadatos de `Conversation` o `Participant`.

### C. `DELIVERY_SIGNAL_OBSERVED`
El canal técnico confirma la entrega de una salida previa del sistema.
*   **Ejemplos**: Ack de recepción (sent/delivered), error de envío (failed).
*   **Proyección**: Actualiza estado de `Message` (ej: tick gris/doble tick).

### D. `MEDIA_CAPTURED`
Ingreso de un activo binario persistente.
*   **Ejemplos**: Imagen subida a S3, documento adjunto procesado.
*   **Proyección**: Creación de `Asset` en el registro de medios.

### E. `SYSTEM_TIMER_ELAPSED`
El paso del tiempo alcanzó un hito agendado internamente.
*   **Ejemplos**: Timeout de espera, scheduler cron.
*   **Proyección**: Dispara evaluaciones de políticas o transiciones de Work.

### F. `CONNECTION_EVENT_OBSERVED`
Cambios en la topología de conexión del Adapter.
*   **Ejemplos**: Webhook desconectado, re-autenticación requerida.
*   **Proyección**: Alertas de infraestructura (Ops).

---

## 4. El Rol del Reality Adapter

Los drivers ya no hablan con el Kernel. Todo pasa por un **Reality Adapter** (Service) que:

1.  Recibe la `ExternalObservation` del driver.
2.  Normaliza a una de las 6 clases físicas.
3.  **Firma criptográficamente** la señal con su `signing_secret`.
4.  Invoca `kernel.ingestSignal()`.

El Kernel rechaza cualquier señal que no venga de un Adapter clase `SENSOR` o `GATEWAY`. Los intérpretes de IA (`INTERPRETER`) jamás escriben en el Kernel.

---

## 5. Proyección de Identidad

El Kernel **NO** resuelve identidades. No sabe quién es "Juan Pérez".
*   El Kernel solo registra: `source: whatsapp/12345` y `evidence: { phone: "+54911..." }`.
*   Un **Identity Projector** lee esa señal, busca en el `Identity Graph`, y decide si es un nuevo Actor o uno existente.
*   El `account_id` (contexto comercial) se deriva en tiempo de proyección, nunca en tiempo de ingesta.

---

## 6. Señales de Autenticación (Login vía Kernel)

> Vigente para Refactor 2 — aún sin implementación en adapters.

| Señal | `fact_type` | Evidencia mínima (`evidence_raw`) | Descripción |
| :--- | :--- | :--- | :--- |
| `Identity.LoginRequested` | `EXTERNAL_INPUT_OBSERVED` | `{ accountPerspective, identifier, method, deviceHash }` | El adapter de UI certifica que un humano inició un intento de acceso (form, magic link, OTP). |
| `Identity.LoginSucceeded` | `EXTERNAL_INPUT_OBSERVED` | `{ accountId, actorId, sessionId, scopes, deviceHash }` | El projector de identidad confirma credenciales válidas y crea sesión soberana. |
| `Identity.SessionInvalidated` | `EXTERNAL_STATE_OBSERVED` | `{ sessionId, reason, actorId?, accountId? }` | Invalida sesiones (logout voluntario, credenciales revocadas, device mismatch). |

**Invariantes**

1. Todas las señales deben incluir `provenance_entry_point` que indique el tenant/account sobre el cual opera la UI.
2. `deviceHash` se usa para detectar reuse de sesiones; no se persiste en claro fuera del evidence.
3. Solo `IdentityProjector` puede emitir `LoginSucceeded` a partir de `LoginRequested`; los adapters no pueden autocertificar éxito.
4. SessionInvalidated se produce tanto por acciones humanas como por reglas de seguridad (timeouts, cambios de contraseña).

Estas señales alimentan el **Session Projector**, que mantendrá `fluxcore_session_projection` para ser consumido por la UI y las APIs administrativas.

---

## 6. Invariantes del Sistema (Soberanía)

1.  **Ingreso Atómico**: `fluxcore_signals` es "Append-Only". `UPDATE` y `DELETE` están prohibidos a nivel motor de base de datos.
2.  **Verdad vs Interpretación**: El Kernel dice "Recibí X". El Proyector dice "X significa Y". Si la interpretación cambia, se re-proyecta; el Kernel nunca cambia.
3.  **Orden Total**: Todo el sistema se puede reconstruir determinísticamente leyendo el Journal por `sequence_number`.
