---
id: "delete-message-modal"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/ui/DeleteMessageModal.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Delegador de eventos puro" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Modal nativo bloqueante" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Control dual de alcance de borrado" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 DeleteMessageModal

## 🎯 Propósito
Garantiza una interfaz segura en flujo bloqueante Z-Index 50 (Modal) para validar la intención destructiva de los usuarios. Permite al usuario decidir (si cuenta con los privilegios derivados por autoría del mensaje) la propagación de destrucción de datos: Ocultar el mensaje en el cliente propio o solicitar la purga definitiva para todos los participantes de una sala.

## 📦 Estado y Datos
**Props Receptoras Puras:**
- `canDeleteForAll`: Condicional Boolean booleano inyectado por el padre indicando si el mensaje originó de la cuenta en sesión temporalmente activa.
- `messageCount`: Detecta singularidades (1 vs Múltiples) para ajustar los strings del UI.
- No utiliza stores internos, su delegación depende de `onConfirm(scope)`.

## 🔄 Flujos de Interacción
1. **Inyección Dinámica de Mensajes (`messageCount`):** Resuelve programáticamente si el título acusa un borrado singular ("¿Quieres eliminar este mensaje?") o plural ("estos N mensajes").
2. **Propagador de Destrucción:** Exhibe dos botones. Si se toca `handleDeleteForSelf`, emite el scope `self`. Si se activa la eliminación global condicionada (`canDeleteForAll`), emite `all`. Ambos eventos ocultan y cierran en ciclo limpio el componente vía `onClose`.
3. **Tooltip de Advertencia:** Si es negado el derecho de expansión global, pinta sutilmente un panel informativo ` bg-hover` instruyendo UX básica ("Nota: Solo puedes eliminar para todos los mensajes que tú has enviado").

## 💡 Ejemplo de Uso
```tsx
import { DeleteMessageModal } from '../../components/ui/DeleteMessageModal';

<DeleteMessageModal
  isOpen={isDeleteModalOpen}
  onClose={() => setIsDeleteModalOpen(false)}
  canDeleteForAll={message.isMine}
  messageCount={1}
  onConfirm={(scope) => {
    dispatchDelete(message.id, scope);
  }}
/>
```
