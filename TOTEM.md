# 🏛️ TOTEM ARQUITECTÓNICO DE FLUXCORE

> **Estado del Documento: VIVO / ACTUALIZABLE**  
> *Este documento es la fuente de verdad suprema de la arquitectura del sistema. La "prohibición de modificación" de versiones anteriores ha sido levantada formalmente para permitir que evolucione junto con el proyecto, reflejando siempre el canon arquitectónico definitivo.*
> *Si el código contradice este documento, el código está en error.*

---

## 1. LOS TRES DOMINIOS CANÓNICOS

El sistema opera sobre una separación estricta de responsabilidades en tres dominios que no se superponen:

### 1.1 ChatCore (El Cuerpo y Sistema de Comunicación)
ChatCore es el sistema de mensajería y el custodio estructural.
- **Responsabilidad:** Opera el mundo conversacional humano. Mantiene cuentas, perfiles, conversaciones, mensajes, participantes, canales, assets, plantillas y entrega en tiempo real.
- **Limitación:** No contiene inteligencia artificial ni lógica operativa de negocio. ChatCore no sabe que existe la IA. Únicamente transporta información, dispara eventos WebSocket y renderiza UI.

### 1.2 Kernel (La Ley y El Notario)
El Kernel es la frontera soberana de la realidad física.
- **Responsabilidad:** Registra observaciones físicas certificables y garantiza que todo el estado del sistema pueda reconstruirse leyendo el Journal (`fluxcore_signals`) en orden.
- **Limitación:** El Journal es append-only e inmutable. El Kernel no toma decisiones, sólo certifica hechos (`EXTERNAL_INPUT_OBSERVED`, `CONNECTION_EVENT_OBSERVED`, `AI_RESPONSE_GENERATED`, etc.) que le entregan los *Reality Adapters* autorizados.

### 1.3 FluxCore (El Cerebro y Sistema Operativo de Trabajo)
FluxCore es el dominio cognitivo y de gobernanza (Work Operating System).
- **Responsabilidad:** Toma hechos ya certificados del Kernel (vía proyectores), resuelve el contexto del negocio, invoca un runtime adecuado y produce acciones mediadas.
- **Limitación:** FluxCore NO entrega respuestas directamente al cliente ni las persiste en la tabla de ChatCore. Emite sus decisiones de vuelta al Kernel para su certificación.

---

## 2. LA INTERSECCIÓN Y LOS PROYECTORES

Los **Projectors** son el único mecanismo autorizado para derivar estado a partir del Kernel.
- Son funciones puras y atómicas. Leen el Journal, materializan el estado derivado y avanzan su cursor en la misma transacción.
- El orden de ejecución es crítico: `IdentityProjector` -> `ChatProjector` -> `SessionProjector`.

### Regla Fundamental de Intersección
**ChatCore es soberano del almacenamiento estructural del mensaje.**
1. ChatCore persiste el mensaje humano nativo.
2. ChatCore (vía Gateway) pide al Kernel que certifique que el hecho ocurrió.
3. El `ChatProjector` observa la señal del Kernel y **solamente correlaciona** (actualiza el apuntador `signalId` en ChatCore) y encola el turno para la cognición de FluxCore.

---

## 3. EL LIVE COGNITIVE PIPELINE

Es la columna vertebral técnica que procesa cada interacción cognitiva. Sigue este flujo lineal estricto:

1. **Cognition Worker:** Desencola un turno validado de `fluxcore_cognition_queue` cuando vence la ventana temporal de espera (Turn-Window). No reacciona a señales individuales esporádicas, reacciona a **turnos maduros**.
2. **Cognitive Dispatcher:** Resuelve el contexto total antes de invocar a la IA:
   - `PolicyContext`: La política de negocio de la cuenta (tono, horarios de atención, modo: *auto/suggest/off*).
   - `RuntimeConfig`: La configuración técnica autorizada (modelo de IA, prompt primario, herramientas).
3. **Runtime Gateway:** Invoca al *Runtime* activo (`asistentes-local`, `asistentes-openai`, `fluxi-runtime`). El runtime evalúa toda la historia y el contexto, pero **no ejecuta efectos directos sobre el mundo**. Devuelve un set de acciones a efectuar.
4. **Action Executor:** Intercepta las acciones y ejecuta los efectos transaccionales reales. Inyecta `send_message`, audita, y propaga un flag de `stopPropagation` si el runtime indica que el flujo le pertenece exclusivamente (ej: WES).
5. **Cognition Gateway:** Certifica la salida cognitiva final enviando una señal de vuelta al Kernel.

---

## 4. WES (WORK EXECUTION SYSTEM) Y FLUXI

Fluxi es un subsistema vital, un runtime alternativo que gestiona procesos de negocio transaccionales y deterministas, no sólo "charlas".

- **Work:** Estructura lógica y auditable que administra un proceso de negocio en tramos (ej: agendar un turno).
- **Stop Propagation (Exclusividad):** Cuando Fluxi detecta una intención transaccional y "abre un Work", invoca `stopPropagation: true`. Esto detiene la propagación para que ningún otro LLM rudimentario intervenga o alucine en medio del workflow transaccional.
- **Transición Determinista:** La IA interpreta las respuestas del cliente para extraer variables (slots), pero el motor de estados finitos (FSM) es el que rige la validación para desencadenar el efecto externo puro de manera blindada (exactly-once).

---

## 5. REGLAS E INVARIANTES DOGMÁTICAS

1. **Identidad Universal (Actor Model):** La identidad canónica de todo emisor en el sistema es `fromActorId` (sea un usuario real, IA, webhook o un visitante sin identificar). `accountId` determina el ámbito, `actorId` el ejecutor individual.
2. **Assets de Primera Clase:** Toda entidad multimedia o archivo es un `Asset` gestionado con un ID inmutable, storage auditado y firma criptográfica. Nunca un simple string URL flotante.
3. **Delegación Ciegas (No-Direct DB Reads):** El runtime de texto JAMÁS debe consultar la base de datos (ChatCore o métricas) por sí mismo en tiempo real. Todas las dependencias son consultadas previamente por el dispatcher y servidas en bandeja (Runtime Input) al LLM.
4. **Gestión de Cuentas (Tenant Model):** Un humano se loggea, pero la operación fluye en Cuentas. Todo el contexto es `accountId` first. Una persona puede tener 5 perfiles de negocio operacionales inconexos.

---
*Este TÓTEM reemplaza toda directiva arquitectónica previa en la base de datos de conocimiento y subordina los detalles de implementación a las especificaciones contenidas en `docs/reconstruction-phase-1/core/`.*
