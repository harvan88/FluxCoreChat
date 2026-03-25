---
id: "resource-selector"
type: "ui-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/forms/ResourceSelector.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Acoplado internamente hacia props inversas Inyectadas" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Agregador Múltiple de Meta-Recursos" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Píldoras Removibles Visuales" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🛒 ResourceSelector

## 🎯 Propósito
Componente de UI muy maduro empleado habitualmente en Asistentes y RAGs. Permite ir escogiendo mútliples "Toolchains" o "Vector Stores", y a medida que se seleccionan, los descarta del Menú nativo `<select>` y los transforma en hermosas píldoras horizontales (`Badge`) con la "X" para eliminarlas.
## 🧰 Props
- `label` (string, Requerido): Título descriptivo para la cabecera.
- `resources` (Resource[], Requerido): Arreglo global de entidades disponibles (id, name, backend).
- `selectedIds` (string[], Requerido): IDs previamente inyectados formales.
- `maxItems` (number, Opcional): Techo cap preventivo.
- `onCreate` (function, Requerido): Callback atado al botón '+ Crear'.
- `onSelect` (function, Requerido): Ocurre cuando se extrae una opción del `<select>`.
- `onRemove` (function, Requerido): Destructor individual para `X` de cada píldora.
- `onReferenceClick` (function, Opcional): Convierte a la píldora en un hipervínculo clickeable.
- `placeholder` (string, Opcional): Texto gris fantasma.
- `disabled` (boolean, Opcional): Congela y opaca el flujo de interacción.

## 📦 Estado y Datos
**Computado Condicional (Dumb + Derivation):**
- Pide una lista matriz `resources` (Ej: todos los vector stores) y la lista de UUIDs `selectedIds`.
- Resta matemáticamente con un simple filtro los disponibles vs elegidos (`resources.filter(r => !selectedIds.includes(r.id))`) para que jamás puedas inyectar la misma Tool 2 veces seguidas al mismo perfil.

## 🔄 Flujos de Interacción
1. **Techo Máximo Lógico (`maxItems`):** Si pasamos la cap max permitida, oculta enteramente el selector y parpadea un aviso en cursiva `"Límite alcanzado"`.
2. **Click Profundo Opcional:** Si se provee la prop `onReferenceClick`, las pildoras mutan y se hacen clickeables `cursor-pointer hover:bg-accent/20` para viajar hacia la configuración de la herramienta padre desde el menú.

## 💡 Ejemplo de Uso
```tsx
<ResourceSelector
    label="Herramientas habilitadas"
    resources={todasLasToolsFetch}
    selectedIds={assistant.toolIds}
    onSelect={(id) => onAdelgazarToolIds([id, ...toolIds])}
    onRemove={(id) => filter(t => t.id !== id)}
/>
```
