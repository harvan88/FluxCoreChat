---
id: "view-header"
type: "ui-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/ui/ViewHeader.tsx"
---

# 🤖 ViewHeader

## 🎯 Propósito
Componente de cabecera estandarizado para las vistas de la plataforma. Proporciona un título, un icono representativo, un contador opcional y un área para acciones rápidas (botones). Utiliza un diseño Bauhaus minimalista con bordes sutiles.

## 💡 Ejemplo de Uso
```tsx
import { Database } from 'lucide-react';
import { ViewHeader } from './components/ui';

<ViewHeader 
  icon={Database} 
  title="Base de conocimiento" 
  count={3}
>
  <button>Nueva entrada</button>
</ViewHeader>
```

## 🧩 Props
| Prop | Tipo | Descripción |
| :--- | :--- | :--- |
| `icon` | `LucideIcon` | Icono a mostrar junto al título. |
| `title` | `string` | Título principal de la vista. |
| `count` | `number` (opcional) | Contador numérico que se muestra junto al título. |
| `children` | `ReactNode` (opcional) | Acciones o botones a mostrar a la derecha. |
| `className` | `string` (opcional) | Clases adicionales para el contenedor. |
