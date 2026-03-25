---
id: "entity-actions"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/fluxcore/shared/EntityActions.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Compositor puro de botones. Usa submódulo DoubleConfirm en su interior" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Toolbars rápidos incrustados en Grid Columns" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Aislamiento exhaustivo de pulsaciones sobre listas clickeables" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 EntityActions

## 🎯 Propósito
Es el "Botonero" o menú de Hover-Actions predeterminado insertado a la derecha de las tablas de datos y paneles de listas dentro del Sistema FluxCore. Congrega limpiamente 4 vectores de acciones comunes repetitivos en objetos de base de datos (`Share`, `Download`, `Refresh`, `Delete`) impidiendo la re-codificación individual por capa.

## 📦 Estado y Datos
**Props Reenrutadoras Total:**
- Absorbe funciones operativas mudas: `onDelete`, `onShare`, `onDownload`, `onRefresh`.
- Opcionalmente habilita apagar visibilidad granular usando configuradores banderas Booleanas limitantes como `showShare` y `showDownload`.

## 🔄 Flujos de Interacción
1. **Transición Fantasma (Ghost UI):** Utiliza un acople perimetral con Tailwind en su class root base: `opacity-60 group-hover:opacity-100`. Confía ciegamente en que el desarrollador creador de la Tarjeta contendrá la designada clase "padre `group`", permitiéndole mantenerse tímida en transparencia en idle pero iluminando full sus acciones únicamente bajo escrutinio del mouse inyectando UX limpia sin estorbos estáticos.
2. **Deflector Blindado Universal (`e.stopPropagation()`):** Párrafo tras párrafo, todo botón del Array empaqueta su directiva inyectando detención de evento a fuerzas mayores. Esto es vital, dado que estos módulos suelen ir colocados encima de Tr's HTML interactivos de una Fila de Datos que abrirían ventanas o Detalles Modales.
3. **Composición Letal:** Invoca limpiamente y encapsula al `<DoubleConfirmationDeleteButton>` en su extrema derecha para preservar coherencias de UX frente a la purga de los datos.

## 💡 Ejemplo de Uso
```tsx
import { EntityActions } from '../../components/fluxcore/shared/EntityActions';

<ListRow className="group flex justify-between">
   <span>Plantilla de Facturación PDF</span>
   <EntityActions 
       onDelete={() => purgeTemplate(id)} 
       onShare={() => dispatchShareLink(id)} 
       showDownload={false}
   />
</ListRow>
```
