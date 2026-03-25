---
id: "debug-panel"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/fluxcore/debug/DebugPanel.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Recibe logs serializables como props" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Consola de overlay persistente en borde inferior derecho" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Copiado a portapapeles dual (navigator/fallback)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 DebugPanel

## 🎯 Propósito
Es una mini-consola flotante de desarrollo integrada directamente en la UI. Permite a los desarrolladores y usuarios avanzados inspeccionar matrices de Logs de eventos puramente técnicos (Ej. cadenas de Websocket) junto con una vista cruda (JSON Stringify) del estado actual de un componente complejo (State Tab).

## 📦 Estado y Datos
**Componente Visual Liviano:**
- `logs`: Recibe un arreglo de `DebugLog` (`timestamp`, `type`, `message`, `data`).
- `state`: Objeto dinámico `Record<string, any>` con volcado de memoria.
- Mantiene estado visual interno de pestañas (`activeTab`) y estado del portapapeles (`copyStatus`, `copyMessage`).

## 🔄 Flujos de Interacción
1. **Doble Motor de Portapapeles (`handleCopy`):** Intenta usar la API moderna de navegador `navigator.clipboard.writeText`. Si falla debido a bloqueos de seguridad por iFrames o contextos No-SSL, activa de inmediato `copyViaFallback` (Inyecta un elemento extemporáneo Textarea, lo oculta, ejecuta el comando nativo `execCommand('copy')` y lo destruye de la memoria).
2. **Re-pintado Diferencial de Pestañas:** Al alternar entre Logs y State, condicionalmente ejecuta un mapeo recursivo de colores Tailwind (verde para success, rojo para error, etc.) si está en Logs; u origina un macro bloque pre-formateado `<pre>` si se lee el Estado.

## 💡 Ejemplo de Uso
```tsx
import DebugPanel from '../../components/fluxcore/debug/DebugPanel';

{showDebug && (
  <DebugPanel 
    logs={wsEventLogs} 
    state={{ currentUser, socketStatus }} 
    onClose={() => setShowDebug(false)} 
  />
)}
```
