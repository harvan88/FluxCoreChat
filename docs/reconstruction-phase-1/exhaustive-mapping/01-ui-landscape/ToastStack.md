---
id: "toast-stack"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/ui/ToastStack.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Consumidor Nativo de Zustand `useUIStore.toasts`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Controlador Global de Notificaciones Fímeras" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Mapeo Fijo en Pantalla (Fixed top-4 right-4), Clsx Colors" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🍞 ToastStack

## 🎯 Propósito
El despachador global de notificaciones flotantes (Snackbars / Toasts). Vive fuera de la lógica de enrutamiento (montado cerca de la raíz de la App en el z-index supremo `z-50`) escuchando eternamente si algún rincón oscuro de la aplicación solicitó "Mostrar un mensaje verde de guardado".

## 📦 Estado y Datos
- **Lector de Estado Global:** Solo lee `toasts` desde `useUIStore`.
- **Destructor Selectivo:** Provee a cada tarjeta mostrada de una "X" que llama inversamente a `removeToast(toast.id)` limpiándolo del store si el usuario no quiere esperar los 5s automáticos de caducidad que ocurren del otro lado.

## 🔄 Flujos de Interacción
1. **Posicionamiento Brutal:** Se clava usando `fixed top-4 right-4` apilando desde arriba del monitor hacia abajo las notificaciones sobre elementos borrosos (Glassmorfismo `backdrop-blur`).
2. **Conmutador de Peligros:** Traduce el prop `type` ('success', 'error', 'info') en severas variaciones semánticas usando tailwind base como `border-error/40 bg-error/10`.

## 💡 Ejemplo de Uso
```tsx
// Solo importa el Store desde CUALQUIER OTRA PARTE del codigo, y llama:
const { addToast } = useUIStore();
addToast({ type: 'success', title: 'Guardado', description: 'Cambios aplicados' });

// Y automáticamente el <ToastStack/> (que ya está montado en App.tsx) lo mostrará.
```
