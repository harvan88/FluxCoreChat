---
id: "account-activation-service"
type: "logic-service"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/account-activation.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (accounts, users), ConversationParticipantService" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Estado de Cuenta Activa por Usuario" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Sender validation, Active account resolution, Conversation participation guard, Chat operation validation" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AccountActivationService

## 🎯 Propósito
Este servicio gestiona la noción de "Cuenta Activa" del usuario. En FluxCore, un usuario humano puede poseer múltiples Cuentas (Personales o de Negocio), pero el sistema requiere validar desde cuál está operando en un momento dado para garantizar la integridad de los mensajes y permisos.

## 🚥 Reglas de Negocio
-   **Propiedad estricta**: Un usuario solo puede enviar mensajes desde cuentas que le pertenecen (`ownerUserId`).
-   **Validación de Remitente**: Antes de procesar cualquier mensaje entrante, el sistema verifica que el `senderAccountId` coincida con una de las cuentas autorizadas del usuario.
-   **Participación en Conversación**: Valida que una cuenta no solo pertenezca al usuario, sino que sea un participante activo en la conversación específica donde intenta interactuar.

## 🛠️ Guards de Seguridad
-   **`validateChatOperation`**: Un método de conveniencia que lanza excepciones si el usuario intenta realizar una acción de chat desde una cuenta no autorizada.
-   **Modo Transicional**: Actualmente permite enviar desde cualquier cuenta propia mientras se termina la implementación de la persistencia de "Cuenta Activa" en el frontend.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { accountActivationService } from 'apps/api/src/services/account-activation.service.ts';

// Ejemplo de invocación típica
const result = await accountActivationService.execute(params);
```
