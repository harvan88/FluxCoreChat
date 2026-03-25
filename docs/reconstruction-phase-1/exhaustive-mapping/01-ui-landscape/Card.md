---
id: "card"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/ui/Card.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-23", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-23", confidence: 100, notes: "Componentes acoplados de Slotting" }
  subsystem: { status: "complete", completed_date: "2026-03-23", confidence: 100, notes: "Sistema universal de Contenedores" }
  operations: { status: "complete", completed_date: "2026-03-23", confidence: 100, notes: "Layout exports puros (Body, Header, Footer)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 Card

## 🎯 Propósito
Es el molde de empaquetado UI global que enjaula y da estructura formal a todos los widgets del entorno. En lugar de forzar a todos a escribir flexboxes para armar títulos y listados, provee componentes anidados prefabricados (`Card`, `CardHeader`, `CardBody`, `CardFooter`) con separadores integrados, espaciados exactos e intenciones pre-cocinadas.

## 📦 Estado y Datos
**Props Sintéticas Transversales:**
- Carece en su totalidad de estado activo o interactividad de negocio. Soporta cualquier hijo (`ReactNode`).
- **`Card` principal**: Admite `variant` (default, shadow elevated, bordered, hover interactive) y `padding` genérico.
- **`CardHeader`**: Expone slots semánticos limpios (`title`, `subtitle`, pasaje de slot reactivo transversal para botonera derecha: `actions`).

## 🔄 Flujos de Interacción
1. **Estructura Libre Lego-Style:** Los componentes exportados funcionan como "Slots". No es imperativo utilizar Header o Footer si uno no lo desea; el componente raíz `Card` solo recorta (`overflow-hidden`) y acentúa el contenedor (`rounded-xl bg-elevated border`).
2. **Propagación Inter-Bordes (Border-Collapse CSS):** Las subcapas (`CardHeader`, `CardFooter`) aplican inteligentemente líneas divisorias sub-sutiles (`border-b border-subtle` y `border-t border-subtle`), resultando en una segregación perfecta de los hijos de forma orgánica sin invadir el scope `CardBody`.

## 💡 Ejemplo de Uso
```tsx
import { Card, CardHeader, CardBody, CardFooter } from '../../components/ui/Card';

<Card variant="interactive" padding="none">
   <CardHeader 
      title="Integración Salesforce" 
      subtitle="v2.0" 
      actions={<Button>Desconectar</Button>} 
   />
   <CardBody padding="lg">
      <p>Cuerpo del contenido principal</p>
   </CardBody>
   <CardFooter align="between">
      <span>Creado Hoy</span>
      <button>Guardar</button>
   </CardFooter>
</Card>
```
