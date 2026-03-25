---
id: "public-chat-container"
type: "ui-component"
status: "archived"
criticality: "low"
location: "apps/web/src/public-profile/PublicChatContainer.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Depende de VisitorToken" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Versión Obsoleta/Antigua de los Chat Blocks" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Contenedor monolítico de presentacional" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚰️ PublicChatContainer

## 🎯 Propósito
Aparentemente una reliquia dejada en el directorio superior (`src/public-profile/PublicChatContainer.tsx`). Encapsula la vista central pero carente de la fineza de los split-hooks usados en los modernos `ProfileChatBlockMobile` o `Desktop`. Permanece funcional, pero sub-óptimo.

## 📦 Estado y Datos
- **Generador de IsOwn (visitorActorId):** Acude a `getVisitorActorId()` traído desde localStorage para pintar el globo del lado derecho si el ID de tú navegador en modo incógnito hace match con el ID del creador original de ese mensaje P2P.

## 🔄 Flujos de Interacción
1. **Debounce Simulado de Interfaz:** Provoca un retraso visual forzado `setIsSending(false), 300ms` luego de inyectarlo en el callback externo para engañar a los ojos de que hubo una "transmisión sólida" hacia el server, y prevenir doble clicks en un enter consecutivo.
2. **Warn de Conectividad HUD:** Dibuja un diminuto banner en amarillo "WifiOff" `<div className="flex bg-warning">...</div>` atado puramente a la prop condicional de `!isConnected` pasada externamente.

## 💡 Ejemplo de Uso
```tsx
<PublicChatContainer
  profile={profInfo}
  messages={messageArr}
  isConnected={isSocketConnected}
  onSendMessage={(text) => handleSend(text)}
/>
```
