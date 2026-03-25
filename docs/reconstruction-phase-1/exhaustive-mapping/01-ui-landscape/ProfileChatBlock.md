---
id: "profile-chat-block"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/public-profile/components/blocks/ProfileChatBlock.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Usa `useChatUnified`, `useWebSocket`, y `useAssetUpload`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Orquestador Base de Convergencia Público/Privada" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Cálculo de Viewports en vivo, Sincronización asíncrona dual" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 💬 ProfileChatBlock

## 🎯 Propósito
(La Fusión Unificada Original). Es el "Contenedor Smart" de nivel medio que toma la responsabilidad pesada de ensamblar un chat en vivo conectando el componente visual del listado de mensajes (`MessageBubble`), el composer de Chat (`ChatComposer` / `PublicProfileComposer`), y los flujos WebSockets puros. Puede actuar camaleónicamente como "Visitante Anónimo" (usando un PublicToken) o como "Dueño de la Cuenta" (Authenticated).

## 📦 Estado y Datos
**Viewport Calibrator:**
- Intercepta `window.innerHeight` para forzar empíricamente los cálculos de alturas en dispositivos móviles `height: 'calc(100dvh'`.

## 🔄 Flujos de Interacción
1. **Interruptor Bi-Modal:** Define `isPublicMode = !accountId` y `isAuthenticatedMode = !!accountId`. Ruteando sub-componentes UI (Públicos o Privados) sobre la marcha bajo este interruptor maestro.
2. **WebSocket Listener Cauteloso:** Inicializa `useWebSocket`. Posee un guardia `if (wsMessage.data?.conversationId !== resolvedConversationId)` para evitar que mensajes de otras pestañas o ventanas se sangren visualmente a este chat de perfil público por accidente.

## 💡 Ejemplo de Uso
```tsx
import { ProfileChatBlock } from '../../public-profile/components/blocks/ProfileChatBlock';

<ProfileChatBlock alias="agent1_ai" profile={fetchedProfileObj} />
```
