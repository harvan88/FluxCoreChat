---
id: "template-preview"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/templates/TemplatePreview.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Consume `AssetPreview` si la plantilla trae Assets" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Renderizador Visual de Canned Responses" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Parseo Regex de `{{Variables}}`, Mapeo de fragmentos ReactNode" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 👁️ TemplatePreview

## 🎯 Propósito
Es el visor final (lo que pre-visualiza el admin o el user logueado) mostrando exactamente como se vería la burbuja de la plantilla (Quick reply) antes de ser despachada. Su función central es cazar variables del estilo `{{nombreCorto}}` en crudo y resaltarlas como mini-etiquetas de colores (`bg-accent/10`).
## 🧰 Props
- `content` (string, Requerido): El texto crudo con variables mustache `{{ }}` que debe ser formateado.
- `variables` (TemplateVariable[], Opcional): Tuplas diccionario para sustituir el texto in-place con etiquetas.
- `assets` (TemplateAsset[], Opcional): Elementos extra para invocar en cascada al `AssetPreview`.
- `accountId` (string, Requerido): Autorización cruzada delegada referencial.
- `className` (string, Opcional): Ajustes libres al div absoluto padre.
- `compact` (boolean, Opcional): Comprime el Grid Container a la mitad (2 columnas en vez de 3).

## 📦 Estado y Datos
**Parseador Al Vuelo (Regex Hook `useMemo`):**
- Toma el string ciego `content`. Aplica una iteración rigurosa de `/\{\{(\w+)\}\}/g` y va partiendo el texto en trozos: `[TextoNormal, <SpanColor/>, TextoNormal]`. Todo devuelto como Array de Nodos React para que React DOM no escape las etiquetas HTML.

## 🔄 Flujos de Interacción
1. **Delegador Múltiple de Assets:** Si la template lleva adjuntos pre-cargados (Por ejemplo: Mandar un PDF instructivo cada vez que alguien saluda), crea una retícula responsiva pequeña (`grid-cols-2`) llamando al componente pesado `AssetPreview` pasándole los Metadata.

## 💡 Ejemplo de Uso
```tsx
<TemplatePreview
  content="Hola {{nombre}}, adjunto tu manual."
  variables={[{ name: "nombre", defaultValue: "Cliente" }]}
  assets={template.assets}
  accountId="acc_123"
/>
```
