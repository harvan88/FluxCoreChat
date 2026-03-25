---
id: "connection-indicator"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/common/ConnectionIndicator.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Uso de hooks V2-5 Offline First" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Feedback persistente del EventLoop WS/Sync" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Invocador manual de background syncs" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 ConnectionIndicator

## 🎯 Propósito
Es el "Monitor de Signos Vitales" del cliente FluxCore. Dictamina de manera visual y permanente el estado de la conexión Socket/HTTP subyacente. Al haber sido el sistema reescrito a un paradigma Offline-First (V2-5), este componente no sólo advierte caídas de conexión, sino que cuantifica pasivamente el progreso de las colas de peticiones represadas en memoria (Background Sync).
## 🧰 Props
- `showDetails` (boolean, Opcional): Alterna visibilidad del contador analítico extra (Logs fallidos/en curso).
- `className` (string, Opcional): Inyección modular de clases CSS.

## 📦 Estado y Datos
**Sensores Reactivos Integrados:**
- `useConnectionStatus()`: Retorna el status en capa 4 TCP/WS (`online` o `offline`).
- `useSyncQueueStats()`: Observador del motor SQLite/IndexedDB local midiendo tamaños en cola (`pending`, `failed`).
- `useSync()`: Provee el callback de orden ejecutiva para retransmitir (`sync()`) y el indicador Booleano `isSyncing`.

## 🔄 Flujos de Interacción
1. **Duales de Semáforo Físico:** El componente oscila internamente sus recubrimientos (pills). Estando `online` expone un chip Verde (Wifi), si se corta transiciona a chip Rojo.
2. **Conteo Interactivo en Ausencia:** Si el usuario sigue usando el chat Offline, un módulo adyacente amarrillo (CloudOff) emerge listando numéricamente las acciones diferidas (E.g. "3 pendientes").
3. **Resurrección y Retransmisión:** Al regresar a un estado `isOnline=true`, habilita el tap visual (Cloud) para que el Usuario despache a voluntad la purga de los mensajes o configuraciones atrasadas que están en cache local, convirtiéndose en un ícono giratorio. Adicionalmente, provee un micro-componente escindido silencioso `<ConnectionDot />` para barras de headers comprimidos.

## 💡 Ejemplo de Uso
```tsx
import { ConnectionIndicator, ConnectionDot } from '../../components/common/ConnectionIndicator';

<header>
    <ConnectionIndicator showDetails={true} />
    {/* O la versión minúscula */}
    <ConnectionDot />
</header>
```
