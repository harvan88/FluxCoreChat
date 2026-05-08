---
id: "ConversationRowAIStatus"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/conversations/ConversationRowAIStatus.tsx"
---

# 🤖 ConversationRowAIStatus

## 🎯 Propósito
Proporciona controles granulares para el comportamiento de la IA dentro de una conversación específica. Permite al usuario (o administrador) activar/desactivar la IA, ponerla en modo borrador (Draft) o silenciarla para ese hilo de chat en particular.

## ⚙️ Estado y Datos
*   **Store**: Utiliza `useAutomationStore` para sincronizar el estado local con la API.
*   **Props**: Recibe `conversationId`.
*   **Persistencia**: Cada cambio en los toggles dispara una llamada a `/api/automation/rule` para persistir la configuración en la base de datos (Tabla `automation_rules`).

## 🔄 Flujos (Interacciones)
1.  **Carga Inicial**: El componente solicita el estado actual de la regla para la conversación al montarse.
2.  **Toggle Status**: Al cambiar el switch de "Estado", se activa o desactiva completamente el procesamiento de la IA para nuevos mensajes en ese hilo.
3.  **Toggle Draft**: Permite que la IA genere respuestas pero no las envíe automáticamente, dejándolas en el outbox para revisión humana.
4.  **Optimistic UI**: Los cambios se reflejan inmediatamente en la UI antes de recibir la confirmación de la API.

## 🎨 Estética
Diseñado con una estética premium, utiliza micro-animaciones en los switches y badges de estado que cambian de color dinámicamente según la configuración activa.
