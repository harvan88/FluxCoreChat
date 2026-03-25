---
id: "fluxcore-icon"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/ui/icons/FluxCoreIcon.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "SVG Puro en duro" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Logotipo Vectorial de Identidad de Marca" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Escalamiento diferencial matemático (`size`)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 FluxCoreIcon

## 🎯 Propósito
Es la encarnación oficial programática del Logotipo de la plataforma "FluxCore". Empaqueta permanentemente vectores de identidad visual para ser inyectados masivamente en cabeceras analíticas, páginas vacías, sidebars o modales de bienvenida, abstrayendo a los componentes de requerir imágenes PNG externas defectuosas o imports problemáticos de Assets SVG.

## 📦 Estado y Datos
**No Reactividad Interna:**
- Extrapola props inmutables estéticas: Cadena libre opcional `className` y numeral generativo `size`.

## 🔄 Flujos de Interacción
1. **Inteligencia Auto-calculable Aspect Ratio:** Entiende que SVG requiere relaciones proporcionales herméticas para eludir derretimientos. Si el desarrollador inyecta un solo eje rector (`size`), el componente multiplica y forja computacionalmente la altitud necesaria para mantener pureza matemática (`size * (26 / 23)`). 
2. **Auto-Ajuste Paramétrico Fino (Stroke):** Alimenta los calibres gruesos del vector estelar para evitar achicamientos. El `starStroke = Math.max(size * 0.035, 0.75)` asegura que si el logotipo se reduce a escala minúscula, la inteligencia matemática obligue que la brocha de su delineado no sea más angosta que `.75px` previniendo desapariciones milimétricas visuales en retina displays.

## 💡 Ejemplo de Uso
```tsx
import { FluxCoreIcon } from '../../components/ui/icons/FluxCoreIcon';

<div className="flex logo-header">
   <FluxCoreIcon size={42} className="text-accent" />
   <p>Bienvenido a FluxCore Platform</p>
</div>
```
