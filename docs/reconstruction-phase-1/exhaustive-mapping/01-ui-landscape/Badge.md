---
id: "badge"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/ui/Badge.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Ninguna" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "UI Primitive - Etiquetas Categóricas Universales" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Soporte Micro-Dots y Micro-Icons en Extremos, Matriz Bidimensional de Clases Tailwind" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🏷️ Badge

## 🎯 Propósito
Es la primitiva oficial para Etiquetas (Tags) Visuales dentro del sistema. Se usa para remarcar roles, métricas, estatus críticos o metadatas adosadas a cualquier Listado.

## 📦 Props
```typescript
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'info' | 'success' | 'warning' | 'error' | 'neutral'; // (default: 'neutral')
  size?: 'sm' | 'md' | 'lg';          // Tamaño (default: 'md')
  badgeStyle?: 'solid' | 'soft' | 'outline'; // Estilo (default: 'soft')
  leftIcon?: ReactNode;               // Icono a la izquierda
  rightIcon?: ReactNode;              // Icono a la derecha
  dot?: boolean;                      // Mostrar punto indicador (default: false)
}
```

## 🔄 Flujos de Interacción
1. **El Encordado Matemático de Temas:** Aplica una Matriz estricta (Record<Variant, Record<Style>>). Asegura que si alguien pide un Badge "Advertencia" de "Fondo Suave", arroje automáticamente la combinación inquebrantable de Opacidades y colores de Variables CSS (`bg-warning/20 text-warning`).
2. **Punto Focal (Micro-Dot):** Añade un flag binario `dot={true}` que se adueña de un pequeño bloque HTML predefinido a la izquierda de la tarjeta con clases Rounded-Full sirviendo visualmente como "Latido de Status", sin requerir que los programadores ensucien su UI pasándole logos.

## 💡 Ejemplo de Uso
```tsx
<Badge variant="success" badgeStyle="solid" size="lg" dot leftIcon={<Check />}>
  Sincronizado
</Badge>
```
