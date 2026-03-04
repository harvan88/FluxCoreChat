# ChatCore — Visión Arquitectónica

**Documento de Visión | Febrero 2026**

---

## 1. Declaración de Propósito

ChatCore es el sistema de comunicación empresarial de la plataforma Meetgar. Su propósito no es ser un chat — es ser **la infraestructura de comunicación sobre la cual un negocio opera toda su relación con el mundo exterior**, incluyendo clientes, prospectos, proveedores, equipos internos y sistemas automatizados.

La diferencia entre ChatCore y un chat convencional es la misma que existe entre un sistema operativo y una aplicación. Un chat convencional es una aplicación que resuelve un caso de uso: enviar y recibir mensajes. ChatCore es la capa base sobre la cual se construyen todos los casos de uso comunicacionales de un negocio — desde la primera interacción de un visitante anónimo hasta la ejecución de una operación comercial completa, pasando por la gestión de equipos, la coordinación de procesos y la integración con sistemas externos.

ChatCore no contiene inteligencia artificial. No contiene lógica de negocio. No toma decisiones. ChatCore **transporta información, persiste conversaciones, gestiona identidad, administra activos multimedia y renderiza la interfaz**. La IA, la lógica operativa y las decisiones de negocio viven en FluxCore — un sistema separado que opera *sobre* ChatCore sin que ChatCore lo sepa.

Esta separación no es un detalle de implementación. Es la decisión arquitectónica fundacional que permite que la IA sea intercambiable, que la lógica de negocio evolucione sin tocar la comunicación, y que la comunicación funcione con exactamente la misma calidad con o sin IA activada.

---

## 2. El Problema

Los sistemas de comunicación empresarial actuales — Intercom, Chatwoot, Crisp, Zendesk, WhatsApp Business — comparten un conjunto de limitaciones estructurales que no son bugs, sino consecuencias inevitables de sus decisiones de diseño:

**El mensaje es un registro plano en una tabla.** No tiene causalidad (no sabe a qué responde), no tiene versionado (editar sobreescribe), no tiene tipología semántica (un mensaje, una nota interna y una reacción son la misma cosa con distinto formato). Esto impide construir sobre el mensaje: no se puede rastrear un hilo de resolución, no se puede auditar qué dijo originalmente un operador antes de editar, no se puede diferenciar la comunicación interna de la externa sin hackear el schema.

**El multimedia es un adjunto, no una entidad.** Los archivos se almacenan como URLs relativas dentro del cuerpo del mensaje. No hay deduplicación, no hay versionado, no hay ciclo de vida. Si se migra el storage (de disco local a S3), se rompen todas las referencias. Si un archivo se comparte en dos conversaciones, existe dos veces. Si se necesita extraer texto de un PDF para que la IA lo procese, no hay infraestructura para hacerlo sin reescribir el flujo completo.

**La IA es un módulo acoplado.** En la mayoría de los sistemas, la IA es un middleware que intercepta mensajes, decide responder o no, y genera una respuesta. Esto crea dependencia estructural: si la IA falla, el flujo de comunicación se degrada. Si se quiere cambiar de proveedor de IA, hay que reescribir la integración. Si se quiere que la IA haga algo nuevo (como ejecutar una transacción), hay que modificar el pipeline de mensajes.

**La identidad es binaria.** O eres un usuario registrado o no existes. Los visitantes anónimos son ciudadanos de segunda clase — sus conversaciones viven en una bandeja separada, con funcionalidad limitada, y la transición a usuario registrado pierde contexto o crea duplicados.

**La comunicación multicanal es superficial.** WhatsApp, Telegram, web chat y correo electrónico son canales separados con integraciones separadas. El mismo cliente que escribe por WhatsApp y por web es, para el sistema, dos personas diferentes. Unificar requiere lógica de matching manual o automática que ninguno resuelve de forma nativa.

