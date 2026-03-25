---
id: "account-deletion-modal"
type: "smart-component"
status: "stable"
criticality: "critical"
location: "apps/web/src/components/accounts/AccountDeletionModal.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Se apoya 100% sobre las espaldas lógicas del custom hook `useAccountDeletion`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor Principal de Suicidio Lógico de Empresas (Modal PWA)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Pasarela Triple Estado (Intro, Opciones, Confirmación), Chequeo de Contraseñas" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🧨 AccountDeletionModal

## 🎯 Propósito
Es el interruptor de apagado definitivo (Kill switch). Se lanza cuando un Owner presiona "Eliminar mi compañía". En lugar de borrar crúdamente de un API call, inicia un interrogatorio de estado severo y exigente pidiendo opciones de resguardo (Snapshots) y demandando el input tipeado de la Contraseña actual para certificar la autorización destructiva.

## 📦 Estado y Datos
**Máquina de Estados de la Guadaña (`view`):**
- Enumera: `intro` (Alerta visual seria), `options` (Decidir: Quiero un backup de JSONs vs Eliminad todo al diablo) y finalmente `confirm` (La barrera de autenticación final).

## 🔄 Flujos de Interacción
1. **Delegación Estricta al Hook:** El componente captura la clave `passwordInput`, pero el que la certifica real mediante llamadas API en background es el Hook `verifyPassword`.
2. **Double Lock del Checkbox Final:** Impide humanamente apretar "Eliminar" incluso si la clave de sesion es correcta, obligando a pulsar el checkbox `finalConsent` "Confirmo que esta acción es irreverisble" para desenmascarar el Action Button.

## 💡 Ejemplo de Uso
```tsx
{isDeletionModalOpen && (
  <AccountDeletionModal
    account={modalAccount}
    sessionAccountId={authObject.id}
    onClose={killModal}
  />
)}
```
