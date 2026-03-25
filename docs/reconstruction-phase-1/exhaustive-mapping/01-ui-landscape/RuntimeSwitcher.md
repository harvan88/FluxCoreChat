---
id: "runtime-switcher"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/fluxcore/RuntimeSwitcher.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Llama a `api.updateAIRuntime`, Emite CustomEvents" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Macro-Interruptor Cerebral para Cuentas" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Toggle `Fluxi` vs `Asistentes`" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🧠 RuntimeSwitcher

## 🎯 Propósito
Selector segmentado (Segmented Control / Togglers ubicados típicamente en Sidebar izquierdo). Determina a nivel "Cuenta/Espacio de Trabajo" cuál será el orquestador global que responderá los mensajes de esa compañía. Alternando violentamente entre el "Cerebro General" (`@fluxcore/fluxi`) y la matriz especializada local (`@fluxcore/asistentes`).

## 📦 Estado y Datos
- Absorbe la prop de `accountId`.
- Desencadena el Hook `useAIStatus` vigilando el actual runtime de base de datos.

## 🔄 Flujos de Interacción
1. **El Disparador Lateral (Global Events):** Una vez que un PUT HTTP cambia el cerebro en la DB exitósamente, efectua un llamado a `emitAssistantUpdateEvent({ action: 'update' })` para que toda la cadena de Frontends se de enterada y refresque sub-contextos de chats activos.
2. **Glass Loader:** Oscurece el panel diminuto con `bg-surface/50 backdrop-blur-[1px]` impidiendo dobles saltos locos (debouncing duro de UI) mientras el API contesta el cambio.

## 💡 Ejemplo de Uso
```tsx
<RuntimeSwitcher accountId={currentId} />
```
