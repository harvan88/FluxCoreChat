---
id: "MessageBubble"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/chat/MessageBubble.tsx"
---

# 🤖 MessageBubble

## 🎯 Propósito
Este componente es el corazón visual del sistema de chat de ChatCore. Encapsula toda la lógica de visualización de mensajes, estados de sincronización, respuestas, archivos adjuntos y metadatos de actores humanos e IAs.

## 📐 Arquitectura e Interacción
El componente utiliza el sistema de diseño canónico de FluxCore.
- **Identidad de Actores:** Diferencia visualmente entre mensajes propios (`isOwn`), de la IA (`isAI`) y del sistema (`generatedBy: 'system'`). Es consciente de si la visualización se hace por un usuario o un visitante del perfil público.
- **Orquestación de Multimedia:** Actúa como contenedor para múltiples activos (`media`), instanciando un `AssetPreview` por cada uno de ellos y gestionando el layout de visualización.
- **Interactividad y Acciones:** Maneja flujos de respuesta (`onReply`), edición (`onEdit`), eliminación (`onDelete`) y selección múltiple (`isSelectionMode`).
- **Estados de Sincronización:** Representa visualmente estados como `pending_backend`, `synced`, `delivered`, `seen` y `failed` con iconos y colores canónicos.

## 💡 Estados y Datos
**Hooks utilizados:**
- `useState`: Gestiona la visibilidad de las acciones y botones de opciones.
- `useMemo`: (Vía Fragment) Protege el renderizado masivo.

**Propiedades Clave:**
- `message`: Objeto con `content` (text, media), `senderAccountId` y `status`.
- `viewerAccountId`: Identifica a qué cuenta pertenece el lector actual.
- `viewerActorId`: Identifica al usuario o visitante que lee el mensaje.
- `viewerActorType`: `user` o `visitor`.
- `isOwn`: Indica si el mensaje fue enviado por el actor que visualiza.
- `isAI`: Indica si el contenido fue generado por un asistente.

## 🔗 Dependencias
- **AssetPreview:** para la renderización segura de archivos y multimedia.
- **DeleteMessageModal:** para confirmaciones de borrado.
- **Lucide-React:** set de iconos canónicos.
- **clsx:** gestión dinámica de clases Tailwind.