Estas limitaciones no se corrigen con features adicionales. Se corrigen con un cambio de paradigma en el diseño del sistema de comunicación.

---

## 3. Lo que ChatCore Resuelve

ChatCore resuelve estas limitaciones en su capa más fundamental: el schema, el modelo de datos, y la arquitectura de servicios. No son features que se agregan — son capacidades que emergen del diseño.

### 3.1 El mensaje como evento causal

En ChatCore, un mensaje no es una fila en una tabla ordenada por timestamp. Es un **evento semántico** con identidad, causalidad y tipo.

Cada mensaje sabe:
- **A qué responde** (`parent_id`) — habilitando hilos de resolución, respuestas contextuales y trazabilidad causal.
- **De qué versión proviene** (`original_id` + `version`) — habilitando edición con historial completo, sin mutar ni perder el registro original.
- **Qué tipo de evento es** (`event_type`) — diferenciando mensajes, notas internas, reacciones, ediciones y eventos del sistema desde el schema, no desde convenciones del frontend.
- **Qué metadata porta** (`metadata` JSONB) — extensible sin migración para visibilidad, etiquetas, menciones, compartidos y cualquier atributo futuro.

Esto permite que la IA responda a un mensaje específico, no al último. Que un operador deje una nota interna invisible para el cliente sin salir de la conversación. Que una edición preserve el historial completo para auditoría. Que un mensaje se comparta en el perfil público del negocio sin copiarlo. Ninguna de estas capacidades requiere código adicional — están habilitadas por el schema.

### 3.2 Identidad continua, no binaria

En ChatCore, un visitante anónimo no es un concepto reducido a un formulario de contacto. Es un actor provisional con un `visitor_token` que tiene plena capacidad conversacional desde el momento en que envía su primer mensaje.

Cuando el visitante se registra, su identidad se promueve — no se crea una cuenta nueva. El historial conversacional, el contexto acumulado y los archivos compartidos migran con él. La transición es un hecho nuevo que se agrega al registro; el historial original permanece intacto porque así fue como ocurrió.

Este modelo también soporta la promoción gradual de identidad: un visitante puede ser identificado parcialmente (por ejemplo, por su nombre de WhatsApp) antes de completar un registro formal, sin perder continuidad.

### 3.3 Activos multimedia como entidades de primera clase

En ChatCore, un archivo no es una URL dentro de un campo JSON. Es un **Asset** — una entidad independiente con identidad, ciclo de vida, versionado, deduplicación e integridad verificable.

Cada asset:
- **Existe independientemente del mensaje.** Puede ser referenciado por mensajes, plantillas, planes de ejecución, bases de conocimiento y cualquier entidad futura.
- **Tiene ciclo de vida gestionado** (`pending → ready → archived → deleted`) con retención configurable y eliminación auditable.
- **Se deduplica por contenido** (SHA-256), no por nombre. Dos archivos idénticos subidos en distintas conversaciones generan un solo almacenamiento físico.
- **Vive en una capa de storage intercambiable** (disco local, S3, CloudStorage) sin cambiar una sola referencia en los mensajes o en el frontend.
- **Puede ser procesado asincrónicamente** por servicios de enriquecimiento (transcripción de audio, captioning de imágenes, extracción de texto de documentos) sin mutar el contenido original del usuario.

La implicación más importante de este modelo es que **los enriquecimientos se agregan, nunca reemplazan**. Si la IA transcribe un audio, esa transcripción es un registro separado que coexiste con el audio original. Si en el futuro se agrega un servicio de captioning de imágenes, solo necesita escuchar el evento de que un asset está listo y escribir un enriquecimiento. No toca el schema, no toca el core, no refactoriza — solo se agrega.

### 3.4 Desacoplamiento radical de la IA

ChatCore no sabe que la IA existe. Esta afirmación no es una aspiración de diseño — es una regla inviolable del sistema.

