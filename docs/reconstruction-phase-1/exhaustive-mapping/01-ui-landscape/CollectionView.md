---
id: "collection-view"
type: "ui-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/shared/CollectionView.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Desacoplado vía Genéricos T" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "El View Master de las tablas de datos" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Slots inyectables de Layout" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 CollectionView

## 🎯 Propósito
Es el "Single Source of Truth" de Listados/Dashboarding de Datos visuales para todos los módulos transversales de la plataforma (Agentes, Asistentes, Bases de Vectores, Herramientas, Instrucciones). En lugar de que cada programador dibuje su tabla perdiendo coherencia gráfica, este mega-componente genérico encajona a todos en un único modelo mental (`Header → Content → Table`), establenciendo directrices fijas de transiciones, breakpoints y estados de carga u orfandad paramétrica (`EmptyStates`/`LoadingStates`).

## 📦 Estado y Datos
**Arquitectura Generica `<T>`:**
- El componente no sabe qué dibuja. Utiliza Typescript Generic `props: CollectionViewProps<T>`, exigiendo recibir un array `columns: CollectionColumn<T>[]` que provea de accessors limpios (E.g. `(row) => row.name`).
- No gestiona ni atrapa data subyacente. Exige que el programador en el componente padre implemente callbacks pesados: `getRowKey: (row: T) => string`.

## 🔄 Flujos de Interacción
1. **Paginación Visual de Estados Finales:** Previene el Flash Of Unstyled Content evaluando estrictamente las props de entrada. Si `loading={true}` e igual a longitud 0, renderiza el Header flotante más un Body de Spinners. Si la carga acaba y longitud sigue en 0, renderiza el Cartel Gigante (`EmptyState`) instando a construir el primer elemento.
2. **Motor de Responsividad de Columnas (`hideBelowClass`):** Elimina la necesidad de escribir Media Queries asimilando valores paramédicos en las definiciones: `hideBelow: 'md'`. Las Oculta silenciando en Tailwind (`hidden md:table-cell`).
3. **Composición por Slotting Action:** En vez de acoplarse con botones duros, ofrece `renderActions={(row) => ... }`. Una celda pegajosa verticalmente anclada (`sticky right-0`) que asimila los Fragmentos JSX que dictamina un Controlador Padre asimilando correctamente su patrón de arquitectura limpia (Inversion of Control de la botonera operativa).

## 💡 Ejemplo de Uso
```tsx
import { CollectionView } from '../../components/fluxcore/shared/CollectionView';

<CollectionView<User> 
    title="Cuentas Bancarias"
    data={records}
    loading={isLoading}
    getRowKey={(r) => r.accountId}
    columns={[
       { id: 'bank', header: 'Banco', accessor: r => <b className="text-primary">{r.bankName}</b> },
       { id: 'balance', header: 'Monto', hideBelow: 'md', accessor: r => r.balance }
    ]}
    onCreate={() => openModal()}
    renderActions={(row) => <Button onClick={() => share(row)}>Compartir</Button>}
/>
```
