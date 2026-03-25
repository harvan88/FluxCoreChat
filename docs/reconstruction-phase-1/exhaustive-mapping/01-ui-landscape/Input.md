---
id: "input"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/ui/Input.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Patrón base aislado" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Sistema Maestro Formulario de Inputs" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Multivariante con iconos, Textareas y conmutador visualizador de password" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 Input (y Textarea)

## 🎯 Propósito
(FC-405). Encapsulación genérica y unificada de los elementos asilvestrados de HTML `<input>` y `<textarea>`. Forjado con Tailwind puro, estandariza todos los bordes, enfoques, placeholders y colores de la aplicación. Previene que cada formulario inyecte sus propios bordes o sufra de falta de accesibilidad.
## 🧰 Props
- `variant` (InputVariant, Opcional): Esculpe el input entre modes 'text', 'search', 'email', 'password', 'number' o 'textarea'.
- `label` (string, Opcional): Título superior nativo.
- `error` (string, Opcional): Causa que todo el input se pinte en variante destructiva y muestra un helper.
- `helperText` (string, Opcional): Guía pasiva inferior.
- `leftIcon` (ReactNode, Opcional): Nodo inyectable izquierdo (Se obvia si variant=\"search\").
- `rightIcon` (ReactNode, Opcional): Nodo inyectable derecho (Se obvia si variant=\"password\" para ubicar el Eye).
- `fullWidth` (boolean, Opcional): Fuerza 100% de la grilla padre.

## 📦 Estado y Datos
- Implementa `forwardRef` obligatorio para permitirle a las librerías genéricas de Formularios o Modales secuestrar el foco a voluntad.
- Estado interno puramente estético: Boolean `showPassword` mutando entre `'text' | 'password'`.

## 🔄 Flujos de Interacción
1. **Inteligencia Polimórfica de Variantes:** La Prop `variant` muta groseramente las entrañas. Si es "search" empuja un Paddign left brutal (`pl-10`) e inyecta la Lupa. Si deduce `rightIcon`, empuja el contenido al inverso (`pr-10`). Si se decreta condicional `hasError` contamina todo en Rojo encendido eluding el Accento natural de foco.

## 💡 Ejemplo de Uso
```tsx
import { Input, Textarea } from '../../components/ui/Input';

<form>
   <Input variant="email" label="Correo" leftIcon={<Mail/>} error={errors.mail} />
   <Input variant="password" label="Clave Secreta" />
   <Textarea rows={6} label="Descripción biográfica" />
</form>
```
