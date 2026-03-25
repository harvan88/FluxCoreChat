---
id: "profile-chat-block-mobile"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/public-profile/components/blocks/ProfileChatBlockMobile.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Consume `useUnifiedChat` también" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Variación PWA-Layout para Chatters en Celular" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Overscroll-none, safe-area-inset" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📱 ProfileChatBlockMobile

## 🎯 Propósito
El contrincante opuesto a la variante Desktop. Diseñado puramente para acomodar los teclados virtuales de iOS y Android aplastando el viewport reactivamente en la aplicación sin que la interfaz se corte o rompa usando variables CSS como env(safe-area-inset-bottom).

## 📦 Estado y Datos
100% Simétrico a la versión de Escritorio. Toda la transaccionalidad la traga el hook extraíble `useUnifiedChat`.

## 🔄 Flujos de Interacción
1. **Overscroll Contention:** Se le aplica un `overscroll-none` general y un `overscroll-contain` a la lista. Esto rompe el comportamiento indeseado en teléfonos Safari Chrome de "Estirar y refrescar la web" (Pull refresh elastico) que haría imposible la experiencia cómoda al leer un chat.
2. **Spacer Defensivo:** Inyecta un `<div className="h-4" />` fantasma al final exclusivo para darle respiro a los globos de los mensajes cuando se eleva el teclado táctil de la pantalla.

## 💡 Ejemplo de Uso
```tsx
import { ProfileChatBlockMobile } from '../../public-profile/components/blocks/ProfileChatBlockMobile';

// Renderizado para viewport angosto:
{!isDesktop && <ProfileChatBlockMobile {...props} />}
```
