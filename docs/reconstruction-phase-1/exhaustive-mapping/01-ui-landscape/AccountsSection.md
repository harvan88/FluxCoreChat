---
id: "accounts-section"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/accounts/AccountsSection.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Maneja Lógica de Upgrade `convertToBusiness`, consume `useAccounts`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Panel Principal de Settings para Switch/New Accounts" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Validaciones de Regex Nombres Alias, Disparo Multi-Modal" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🏢 AccountsSection (FC-812, 813, 814)

## 🎯 Propósito
(Directorio General de Perfiles). Es la pantalla que se abre dentro de *"Configuración -> Mis Cuentas"*. Su función monstruosa es listar todas tus sub-cuentas conectadas discriminadas entre "Personales" vs "Negocios". A su vez provee injección para crear Empresas Nuevas `CreateBusinessAccountForm` o convertirte mutuamente.

## 📦 Estado y Datos
**Mortero de Modales:**
Posee variables controladoras de vistas ancladas `isDeletionModalOpen`, `showCreateForm`, `showConvertConfirm` que mutan el DOM destruyendo e instanciando Paneles según el usuario interactue evitando engordar el DOM invisiblemente.

## 🔄 Flujos de Interacción
1. **Caja Convertidora (Upgrade a Business):** Muestra el botón a Cuentas Personales que, al disparase, empuja tu UUID a ser una Firma comercial real activando (Del lado backend) los sistemas IAM de permisos y herramientas de Agentes pesados.
2. **Fabricante De Organizaciones:** Su Form sub-componente incluye protecciones severas Regex `^[a-z][a-z0-9_-]{2,29}$` prohibiendo que un usuario malicioso cree dominios falsos de empresas (Alias) con carácteres prohibidos para la BBDD.

## 💡 Ejemplo de Uso
```tsx
<AccountsSection onBack={() => navigateSettingsMain()} />
```
