---
id: "sidebar-nav-list"
type: "ui-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/ui/sidebar/SidebarNavList.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Aislado y agnóstico de lógica de negocio pura" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Mapeador Visual de Sidebars Universales" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Ruteo dinámico de elementos `as=nav|div`, Clsx truncates" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📋 SidebarNavList

## 🎯 Propósito
Iterador atómico de UI. Transforma cómodamente una Array inyectado en un ramillete de botones estilizados FluxCore-Grade (con transiciones uniformes de colores, ellipsis para textos largos). 
## 🧰 Props
- `items` (SidebarNavItem[], Requerido): Grilla obligatoria de nodos a fabricar y estilizar. Promueve elementos con Iconos, Labels y sub-descripciones.
- `as` ('div' | 'nav', Opcional): Mutación de semántica HTML del componente envolvente. Default `'div'`.
- *Hereda atributos HTML nativos (HTMLAttributes)*: Como `className` a inyectar al Container base.

## 📦 Estado y Datos
Agnóstico, componente Funcional Puro. Requiere una especificación de array `SidebarNavItem[]`.

## 🔄 Flujos de Interacción
1. **Protección a Truncamientos:** Rodea el array mapeado `<div className="min-w-0">` y un `truncate` garantizando férreamente que si alguien nombra a una cuenta "Empresa XXXXXXXXXXXXXXXXXXX...", el sidebar no estallará destruyendo la retícula HTML, inyectando los `...` al finalizar el pixel.
2. **Trailing Slot Abiertos:** Habilita inyectar en línea JSX un componente ReactNode `trailing:` por si cada menú deseaba tener un Switch prendido, o una marquilla tipo globito rojo con un "1" para notificaciones, parando la propagación de clic accidental al div padre.

## 💡 Ejemplo de Uso
```tsx
<SidebarNavList
    items={[
        { id: "1", label: "Inicio", icon: <HomeIcon />, onSelect: goHome },
        { id: "2", label: "Ajustes", icon: <GearIcon />, active: true }
    ]}
    as="nav"
/>
```