La consecuencia práctica es que **ChatCore funciona igual con la IA encendida o apagada.** Las conversaciones se crean, los mensajes se persisten, los archivos se gestionan, los perfiles se mantienen, las plantillas se almacenan — todo sin que intervenga ningún componente cognitivo.

FluxCore observa lo que ocurre en ChatCore a través de un Journal inmutable (event sourcing). Los hechos del mundo se registran como señales certificadas. Los proyectores derivan estado conversacional. El motor cognitivo evalúa y, si corresponde, produce acciones que se ejecutan a través de ChatCore como infraestructura — pero ChatCore no sabe que esas acciones vienen de una IA. Para ChatCore, es otro actor que envía mensajes.

Este desacoplamiento tiene tres consecuencias de largo plazo:

1. **La IA es intercambiable.** Se puede cambiar de OpenAI a Anthropic a un modelo local sin tocar ChatCore.
2. **La IA es graduable.** Se puede definir por cuenta qué nivel de automatización tiene (completa, sugerida, apagada) sin cambiar la infraestructura.
3. **La IA es auditable.** Cada acción de la IA está trazada desde la señal de entrada hasta el efecto producido, pasando por el Journal, la cola de cognición y el log de acciones.

---

## 4. Paradigma Arquitectónico

ChatCore y FluxCore operan bajo un paradigma combinado que no se adhiere a un framework comercial único, sino que integra los principios más estrictos de tres disciplinas:

### Event Sourcing (Journal Inmutable)
Toda observación del mundo externo se registra como un hecho inmutable en el Journal. El estado actual del sistema es siempre derivado: se reconstruye leyendo el Journal en orden. Esto garantiza reconstruibilidad total, auditabilidad completa y eliminación de estados corruptos — si el estado se corrompe, se regenera desde el Journal.

### CQRS (Command Query Responsibility Segregation)
La escritura (ingesta de señales) y la lectura (consulta de estado derivado) están completamente separadas. Las señales entran al Kernel. Los proyectores derivan tablas de lectura (mensajes, conversaciones, actores). Los runtimes cognitivos leen el estado derivado, nunca el Journal directamente. Esta separación permite optimizar cada lado de forma independiente sin comprometer la integridad.

### Domain Driven Design con Bounded Contexts
ChatCore y FluxCore son bounded contexts estrictos con interfaces definidas y sin dependencias circulares. ChatCore posee el dominio conversacional (mensajes, conversaciones, perfiles, plantillas, assets). FluxCore posee el dominio operativo (señales, cognición, runtimes, acciones). La comunicación entre dominios ocurre exclusivamente a través de eventos de dominio y tablas compartidas con ownership explícito.

### Soberanía del Runtime
Los componentes cognitivos (runtimes) reciben todo el contexto que necesitan para decidir en una sola invocación. No consultan bases de datos, no mantienen estado entre invocaciones, no se invocan entre sí. Son funciones puras en el sentido práctico: `input → decisions`. Esto los hace testeable unitariamente, intercambiables en caliente y resistentes a fallos parciales del sistema.

---

## 5. Alcance de ChatCore

El alcance de ChatCore se define por una pregunta:

> **¿Este dato existiría si no hubiera IA en el sistema?**

Si la respuesta es sí, pertenece a ChatCore. Si la respuesta es no, pertenece a FluxCore.

### Lo que ChatCore es:

