---
id: "message-bubble"
type: "smart-component"
status: "stable"
criticality: "critical"
location: "apps/web/src/components/chat/MessageBubble.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Integra múltiples visores como AssetPreview" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Burbuja Canónica del Mensaje de Chat y Render de Medias" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gradientes Parallax (Fijo), Badges de IA y Toolbar Múltiple de Clics" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 MessageBubble (y MessageSelectionToolbar)

## 🎯 Propósito
Es el "Ladrillo Base" sobre el cual descansa todo el peso gráfico conversacional del usuario. Toma el objeto `Message` puramente modelado por DTOs e imprime Burbujas flotantes en lados oscilantes (`isOwn === true/false`). Alberga inteligencia renderizadora desarticulando Arrays de Assets (imágenes, audios, documentos), y expone lógicas supercargadas ocultables para flujos (Replies, Reenvíos y Reportes).

## 📦 Estado y Datos
**Acople Dual Contextual:**
- Mantiene variables temporales transitorias relativas a posiciones del ratón (`showActions`, `showOptionsButton`). 
- Interacciona en la capa semántica deduciendo al AI Generator (`message.generatedBy`).

## 🔄 Flujos de Interacción
1. **Intérprete Arquitectónico de Tipos Atípicos (Medias/Archivos):** Ejecuta un switch masivo contra atributos lógicos adjuntos. Si encuentra `audio`, inyecta tags HTML Nativas con un visualizador empírico de picos (Barras Waveforms) si dispone un `samples[]`. Si topa una imagen amarra su visualización a `AssetPreview`, o un simple Link en casos estériles.
2. **Efecto Fluido Paralaje Global (Gradient Mask):** Adopta una de las innovaciones de UI que más asombran al usuario: Todas las burbujas propias carecen de color sólido. Sus texturas apuntan a un `linear-gradient` fijo al tamaño absoluto de la página (`backgroundAttachment: 'fixed', backgroundSize: '100vw 100vh'`). Creando un efecto cascada, donde a medida que el scroll baja las burbujas mutan su azul celeste hasta azul profundo sin importar su propio código CSS individual.
3. **Escudo y Aviso Estéril para RAG Blockers:** Si la burbuja se marca `isSystem` con flag de caída y bloqueo IA (`ai_blocked`), extingue la forma abombada mutando por entero a una Caja Banner de color amarilla alertándole al Humano.

## 💡 Ejemplo de Uso
```tsx
import { MessageBubble } from '../../components/chat/MessageBubble';

<MessageBubble 
   message={msg}
   isOwn={msg.authorId === currentUserId}
   isAI={msg.generatedBy === 'ai'}
   onSelectionModeToggle={() => activeModeBulk()}
/>
```
