---
id: "switch"
type: "ui-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/ui/Switch.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Formato UI minimalista en todos los modales de Configuración" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Switch Toggle Animado" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Maneja Accesibilidad `role=\"switch\"`, Space/Enter press" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🎨 Switch

## 🎯 Propósito
Un interruptor estético minimalista estilo móvil. Remplaza los checkboxes rudimentarios `type="checkbox"` otorgando a la UI un look de aplicación inmersiva o "App Setting" nativo. 

## 📦 Estado y Datos
**Props Limitadas Stateless:**
- No retiene persistencia reactiva por sí sola. Muta su capa visual dependiendo estrictamente de la variable inyectada al padre `checked`, asegurando no desestabilizarse en formulaciones lentas.

## 🔄 Flujos de Interacción
1. **Accesibilidad Blindada:** Responde no solo a clicks directos sino al teclado. Detecta comandos Space y Enter si es focuseado con Tabulaciones (TabIndex 0) preveyendo flujos no dominantes del usuario (`onKeyDown`).
2. **Cínamatica Translada:** Intercala variables utilitarias como `translate-x-[16px]` para resbalar la bolita visual por encima con curvas vectoriales cubic-bezier.

## 💡 Ejemplo de Uso
```tsx
import { Switch } from '../../components/ui/Switch';

<Switch 
   checked={isTurboMode} 
   onCheckedChange={setTurboMode} 
   size="md" 
/>
```
