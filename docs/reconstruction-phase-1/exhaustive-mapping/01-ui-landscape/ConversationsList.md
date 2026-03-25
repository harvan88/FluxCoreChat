---
id: "conversations-list"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/conversations/ConversationsList.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Centro neurálgico Sidebar" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Lista de buzón de Chat" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Scroll dinámico basado en cálculo matemático Viewport" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 ConversationsList

## 🎯 Propósito
Esquina izquierda permanente o Sidebar de todos los Chats Activos (Inbox Viewer). Componente robusto de renderización de matrices densas de List-Items rellenando el historial de `conversations`. Sirve de motor visual para leer fragmentos previos del último mensaje remitido (Preview Subtitle), canales embebidos, badges no leídos y alteración del modo Agente IA (Sub-componentes).

## 📦 Estado y Datos
**Acople Zustand Core (`useUIStore`):**
- Provee y actualiza el array denso general `conversations` a través de cargas con `api.getConversations`.
- Mutadora maestra informando visualmente que un chat ha emergido con la prop `selectedConversationId`.
- **Extensiones (Feature Toggles):** Consulta activamente `useExtensions` destilando por Array Some los permisos si FluxCore está encendido en general (Habilitando a su vez las píldoras de Status AI).

## 🔄 Flujos de Interacción
1. **Paginación Inteligente Matemática (useScroll):** En vez de usar `h-full overflow-auto` ciegas de CSS, inyecta `maxHeight` programática (`useScroll({ offset: 160 })`), garantizando pixel-perfect scrolling deteniendo colisiones contra NavBars en dispositivos embebidos.
2. **Auto-Navegación Selectiva:** Mantiene un registro fantasma Ref `lastLoadedAccountIdRef`. Si detecta una conmutación agresiva de perfil Maestro (Ej. el usuario cambió su negocio Activo a otro Local Comercial), emite un barrido brusco y autoloca la grilla a la cima (`scrollTo({ top: 0 })`).
3. **Mapeo Responsivo Pleno e Iconología:** Traduce el origen String de la base de datos de los Canales de Entrada (`whatsapp`, `telegram`, Custom Widget) en colores canónicos de bolitas de interjección sobre los Avatares (E.g. Background Success Code).
4. **Mutación Letal de API:** Incluye en cada fila, disimulada tras efectos Hoover, una papelera invocando componentes prefabricados protectores de confirmación Doble Tap (`DoubleConfirmationDeleteButton`) o su adaptación propia en estado manual para aislar el EventClick del de Abrir la sala.

## 💡 Ejemplo de Uso
```tsx
import { ConversationsList } from '../../components/conversations/ConversationsList';

<SidebarSection>
   <ConversationsList />
</SidebarSection>
```
