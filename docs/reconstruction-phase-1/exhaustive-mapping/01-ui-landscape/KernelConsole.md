---
id: "kernel-console"
type: "smart-component"
status: "stable"
criticality: "critical"
location: "apps/web/src/components/monitor/KernelConsole.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Llama explícita al núcleo Event-Driven de logs getKernelConsoleSignals" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Visor Terminal de Diagnósticos de Bajo Nivel 'Kernel Signals' con trazas distribuidas en vivo y modo híbrido legacy + live" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Sincronizador Automático Cíclico, Intérprete Multidato y Gestor de Caídas Falsas Fallback Copy." }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# KernelConsole

## Propósito
`KernelConsole` es el visor forense de observabilidad viva para el pipeline cognitivo. Su función actual es combinar historial REST legacy con spans distribuidos emitidos en tiempo real por el backend para permitir inspeccionar el `RuntimeInput` efectivo que llega al runtime.

## Estado y Datos
El componente mantiene estado local para cuatro responsabilidades:

- `tracesFlat`
  - almacena trazas recibidas por REST y WebSocket.
- `activeTraceId`
  - identifica el flujo actualmente inspeccionado.
- `isLoading` y `statusText`
  - reflejan el estado de carga del historial y de la conexión live.
- `tagFilters`
  - filtra por `account.id`, `user.role` y texto libre dentro de los atributos.

También depende de dos stores globales:

- `useUIStore`
  - aporta `selectedAccountId`.
- `useAuthStore`
  - aporta el token para la conexión WebSocket.

## Flujos de interacción
### 1. Carga histórica híbrida
Al montar o cambiar `selectedAccountId`, el componente consulta `GET /api/kernel-console/pipeline-telemetry?accountId=...`.

Esa respuesta se transforma a nodos sintéticos `[Legacy DB] ...` para reutilizar el mismo visor jerárquico, aunque esos registros no contienen el payload completo que sí existe en las trazas live.

### 2. Suscripción live de telemetría
El componente abre un WebSocket a `/ws?accountId=...&token=...` y, al conectar, envía:

```json
{ "type": "subscribe_telemetry", "role": "kernel_console" }
```

Después escucha `telemetry:distributed_trace` y agrega los spans nuevos al estado local evitando duplicados por `spanId`.

### 3. Reconstrucción jerárquica
Las trazas se agrupan por `parentSpanId` para reconstruir árboles causales. Los roots se ordenan por `timestamp` descendente y el usuario puede navegar cada flujo desde el panel lateral.

### 4. Inspección del payload crudo
Cada nodo puede expandirse y mostrar `payloadEnorme`, que normalmente representa el `RuntimeInput` emitido desde el dispatcher. El usuario puede copiar el JSON completo desde la UI.

## Dependencias
- **Depende de:** `apps/api/src/routes/kernel-console.routes.ts`, `apps/api/src/websocket/ws-handler.ts`, `apps/api/src/telemetry/tracer.ts`.
- **Es usado por:** `DynamicContainer.tsx` en la vista de monitoreo.

## Limitaciones actuales
- El detalle profundo del payload es **live-first**: el historial REST sirve como fallback contextual, no como auditoría completa.
- El componente actualmente escucha solo `telemetry:distributed_trace` en el canal live.
- El typecheck del frontend reporta un error vigente en este archivo: `Button` no acepta `size="xs"`.

## Ejemplo de uso
```tsx
import { KernelConsole } from '../../components/monitor/KernelConsole';

function App() {
  return (
    <div>
      <KernelConsole />
    </div>
  );
}
```
