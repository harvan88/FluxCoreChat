# FLUXCORE — CANON ARQUITECTÓNICO MAESTRO (v7.0)

Este es el documento supremo.
Define la ontología, arquitectura y reglas operativas de FluxCore.
Si el código contradice este documento, el código está en error.

---

## 1. Ontología: El Sistema Operativo de Trabajo (WOS)

FluxCore **no es un chatbot ni un agregador de modelos**.
FluxCore es un **Work Operating System (WOS)**: un sistema que permite a una empresa operar su actividad mediante lenguaje natural.

El chat es la interfaz.
La IA es un mecanismo.
El resultado real del sistema son **acciones operativas auditables**.

El mensaje es efímero.
El Work es la entidad persistente de negocio.

---

## 2. Sistemas que componen la arquitectura

La arquitectura está formada por sistemas independientes con responsabilidades no superpuestas.

### 2.1 ChatCore — Sistema de Comunicación (Agnóstico)

ChatCore es el sistema de mensajería.

Responsabilidades:

* recibir mensajes de canales
* persistir conversaciones
* emitir eventos al bus
* renderizar UI conversacional
* exponer activos conversacionales (perfiles, plantillas, participantes, historiales)
* proveer infraestructura de configuración extensible (Configuration Slots)

ChatCore **no contiene inteligencia artificial ni lógica operativa de negocio**.

ChatCore no decide respuestas.
ChatCore no ejecuta operaciones.
ChatCore no conoce runtimes.
ChatCore no sabe que existe la IA.

ChatCore únicamente transporta información, dispara eventos y renderiza UI.

#### Test Ontológico de Propiedad

Para determinar si un dato pertenece a ChatCore se aplica esta pregunta:

> ¿Este dato existiría si no hubiera IA en el sistema?

Si la respuesta es **sí**, pertenece a ChatCore.
Si la respuesta es **no**, pertenece a FluxCore.

**Datos que pertenecen a ChatCore:**

* Perfil de la cuenta (nombre, bio, avatar)
* Conversaciones, mensajes, canales
* Notas del contacto (CRM básico: "Es un cliente VIP")
* Bus de eventos
* Infraestructura de Configuration Slots (UI extensible para extensiones)
* Registro de extensiones instaladas

**Datos que NO pertenecen a ChatCore** (pertenecen a FluxCore):

* Preferencias de atención (tono, emojis, formalidad)
* Reglas por contacto ("No hablar de precios")
* Modo de automatización (auto/suggest/off)
* Runtime activo
* Instrucciones de sistema para IA
* Configuración de modelos, providers, tools

#### Configuration Slots (Infraestructura Extensible)

ChatCore provee un mecanismo genérico para que las extensiones registren campos de configuración en la UI de la cuenta:

1. Una extensión declara un `configSchema` en su manifiesto.
2. ChatCore renderiza esos campos en la pantalla de configuración.
3. ChatCore persiste los valores como configuración de la extensión.
4. ChatCore **no interpreta** los valores. No sabe qué significan.

Esto permite que el usuario vea "Preferencias de Atención" en su panel de configuración sin que ChatCore sepa que existe una IA.

---

### 2.2 FluxCore — Extensión Cognitiva

FluxCore es una **extensión que reacciona a los eventos de ChatCore**.

Responsabilidades:

* leer el mensaje
* resolver las políticas de atención (de su propia configuración)
* determinar qué runtime ejecutar
* empaquetar el PolicyContext
* ejecutar el runtime seleccionado
* devolver un resultado final

FluxCore no es el chat.
FluxCore no es el negocio del cliente.
FluxCore es el **intérprete inteligente entre conversación y operación**.

> **Nota de implementación:** FluxCore no "despierta sola". Es cargada y ejecutada por el `ExtensionHost` del Core API, que gestiona el ciclo de vida de las extensiones.

---

### 2.3 Sistemas de Dominio (Externos)

Son los sistemas donde vive la operación real del negocio:

Ejemplos: agendas de turnos, sistemas de pedidos, catálogos, ERPs, CRMs, sistemas de pago, servicios de mapas.

No pertenecen ni a ChatCore ni a FluxCore.

FluxCore permite operarlos mediante conversación, pero **no es propietario de ellos**.

---

## 3. La Capa de Políticas (Pre-Ejecución)

Antes de ejecutar cualquier runtime, FluxCore resuelve un **PolicyContext** leyendo su propia configuración:

El PolicyContext incluye:

* tono y formalidad
* uso de emojis
* idioma preferido
* comportamiento fuera de horario
* reglas de automatización (modo, delay)
* reglas específicas por contacto
* condiciones de respuesta

Estos datos se persisten como configuración de FluxCore (vía Configuration Slots de ChatCore), no como datos de ChatCore.

