---
id: "checkbox"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/ui/Checkbox.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Uso de inputs HTML ocultos semánticos" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Grupo principal Form Controllers Booleans" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Patrón RadioGroup iterativo" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 Checkbox

## 🎯 Propósito
Familia de controladores de Formularios Booleanos (Checkbox, Radio, RadioGroup). Estandariza la entrada de opciones encadenadas sin depender de la visual nativa impuesta por el Sistema Operativo, escondiendo `<input>` crudos de HTML en el DOM, suplantándolos por íconos SVG de Lucide interactivos sobre Tailwind, manteniendo compatibilidad de uso tab-focus absoluto para la accesibilidad A11Y.

## 📦 Estado y Datos
**No Reactivo - Componente Tonto Transmisor:**
- Basado 100% en `forwardRef` para posibilitar ser acoplado limpiamente a frameworks como `react-hook-form` o `formik`.
- Extiende la interfaz `Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>` en Checkbox/Radio impidiendo polución de prop types indeseados.

## 🔄 Flujos de Interacción
1. **Ocultamiento de Native OS y Reconstrucción:** Aplica la clase especial defensiva `peer sr-only` (Screen Reader Only) para invisibilizar al elemento padre checkbox `<input>`. Un elemento hermano renderizado debajo `<div>` atrapa las modificaciones `peer-focus:ring-2` y altera el fondo dinámicamente según las variables externas reactivas `checked` y los errores locales.
2. **Soporte de Árbol Condicional Indeterminado:** El `<Checkbox>` incorpora un estado complejo extra, `indeterminate` (útil selectores de filas tabla maestros "Select All" si solo la mitad ha sido checkeado), desplegando en su lugar un ícono SVG nativo `<Minus strokeWidth={3} />`.
3. **Agrupación y Expansión Cíclica (RadioGroup Wrapper):** Despacha un módulo Wrapper `<RadioGroup>` que cicla con un Array dict. de "Opciones". Permite una reasignación automática de direcciones físicas de Flexbox usando `orientation: 'vertical' | 'horizontal'`, despachando callbacks limpios (`onChange(value)`) al hacer click sin forzar al programador manual a re-bindear decenas de métodos sintéticos.

## 💡 Ejemplo de Uso
```tsx
import { Checkbox, RadioGroup } from '../../components/ui/Checkbox';

// Selección Simple Múltiple
<Checkbox 
   label="Activar Logs" 
   description="Guarda comandos en la Base de Datos" 
   checked={true} 
/>

// Radio de Selección Cíclica Pura
<RadioGroup 
   name="server_zone" 
   value={formStatus} 
   onChange={(val) => setForm(val)} 
   orientation="horizontal"
   options={[
      { label: "Opc 1", value: "a" },
      { label: "Opc 2", value: "b" }
   ]}
/>
```