| Dominio | Responsabilidad |
|---|---|
| **Conversaciones** | Persistencia, participantes, tipología (`internal`, `anonymous_thread`, `external`), estado de lectura |
| **Mensajes** | Persistencia con causalidad, versionado, tipología semántica, contenido multimedia referenciado por `assetId`, enriquecimientos como registros separados |
| **Assets** | Ingesta, almacenamiento, deduplicación, versionado, ciclo de vida, relaciones polimórficas con mensajes/plantillas/plans, procesamiento asincrónico, storage intercambiable |
| **Perfiles y Cuentas** | Datos de negocio (nombre, bio, avatar, horarios, ubicación, sitio web), perfil público |
| **Contactos y Relaciones** | Vínculos entre cuentas, notas de contacto, etiquetas |
| **Plantillas** | Respuestas estructuradas reutilizables con assets vinculados |
| **Identidad** | Actores registrados y provisionales, promoción de identidad, vinculación cross-canal |
| **Canales** | Web chat, widget embebible, perfil público. Cada canal es una puerta de entrada al mismo sistema |
| **Tiempo real** | WebSocket para broadcasting de mensajes, estados de escritura, presencia |
| **UI** | Bandeja de conversaciones, burbuja de mensaje, panel de contacto, editores, paneles de assets, player de audio con waveform |

### Lo que ChatCore no es:

| No es | Por qué no |
|---|---|
| Un motor de IA | La cognición vive en FluxCore |
| Un CRM | La gestión comercial puede integrarse, pero no es responsabilidad del chat |
| Un workflow engine | Los flujos operativos (Fluxi/WOS) viven en FluxCore |
| Un sistema de agendas | Las agendas son sistemas de dominio externo que FluxCore puede operar |
| Un email marketing | La comunicación masiva es un sistema separado |

---

## 6. Experiencia del Usuario

ChatCore se diseña para tres tipos de usuario con necesidades distintas pero que comparten la misma infraestructura:

### 6.1 El operador de negocio

El operador ve su bandeja de conversaciones. Cada conversación puede ser con un cliente registrado, un visitante anónimo del web chat o un contacto de WhatsApp — para el operador, la experiencia es la misma.

En su uso cotidiano, el operador puede:

- **Conversar** con clientes en tiempo real, con indicadores de lectura, escritura y presencia.
- **Enviar cualquier tipo de multimedia** — imágenes, audios, videos, documentos — sabiendo que cada archivo queda registrado como un asset trazable con su historial.
- **Responder a un mensaje específico**, creando hilos de resolución dentro de la misma conversación. No necesita buscar "de qué me están hablando" — el mensaje original está vinculado.
- **Dejar notas internas** que solo ve su equipo. Sin salir de la conversación, sin cambiar de herramienta, sin perder contexto.
- **Usar plantillas** para respuestas frecuentes, con multimedia adjunto (un menú con imagen, un instructivo con PDF, un audio de bienvenida).
- **Editar un mensaje** enviado, sabiendo que la versión anterior queda registrada para auditoría.
- **Buscar** conversaciones, mensajes y archivos de forma unificada.
- **Ver el historial completo** de un contacto — incluyendo cuando era visitante anónimo.
- **Etiquetar** mensajes y conversaciones para seguimiento.

Si la IA está activada (FluxCore), el operador ve además las respuestas sugeridas o automáticas del asistente, con trazabilidad completa de por qué la IA dijo lo que dijo. Si la IA está apagada, todo lo demás funciona exactamente igual.

### 6.2 El visitante o cliente

El visitante llega al perfil público del negocio (`meetgar.com/nombre`) o al widget embebido en su sitio web. Desde el primer segundo puede:

- **Enviar un mensaje** sin registrarse. Su identidad es provisional pero su experiencia es completa.
- **Enviar archivos** (fotos, audios, documentos) como parte natural de la conversación.
- **Recibir respuestas** — de la IA o del operador humano — sin distinguir ni necesitar distinguir quién responde.
- **Continuar la conversación** desde donde la dejó. Si cierra el navegador y vuelve, el historial persiste.
- **Registrarse cuando quiera** (o nunca). Si se registra, su historial completo migra con su nueva identidad.

La experiencia del visitante no es un subproducto del sistema. Es una experiencia de primera clase que no tiene limitaciones funcionales respecto a la de un usuario registrado.

### 6.3 El administrador técnico

El administrador configura los aspectos técnicos y operativos del sistema:

