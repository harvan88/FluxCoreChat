---
id: "lazy"
type: "utility-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/lazy.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Patrón base wrapper de React.lazy" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Separador de Bundles (Code Splitting)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Envoltorio HOC con un Skeleton Native (Spinner Loader2)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 Lazy (Code Splitting)

## 🎯 Propósito
(FC-600). No es un componente visual per sé, sino un archivo Manifiesto y una macro-función (High Order Component) designada para reducir el tiempo de carga monstruoso inicial (Bundle TTI) de una SPA React. Mapea paneles masivos (como Configuraciones o Extensiones) inyectándoles asincronía (`React.lazy`) y proveyéndoles un escudo protector (`Suspense`) de la misma librería emparejado a un Spinner unificado. 

## 📦 Estado y Datos
- **Agente Pasivo:** Carece de control State. Expone funciones const en formato `LazySettingsPanel` que resuelven promesas Dinámicas (`import('./path')`).

## 🔄 Flujos de Interacción
1. **Atrapador de Cargas Demoradas (`lazyWithFallback`):** En vez de plagar toda la app con `<Suspense>` nativos ensuciando el tipado y los JSX, este forjador los envuelve en el acto, escupiendo un componente falso y liviano `LoadingFallback` que pulsa su Spinner hasta que el Chunk JS gigante cruza la Red HTTP desde el servidor a la memoria del navegador.

## 💡 Ejemplo de Uso
```tsx
import { LazySettingsPanel } from '../../components/lazy';

<WorkspaceArea>
   {isOpen && <LazySettingsPanel />}
     {/* Renderizará un spinner y por detrás descargará el JS */}
</WorkspaceArea>
```
