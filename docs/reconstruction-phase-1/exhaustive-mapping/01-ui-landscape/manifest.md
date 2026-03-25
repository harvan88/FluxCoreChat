---
id: "manifest"
type: "core"
status: "stable"
criticality: "medium"
location: "apps/web/src/extensions/fluxcore/manifest.tsx"

# 🎯 SISTEMA DE CAPAS
layers:
  discovery: { status: "complete", completed_date: "2026-03-23", confidence: 100, notes: "Auto-descubierto" }
  connections: { status: "pending", confidence: 0 }
  subsystem: { status: "pending", confidence: 0 }
  operations: { status: "pending", confidence: 0 }

evolution: { current_layer: 1, total_layers: 4, completion_percentage: 25 }
---
## 🎯 Propósito
Es el manifiesto oficial de registro de la Extensión `FluxCore AI` dentro del ecosistema padre `ChatCore`. Define la jerarquía del Sidebar, las vistas lazy-loaded incrustadas (Assistants, Usage, VectorStores, Tools, Traces) y los permisos estructurales solicitados.

## 🏛️ Arquitectura
Actúa como un Registry Proxy estático. Provee el objeto inmutable `fluxcoreManifest` de tipo `ExtensionUIManifest` que el Framework de Chat consume, inicializando en base a su diccionario de `views` una serie de wraper Components repletos de `<Suspense />` previniendo cargas síncronas masivas en el startup global.

## 🔗 Dependencias
- Consume las definiciones formales tipadas de `ChatCore` (`ExtensionUIManifest`, `ExtensionViewProps`).
- Importa asíncronamente (via `React.lazy`) la totalidad de las Vistas Pesadas del Sistema FluxCore (`UsageView`, `AssistantsView`, etc.).

## 💡 Ejemplo de Uso
```tsx
// Uso del componente manifest
import { manifest } from '@/components/manifest';

function Example() {
  return <manifest />;
}
```
