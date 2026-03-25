---
id: "emoji-panel"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/chat/EmojiPanel.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Memoria de Navegador API (Local Storage)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Cajón Inteligente del Chat Composer" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Búsqueda In-Memory y Clasificación LRU (Least Recently Used)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 EmojiPanel

## 🎯 Propósito
Constituye el teclado modal flotante nativo de FluxCore para proveer al Chat Composer selección rápida de iconografía (Emojis). No asume conexión alguna con módulos NPM pesados y contiene su propio banco diccionario interno clasificado y categorizado estáticamente. Además, provee su propio motor persistente de memoria para catalogar Emojis Frecuentes.

## 📦 Estado y Datos
**Persistencia Local y Listas Activas:**
- `recents`: Arreglo de strings limitados (`[...emojis].slice(0, 24)`) persistidos en `localStorage` bajo la llave `fluxcore_recent_emojis_v1`.
- `query`: Motor de búsqueda en memoria con validación multilingüe básica (Ej. 'feliz', 'smile') a través de `EMOJI_KEYWORDS`.
- `activeCategory`: Modificador dinámico de las tabs laterales UI (`smileys`, `food`, etc.).

## 🔄 Flujos de Interacción
1. **Hydratación de Emergencia (Mounting):** El panel no vive perpetuamente; sino que es conjurado dinámicamente (`props.open`). Suscrito a sus propios cambios al emerger, ejecuta `readRecents` e infla el estado primario forzando a pintar siempre el tablero de "Recientes" de primero.
2. **Motor Selector LRU (Least Recently Used List):** Al darle Clic Final a un Emoji Deseado (`onSelect`), no sólo delega la devolución del string Unicode al Padre (`ChatComposer`), sino que intercepta la lista en `localStorage` extrayendo el emoji clickeado, removiendo cualquier clon previo de su instancia (previniendo duplicidad) y re-colocándolo de inmediato al Primer Rango o Posición 0 antes de truncar la lista asimétricamente a su tope de 24 casillas.
3. **Buscador Léxico Reactivo (`activeEmojis`):** Utiliza un `useMemo` altamente dependiente del String Search. Si el campo de query sobrepasa 0, evapora la navegación por "Categorías" colapsándolas visualmente en favor de aplastar (`flatMap / Set`) y mapear todo el banco unificado, validando combinaciones parciales con strings traducidos al lowercase. (Busca 'fel' en los diccionarios paralelos `EMOJI_KEYWORDS` y retrasa pings de servidor).

## 💡 Ejemplo de Uso
```tsx
import { EmojiPanel } from '../../components/chat/EmojiPanel';

<div className="relative">
  <button onClick={() => setPanel(true)}>😀</button>
  <EmojiPanel 
     open={panel} 
     onClose={() => setPanel(false)} 
     onSelect={(emoji) => appendMessage(emoji)} 
  />
</div>
```
