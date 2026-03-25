---
id: "detail-header"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/fluxcore/detail/DetailHeader.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Sub-componentes: EditableName, IdCopyable" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Micro-estructura de Banner Superior" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Enrutador visual de errores y flujos de guardado dinámico" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 DetailHeader

## 🎯 Propósito
Centraliza de manera uniforme (Canónica) la parte superior de "todos los cajones de detalles" del layout global de FluxCore (Ya sea un inspector de Inteligencias Artificiales o un Editor de Vector Store). Expone el pre-título organizativo, un input text in-place (`EditableName`), y renderiza el ID inmutable con propiedades de pegado instantáneo.
## 🧰 Props
- `preTitle` (string, Requerido): Texto secundario sobre el título principal (Miga de pan / Contexto).
- `name` (string, Requerido): Valor a enlazar con el EditableName.
- `id` (string, Requerido): Identificador del recurso subyacente mostrado.
- `onNameChange` (function, Requerido): Emisor de alteración al título.
- `onNameSave` (function, Requerido): Ejecutor asincrónico para guardado definitivo.
- `onClose` (function, Opcional): Callback para cierre rápido o navegación atrás ('Volver').
- `actions` (ReactNode, Opcional): Fragmentos JSX u otros botones adyacentes al título.
- `isSaving` (boolean, Opcional): Condicional inyectando pulso visual 'Guardando...'.
- `saveError` (string | null, Opcional): Renderiza errores provenientes del Backend.
- `idPrefix` (string, Opcional): Etiqueta opcional prepensada para el IdCopyable.

## 📦 Estado y Datos
**No Reactividad Interna (Prop-drilling):**
- Absorbe pasivamente booleanos para retroalimentación (`isSaving`), cadenas para fallas (`saveError`), IDs del Backend y callbaks para cierres condicionales. 

## 🔄 Flujos de Interacción
1. **Inteligencia de Ciclos Creacionales (`!id`):** Implementa un modo fantasma intuitivo. Si la Propensión ID viene vacía, intuye automáticamente que el Usuario está "Creando una Entidad Nueva" desde cero, forzando la visualización del botón textoso "Volver" con flechas e instruye a sus hijos `IdCopyable` no emerger hasta que un post-guardado inyecte el ID remoto.
2. **Resiliencia de Componentes Dinámicos (`actions?`):** Expone un portal Node opcional permitiendo al componente contenedor incrustar botonería personalizada (Ej. Iniciar Chat, Play) compartiendo la cuadrícula Grid horizontal sin desordenarla.

## 💡 Ejemplo de Uso
```tsx
import { DetailHeader } from '../../components/fluxcore/detail/DetailHeader';

<DetailHeader
   preTitle="Configurando Asistente IA"
   name={localName}
   id={assistantData?.id || ""}
   isSaving={mutation.isPending}
   onNameChange={setLocalName}
   onNameSave={syncToBackend}
   onClose={() => goBackMenu()}
/>
```
