---
id: "template-list"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/templates/TemplateList.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Itera forzosamente sobre sus hermanas menores `TemplateCard`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor Principal del CRUD de Quick Replies (Front)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Estados Mutables Ligeros: Interfaz Collapsable de Buscador, Header Customizado Table" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📋 TemplateList

## 🎯 Propósito
Es el "Buscador y Presentador Base". A diferencia del `Table` Genérico, este optó por su cuenta por hard-codear un layout de cuadrículas estáticas (Usando `<table>` puro en HTML) para ensamblar el directorio jerárquico perfecto para una plantilla, sacrificando genéricos en favor de velocidad y customización al milímetro.

## 📦 Estado y Datos
- **Toggle Colapsado UI:** Mantiene en local `showFilters` para animar colapsos y despliegues del panel brutalista de los `Select` inputs y ordenamiento.
- **Delegación a Props Padre:** No maneja mutaciones, simplemente acusa recibo a la Vista Principal emitiendo ruidosos `onSortChange` o `onFiltersChange` empujando el recálculo (Filter/Sort) aguas arriba a dónde sea que esté el Master Array.

## 🔄 Flujos de Interacción
1. **Dirección Dinámica de Flechas (`toggleSortDirection`):** Invierte el vector (Asc|Desc) re-disparando los props permitiendo ordenar rápidamente las Canned Responses Alfabéticamente, o de las más antiguas a nuevesitas.
2. **Cero-Results UX Friendly:** Contiene un fallback masivo visual si `templates.length === 0` arrojando explicaciones al usuario `"Intenta con otros términos"` abaratando soporte técnico por confusiones.

## 💡 Ejemplo de Uso
```tsx
<TemplateList 
  templates={finalFilteredTemplatesArr} 
  filters={{ search: 'hola', category: 'support' }}
/>
```
