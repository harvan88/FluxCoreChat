---
id: "view-container"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/core/components/ViewContainer.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Agnóstico, componente envoltorio (Wrapper)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Estructura Base de Páginas/Vistas" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Container H-Full flex-col, Cabecera Estática y Cuerpo Scrolleable" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📦 ViewContainer

## 🎯 Propósito
Esquina angular puramente arquitectónica. Es un `<Wrapper>` en el cual cualquier desarrollador debe meter sus Listas, Paneles o Formularios para asegurar que el Layout General (Un Título fijo arriba que no haga scroll, y un cuerpo que sí lo haga) se respete en todas las páginas internas de FluxCore a prueba de balas.

## 📦 Estado y Datos
Puramente un presentador funcional (Dump component). Recibe Props inmutables `title`, `subtitle`, `headerActions` (para pintar botoncitos a la derecha del título) y su `children`.

## 🔄 Flujos de Interacción
1. **Scrolling Limitado (`flex-1 overflow-y-auto`):** Forzado a que el Título Superior jamás suba cuando la persona navegue hacia abajo dentro del contenido. Esto es crítico porque el Título puede contener botones vitales como "Guardar Configuración".

## 💡 Ejemplo de Uso
```tsx
<ViewContainer 
    title="Mis Asistentes" 
    subtitle="Gestiona la IA"
    headerActions={<Button>+</Button>}
>
   <div className="listado-que-hara-scroll">...</div>
</ViewContainer>
```
