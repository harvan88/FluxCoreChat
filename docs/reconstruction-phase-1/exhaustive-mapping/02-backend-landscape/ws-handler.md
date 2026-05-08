---
id: "ws-handler"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/websocket/ws-handler.ts"
---

# 🤖 ws-handler

## 🎯 Propósito
Gestiona el ciclo de vida de las conexiones WebSocket nativas de Bun, encargándose de la autenticación, suscripciones a conversaciones y el broadcast de eventos en tiempo real hacia los clientes frontend.

## 🧱 Integración con EventBus
A partir de la descentralización de procesos, `ws-handler` actúa como un **Gateway de Salida** para el `CoreEventBus`:
1.  Escucha eventos de `core:message_received`, `core:message_updated` y `core:activity`.
2.  Filtra los destinatarios basados en permisos de conversación y reglas de autoría.
3.  Envía el payload JSON a los WebSockets activos suscritos.

## 📡 Transmisión de Actividad (Typing)
A diferencia de versiones anteriores, la actividad del usuario ya no depende del estado local de la API. Cuando un cliente emite `user_activity`, la API lo propaga vía Redis a todos los nodos, asegurando que el estado "escribiendo..." sea consistente en sistemas con balanceo de carga.

## 📡 Tipos de Mensajes Soportados
*   `subscribe`: Suscribirse a una relación o conversación.
*   `message`: Envío de mensajes desde el cliente (Ingress Certificado).
*   `subscribe_telemetry`: Suscripción a trazas cognitivas (Kernel Console).
*   `user_activity`: Notificación de escritura/presencia.

## 🔐 Seguridad y Autorización
*   Valida el token JWT en el upgrade de la conexión.
*   En cada broadcast, verifica que el `accountId` del socket coincida con el remitente o destinatario del mensaje para evitar filtración de datos entre cuentas.
*   Permite el acceso a telemetría global solo a roles administrativos (`kernel_console`).

## 🛠️ Dependencias
*   `messageCore`: Para el envío de mensajes e ingress.
*   `coreEventBus`: Fuente de eventos distribuidos.
*   `db`: Validación de pertenencia a conversaciones.