- **Gestionar asistentes de IA** — instrucciones, modelo, proveedor, herramientas autorizadas, datos del perfil visibles para la IA.
- **Definir políticas de operación** — modo de automatización, ventanas de turno, delays de respuesta, política fuera de horario.
- **Monitorear** el estado del sistema — señales procesadas, errores de proyectores, acciones ejecutadas, auditoría completa.
- **Administrar assets** — ver estadísticas de almacenamiento, políticas de retención, deduplicación.
- **Configurar integraciones** — canales externos (WhatsApp, Telegram), webhooks, APIs.

---

## 7. Por qué es Mejor

ChatCore no compite con Intercom o Chatwoot en el terreno de features. Compite en el terreno de **fundaciones**.

| Dimensión | Soluciones típicas | ChatCore |
|---|---|---|
| **Modelo de mensajes** | Registro plano ordenado por timestamp | Evento causal con identidad, tipología, causalidad y versionado |
| **Multimedia** | URL dentro del cuerpo del mensaje | Asset como entidad independiente con ciclo de vida, dedup y storage intercambiable |
| **IA** | Middleware acoplado al pipeline de mensajes | Sistema cognitivo separado que opera sobre eventos, desacoplado por diseño |
| **Identidad** | Binaria (registrado / no existe) | Continua con promoción gradual (anónimo → provisional → registrado) |
| **Extensibilidad** | Features como plugins o módulos | Capacidades emergentes del schema — si el dato lo soporta, el feature se construye |
| **Auditabilidad** | Logs opcionales | Journal inmutable con reconstruibilidad total del estado |
| **Storage** | Disco local hardcoded | Abstracción de storage con adapters intercambiables |
| **Multicanal** | Integraciones por canal, identidades separadas | Canales como puertas de entrada al mismo sistema de identidad |

La ventaja competitiva de ChatCore no está en tener más features que Intercom. Está en que **cada feature futuro es más barato de construir** porque la infraestructura lo soporta desde su capa más baja. ¿Quieres RAG sobre documentos del chat? Ya hay assets con extracción de texto e infraestructura de vector stores. ¿Quieres que la IA vea imágenes? Ya hay un pipeline de enriquecimiento que solo necesita un servicio nuevo. ¿Quieres hilos de resolución? Ya hay `parent_id` en el schema. ¿Quieres migrar a S3? Ya hay un storage adapter.

La diferencia entre un sistema que crece y un sistema que envejece es si cada feature nuevo refuerza la arquitectura o la debilita. En ChatCore, cada feature nuevo refuerza la arquitectura porque se construye sobre primitivas diseñadas para ser compuestas.

---

## 8. Principios de Diseño No Negociables

1. **ChatCore no sabe que la IA existe.** Ningún componente de ChatCore importa, referencia ni asume la existencia de FluxCore.

2. **El contenido del usuario es sagrado.** `content.text` de un mensaje nunca se modifica después de persistirse. Los enriquecimientos (transcripciones, captions, extracciones) se agregan como registros separados.

3. **Un archivo es un Asset, no una URL.** Todo binario que ingresa al sistema se registra como Asset con identidad, ciclo de vida y storage intercambiable.

4. **La identidad es continua.** La transición de anónimo a registrado es una promoción, no una creación. El historial no se pierde.

5. **Una sola fuente de verdad.** Cada dato tiene exactamente un lugar donde vive. No hay tablas redundantes para el mismo concepto. No hay dual-write.

6. **El schema es la documentación.** Si el schema lo permite, el feature se puede construir. Si el schema no lo permite, hay que cambiar el schema primero.

7. **Extensión aditiva, no mutativa.** Las capacidades nuevas se agregan como servicios, tablas de relación o tipos de enriquecimiento. El core no se modifica.

---

*Este documento establece la visión de ChatCore como sistema de comunicación. No es un plan de implementación — es la referencia estable contra la cual todo diseño y toda decisión se contrasta.*
