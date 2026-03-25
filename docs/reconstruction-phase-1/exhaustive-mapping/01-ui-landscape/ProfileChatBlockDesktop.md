---
id: "profile-chat-block-desktop"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/public-profile/components/blocks/ProfileChatBlockDesktop.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Consume el hook concentrado `useUnifiedChat`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Variación Layout de Chat para PCs" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Dimensiones holgadas, Sticky Tops, Auto-scroll behavior native" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 💻 ProfileChatBlockDesktop

## 🎯 Propósito
Sustituto derivado para Perfiles Públicos, específicamente optimizado para la experiencia de navegador de escritorio (Desktop). A diferencia de su abuelo `ProfileChatBlock`, empuja la lógica dura lejos y la deposita puramente en el hook externo genérico `useUnifiedChat` para quedarse como un componente que sólo arma Layouts anchos.

## 📦 Estado y Datos
**Auto-Scroller de Último Nodo:**
- Engancha un `lastMessageRef` que llama `.scrollIntoView({ behavior: 'smooth' })` sobre sí mismo si la longitud de `messages` cambia reactivamente.

## 🔄 Flujos de Interacción
1. **Animación y Paneo Ligeros:** Adopta un HeroHeader y barras con `backdrop-blur-md sticky top-0`. Proyecta márgenes anchos `max-w-4xl` para que los globos del chat no se alejen hasta el infinito en monitores Ultrawide. 

## 💡 Ejemplo de Uso
```tsx
import { ProfileChatBlockDesktop } from '../../public-profile/components/blocks/ProfileChatBlockDesktop';

// Renderizado condicionalmente mediante queries Media:
{isDesktop && <ProfileChatBlockDesktop {...props} />}
```
