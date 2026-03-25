---
id: "component-preview-gallery"
type: "smart-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/settings/ComponentPreviewGallery.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Compilación de diccionario gigante de sub-componentes" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Showcase flotante de UI" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Render dinámico de instancias React.ComponentType" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 ComponentPreviewGallery

## 🎯 Propósito
Expositor interactivo albergado usualmente dentro del área de Configuración (Settings/Appearance). Funciona como una mini biblioteca integrada (Estilo Storybook casero), orientada a demostrar a los administradores las capacidades formales de la UI canónica. Pre-compila múltiples ejemplos sub-funcionales instanciables con un clic en una ventana emergente.

## 📦 Estado y Datos
**Diccionario en Memoria Reactiva:**
- Depende de un arreglo pre-declarado de `const componentsCatalog: ComponentPreviewSpec[]` listando la metadata descriptiva cruzada con una ref al Componente Funcional Mock.
- Estado interno para saber qué ventana se amplificó: `activeComponent`.

## 🔄 Flujos de Interacción
1. **Instanciación Perezosa y Cíclica:** En su estado estático es solamente un grid the tarjetas de texto puro. Al pulsarse, se captura el objeto entero asigándolo como Elemento en memoria e inicializa un portal Fixed (`fixed inset-0 z-50`). 
2. **Auto-ejecución JSX (`(() => { ... })()`):** Dentro de la ventana flotante oscura, ejecuta un patrón primitivo de render programático. Convierte la variable cruda subyacente de `React.ComponentType` en nodo reactivo inyectando `<PreviewComponent />`, dándole vida a los estados lógicos y temporizadores embebidos (Ej, un Timer 2s fingiendo doble confirmación de borrado).

## 💡 Ejemplo de Uso
```tsx
import { ComponentPreviewGallery } from '../../components/settings/ComponentPreviewGallery';

export function SettingsAppearance() {
   return (
       <div className="layout">
           <ThemeSelector />
           <ComponentPreviewGallery />
       </div>
   )
}
```
