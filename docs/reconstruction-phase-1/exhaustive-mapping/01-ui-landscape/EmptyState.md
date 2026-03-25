---
id: "empty-state"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/core/components/EmptyState.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "UI Pura sin side effects" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Fallback estético de Listados de Datos Nulos" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Renderizado estricto Flexbox H-Full" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 EmptyState

## 🎯 Propósito
Es el "Placeholder" oficial de la UI. Actúa como relleno inofensivo garantizando continuidad e intimidad con el sistema de Diseño FluxCore siempre que una base de datos, un listado de Agentes o una lista de Chats regrese de vacío u original tamaño temporal cero (Zero-State Array). Previene que el usuario confunda espacios grises y blancos de la app con Componentes "Rotos o no montados". 
*Existen en el sistema clones envoltorios como `components/fluxcore/shared/EmptyState.tsx`, pero esta es la versión núcleo de Core Components.*

## 📦 Estado y Datos
**No Reactividad Interna:**
- Contiene props visuales obligatorias `title`, y complementarios flexibles como `subtitle`, `icon` y `action` de naturaleza ReactNode permitiendo que el invocador le traspase Botones listos como `<Button>Crear Agente</Button>`.

## 🔄 Flujos de Interacción
1. **Centrado Absoluto en Cajones Flex (`h-full`):** Exige arquitectónicamente a su padre permitir su expansión completa asimétrica. Utiliza combinaciones `flex-col items-center justify-center` que provocan que sin importar el alto del bloque padre dinámico, la iconología estéticamente quedará simétrica en el puro medio.
2. **Jerarquía Visual Determinista:** Siempre renderiza en escala cromática forzada (Iconos empapados en el color semántico `text-muted`, títulos firmes en `text-secondary font-medium` y llamadas a acción en opacidad menor). Jamás asume decisiones de negocio, actuando en delegación pura.

## 💡 Ejemplo de Uso
```tsx
import { EmptyState } from '../../core/components/EmptyState';
import { Database } from 'lucide-react';

if (entities.length === 0) {
   return (
      <EmptyState 
         icon={<Database size={32} />}
         title="Sistema sin Configuración"
         subtitle="Aun no agregaste ninguna fuente nativa de embeddings."
         action={<button onClick={crear}>Comenzar Carga</button>}
      />
   );
}
```