El PolicyContext se entrega al runtime como contexto obligatorio.
Los runtimes **no definen el comportamiento base**.
Lo reciben ya resuelto.

La política más importante es el **modo de automatización** (`automatic`, `suggest`, `disabled`). Este modo determina si el runtime se ejecuta automáticamente, genera una sugerencia para aprobación humana, o no se invoca. Es un gate previo al runtime, no una decisión del runtime.

---

## 4. Runtimes de Ejecución

FluxCore posee múltiples runtimes posibles.

Un mensaje siempre es resuelto por **un único runtime**.

Los runtimes:

* no se llaman entre sí
* no se delegan tareas
* no se superponen

Son alternativas completas de ejecución.

El runtime activo lo elige el cliente desde la configuración administrativa.

FluxCore solo respeta esa decisión.

---

### 4.1 Runtime Fluxi / WES (`@fluxcore/fluxi`)

Naturaleza: transaccional determinista.

Flujo:
mensaje → interpretación → ProposedWork → Work (FSM) → ejecución → respuesta

No está diseñado para conversar.
Está diseñado para **resolver operaciones de negocio garantizadas**.

Especificación técnica: `FLUXCORE_WES_CANON.md`.

---

### 4.2 Runtime Asistentes Local (`@fluxcore/asistentes`)

Naturaleza: cognitiva probabilística, ejecución local.

Flujo:
mensaje → prompt building → llamada LLM (Groq/OpenAI completions) → tool loop → respuesta

Ejecuta todo el pipeline cognitivo dentro de FluxCore.

Especificación técnica: `FLUXCORE_ASISTENTES_CANON.md`.

---

### 4.3 Runtime Asistentes OpenAI (`@fluxcore/asistentes-openai`)

Naturaleza: cognitiva probabilística, ejecución remota.

Flujo:
mensaje → thread OpenAI → run con assistant externo → respuesta

Delega la ejecución cognitiva a la plataforma OpenAI Assistants API.
FluxCore actúa como puente, inyectando PolicyContext e instrucciones.

Especificación técnica: `FLUXCORE_ASISTENTES_CANON.md`.

---

## 5. Ciclo de Vida del Mensaje

1. ChatCore recibe el mensaje
2. ChatCore lo persiste
3. ChatCore publica un evento
4. FluxCore despierta (vía ExtensionHost)
5. FluxCore resuelve el PolicyContext (de su propia configuración)
6. FluxCore consulta qué runtime eligió la cuenta
7. FluxCore ejecuta el runtime seleccionado con el PolicyContext
8. El runtime genera el resultado final
9. ChatCore entrega la respuesta al usuario

---

## 6. Capacidades Compartidas (Tools)

Las herramientas **no pertenecen ni a FluxCore ni a los runtimes**.

Las herramientas son puentes hacia sistemas de dominio externos.

FluxCore mantiene un **registro de capacidades disponibles** y **media el acceso** (valida permisos, aplica políticas).

Pero **quien decide invocar una herramienta es el runtime**, no FluxCore.

FluxCore no sabe cuándo agendar, cuándo cobrar ni cuándo buscar una dirección.
Eso lo sabe el runtime que está procesando el mensaje.

Flujo:

1. El runtime decide que necesita ejecutar una herramienta.
2. FluxCore valida que el runtime tiene permiso para usarla.
3. FluxCore media la invocación hacia el sistema externo.
4. El sistema externo realiza la acción real.
5. FluxCore devuelve el resultado al runtime.

---

## 7. Reglas Inviolables

1. ChatCore nunca ejecuta lógica de negocio.
2. ChatCore nunca sabe que existe la IA.
3. FluxCore nunca contiene la operación real del cliente.
4. Los runtimes nunca se invocan entre sí.
5. El cliente decide qué runtime responde.
6. Toda acción irreversible requiere evidencia textual.
7. Las políticas de atención pertenecen a FluxCore, no a ChatCore.
8. Las herramientas son registradas y mediadas por FluxCore, pero la decisión de invocarlas es del runtime.
9. Un runtime recibe un mensaje y siempre debe producir un resultado (respuesta, sugerencia o señal de no-acción justificada).
10. Los datos de configuración de FluxCore se persisten vía Configuration Slots de ChatCore, pero ChatCore no los interpreta.

---

## 8. Extensibilidad

Un nuevo runtime puede agregarse sin modificar ChatCore.

Un nuevo sistema de dominio puede integrarse sin modificar los runtimes.

ChatCore provee la conversación y la infraestructura de UI extensible.
FluxCore provee la inteligencia, las políticas y la mediación de capacidades.
Los sistemas externos proveen la operación.

FluxCore es el puente entre lenguaje natural y acción real.
