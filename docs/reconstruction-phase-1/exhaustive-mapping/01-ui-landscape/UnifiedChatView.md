---
id: "unified-chat-view"
type: "smart-component"
status: "stable"
criticality: "critical"
location: "apps/web/src/components/chat/UnifiedChatView.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Orquesta `useChatUnified`, `useWebSocket`, `useAssetUpload`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Core Visual de Interacción P2P/B2C Central" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Overwrites WS (Merge parcial de edits), Controladores de Subidas Lentas Clandestinas" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 💬 UnifiedChatView

## 🎯 Propósito
El Dios Controlador unificador para presentar la interfaz de Conversaciones de React. Puede montarse puramente si pasas variables de "Login Falso (Tokens Públicos)" o de "Usuario Legal Operativo (AccountID)". Inyecta el motor reactivo principal, la barra de tipeo asíncrona, y la canasta Composer que el usuario ve dentro de las Pestañas (Tabs) o Ventanas.

## 📦 Estado y Datos
**Orquestas Masivas Paralelas:**
- Lanza el Hook Universal `useChatUnified` que asume todo lo referente a la lista `messages[]` y llamadas Http Post `sendMessage`.
- Lanza paralelamente `useWebSocket` atornillándose a un listener nativo WSS en su `onMessage` reaccionando y actualizando las vistas sin refrescos. 
- Dispara silenciosamente `useAssetUpload` para pasar por el cable blobs multimedia de hasta 50mb (`CHAT_MAX_UPLOAD_BYTES`).

## 🔄 Flujos de Interacción
1. **Tolerancia a Multi-Edits (Ghost Type):** Vigila si llega `wsMessage.type == 'message:updated'`, aplicando solo un mutador de contenido parcial a `updateMessage` para permitir que los Agentes cambien su propia respuesta anterior (Ej. Edit by AI).
2. **Contexto de "ReplyingTo":** Retiene una sombra en el state `replyingTo` cuando le das Quote a alguien dibujando una barrita fantasma azul encima del Composer. El siguiente Enter disparado enviará `replyToId` a la Database en la request de subida.

## 💡 Ejemplo de Uso
```tsx
<UnifiedChatView
    conversationId={router.query.id}
    accountId="the_tenant"
    hideHeader={false}
/>
```
