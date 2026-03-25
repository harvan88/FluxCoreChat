---
id: "collapsible-section"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/ui/CollapsibleSection.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Desacoplado de persistencia, puro render" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Envoltorio layout canónico" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Paso de props visuales DaVinci UI" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 CollapsibleSection

## 🎯 Propósito
Ofrece un contenedor estructural de UX inspirándose explícitamente en el "Patrón DaVinci Resolve". Utilizado intensamente en paneles de configuración de alta densidad de información (Settings, Ajustes de Bot), permite al usuario acorralar configuraciones bajo secciones colapsables que adicionalmente le avisan de antemano de un simple vistazo si están siendo aplicadas (Switch global integrado en el encabezado).

## 📦 Estado y Datos
**Props Controlables e Inyectadas:**
- `isExpanded` y `customized` actúan como registros locales que copian la herencia del estado padre (`defaultExpanded`, `isCustomized`).

## 🔄 Flujos de Interacción
1. **Despliegue Físico Acordeón:** Emplea transformaciones suaves CSS rotando un galón numéricamente (`-rotate-90` a `rotate-0`) al interactuar con la cabecera, montando de manera diferida a los Nodos Secundarios (Hijos VDOM) `children` si `isExpanded={true}` ahorrando masivamente bytes de Paint Computation en React.
2. **Override Táctico Automático:** Posee un puente lógico (`AUTO-EXPAND`): Si el usuario pulsa sobre el Toggle Mini Switcher indicando que desea "Anular los valores predeterminados y configurar una versión propia", el componente interconecta los estados, obligando automáticamente al acordeón a abrirse asumiendo correctamente la intención del usuario final.

## 💡 Ejemplo de Uso
```tsx
import { CollapsibleSection } from '../../components/ui/CollapsibleSection';

<CollapsibleSection 
  title="Ajustes Acústicos" 
  isCustomized={userVolumeEnabled}
  onToggleCustomized={(v) => updateUserParams(v)}
>
   <SliderControl volume={localVolume} />
</CollapsibleSection>
```
