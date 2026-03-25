---
id: "chat-options-menu"
type: "smart-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/chat/ChatOptionsMenu.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Uso de useClipboard hook" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Componente menú de acciones rápidas" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Lógica dropdown click-outside manejada por div overlay" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 ChatOptionsMenu

## 🎯 Propósito
Mini-componente desplegable posicionado en la esquina superior derecha del Navbar en una ventana de Chat (Al lado de llamadas de voice/video). Ofrece acciones secundarias del contexto de la sala, primordialmente permitir abstraer el `conversationId` UUID crudo subyacente para soporte técnico, así como una acción letal de borrado de sala.
## 🧰 Props
- `conversationId` (string, Requerido): Identificador UUID o base para la sala.
- `onLeave` (function, Opcional): Callback para vaciar o salir del chat tras el doble opt-in.
- `className` (string, Opcional): Clases suplementarias al contenedor relativo.

## 📦 Estado y Datos
**Estado UI Mínimo:**
- Booleano `isOpen` que apaga y prende condicionalmente el portal de menú de React.
- Sub-estado prestado proviniendo por composición del Hook de Utilidades `useClipboard`.

## 🔄 Flujos de Interacción
1. **Apertura y Cierre Trivial:** Permuta el `isOpen`. Para garantizar el cierre al hacer click afuera (Click outside), inyecta imperativamente un `div` invisible expansivo (`fixed inset-0 z-10`) detrás del menú que sirve de sumidero de eventos click (`onClick={() => setIsOpen(false)}`).
2. **Ciclo de Persistencia de Portapapeles:** Usa el helper `copy` inyectando el `conversationId`. Permante un timer artificial por 2 segundos indicando `isCopied` (Toggle del ícono entre Lucide Copy a Check) y cierra bruscamente el menú medio segundo después para volver a la interfaz original.
3. **Escudo Protector contra Borrado:** Emplea de manera integrada y estricta el componente `DoubleConfirmationDeleteButton` obligando al usuario a validar en 2 tiempos (Un click, el texto cambia a Confirmar, click real). Al dispararse connota limpieza (`onLeave()`).

## 💡 Ejemplo de Uso
```tsx
import { ChatOptionsMenu } from '../../components/chat/ChatOptionsMenu';

<ChatOptionsMenu 
  conversationId={currentChat.id} 
  onLeave={() => clearChatMessages(currentChat.id)} 
/>
```
