---
id: "openai-icon"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/ui/icons/OpenAIIcon.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Se apoya como utility vector" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Asset Visual Simple" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "SVG JSX Path" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🎨 OpenAIIcon

## 🎯 Propósito
Componente tonto contenedor del vector de la hélice logotipo oficial de OpenAI para adornar la jerarquía de Vector Stores e Identidades sin importar una imagen por HTTP perdiendo rendimiento.
## 🧰 Props
- `size` (number, Opcional): Radio simétrico para base y altura del SVG. Default: 20.
- `className` (string, Opcional): Atributos puramente estéticos referenciando tailwind CSS para customización de colores genéricos o stroke.

## 📦 Estado y Datos
100% Sin Estado. 

## 💡 Ejemplo de Uso
```tsx
import { OpenAIIcon } from '../../components/ui/icons/OpenAIIcon';

<OpenAIIcon size={24} className="text-purple-500" />
```
