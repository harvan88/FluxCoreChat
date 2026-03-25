---
id: "chat-view"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/chat/ChatView.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Ancla a todos los contextos, Workspaces, Sockets y IA" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Orquestador Maestro del Workflow Conversacional V2" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Batch processing and auto-reply loops" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 ChatView

## 🎯 Propósito
Es el Orquestador central y peso pesado (God Component) de toda la Aplicación. Gobierna de inicio a fin todos los eventos relacionados con una conversación enfocada en pantalla. Actúa por red usando WebSockets para mantener coherencia Real-Time (V2), empuja y despacha Archivos adjuntos hacia S3, administra la renderización y sincronía de los mensajes (Propios y ajenos), y entronca con el bucle humano-in-the-loop gestionando las sugerencias proactivas de Inteligencia artificial (FluxCore AutoReplies).

## 📦 Estado y Datos
**Acople Masivo de Red ZUSTAND:**
- `useWorkspaceStore`, `useAccounts`, y `useAuthStore` fijando la Triada Autenticación-Alquiler-Visor de Contexto (Tenant identification).
- `useAutoReplyStore` y `useUIStore` (Acceso al pool total de conversaciones abiertas).

**Hooks Directos de Backend:**
- `useChat`: Consigue lista inicial, carga y rutea `sendMessage` de la capa cliente HTTP.
- `useWebSocket`: Subscriptor per-ID de sala (`relationshipId`). Desempaca tramas WS provenientes de Rust/Node emitiendo actualizaciones sintéticas sobre la matriz local de `messages`.
- `useAssetUpload`: Controlador para empujar Binarios en la nube (`CHAT_MAX_UPLOAD_BYTES: 50MB`).
- `useAISuggestions`: Controlador supervisor para IA conversacional con callbacks de descarte y edición.

**Estado UI Interno:**
- Array denso bidimensional `isSelectionMode` acoplando `selectedMessages` (Sets).
- Trackers físicos del DOM para infinite scroll y anclajes en el bottom de la pantalla: `messagesContainerRef`, `isAtBottomRef`.

## 🔄 Flujos de Interacción
1. **Modelo de Actores Rigorista:** Antes de discernir, mapea que todo mensaje provee de un `fromActorId` crudo contra un `activeActorId` (El usuario en la sala) y como Fallback usa los `SenderAccountId`. De coincidir, dibuja la burbuja verde hacia la derecha (`isOwn`), de lo contrario hacia la izquierda.
2. **Re-hidración Agresiva Top-Down vía WS:** Al suscribirse en el canal `onMessage`, es capaz de interceptar eventos destructivos remotos (`message:updated`) invocados por otros administradores, parcheando solo el campo `wsData.content` sin mutar el React UUID primario del Message para evitar colapsos masivos del UI.
3. **Temporizadores IA "Auto-Reply Delay":** Utilizando un sistema inyectable `forceAutoReplyTick`, levanta contadores reactivos cada 500ms si el `autoReplyState` de la conversación se marca en `eta` inminente. De esta forma inyecta tarjetas dinámicas con Countdown Visual antes de disparar fuego automático contra la API, que pueden ser desmantelados con el evento teclado o si el usuario escribe una letra interponiéndose (`cancelAutoReplyByConversation`).
4. **Scrolling Matemático Seguro:** Evita saltos groseros del DOM usando un `requestAnimationFrame` que escanea las distancias desde abajo de la pantalla (`distanceFromBottom = scrollHeight - scrollTop - clientHeight`) empujando el foco de visión a `auto` behavior cuando entran mensajes nuevos.
5. **Multi-Borrado:** Usa API estricta Batch `api.deleteMessagesBulk(messageIds, scope, accountId)`. Dependiendo de si la instrucción era local, muta de vuelta el arreglo de Estado, y si era Universal ('all') desiste esperando obligadamente que el servidor le re-transmita los mensajes como ocultos vía WS.

## 💡 Ejemplo de Uso
```tsx
import { ChatView } from '../../components/chat/ChatView';

<ChatView 
    conversationId="conv_372863B"
    accountId="usr_38217H" 
    relationshipId="rel_A283B"
/>
```
