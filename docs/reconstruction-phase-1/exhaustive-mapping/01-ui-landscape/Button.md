---
id: "button"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/ui/Button.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Ninguna" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "UI Primitive - Motor Oficial de Clicks" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Aniquilación Automática de Elementos en Flag de Carga (Spinner), Re-mapeo Focus" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🔘 Button

## 🎯 Propósito
La primitiva de diseño más repetida del proyecto. Envuelve a todos los botones `<button>` de HTML estandarizando Rings de Foco (Accesibilidad), comportamientos de carga de API y transiciones de colores base (Accent, Elevated, Error).

## 📦 Estado y Datos
Delegadas del HTML Props. Atrapa `ref` con `forwardRef` para que bibliotecas extremas (Como Radix, Framer Motion) puedan dominar al Botón.

## 🔄 Flujos de Interacción
1. **Autoconsumo de Bloqueo (`loading` flag):** Es brillante administrando promesas. Si le inyectas `loading={true}`, hace un secuestro de UI: Aniquila inmediatamente tu Ícono Lateral (`leftIcon`), apaga su reactividad física marcándose disabled de nivel DOM y genera en el medio un Átomo Lucide Loader2 Giratorio indicando Spin Visual para el humano.

## 💡 Ejemplo de Uso
```tsx
<Button 
  variant="primary" 
  size="md" 
  loading={isSaving} 
  leftIcon={<Save />}
>
  Guardar
</Button>
```
