---
id: "ai-status-indicator"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/conversations/AIStatusIndicator.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Recibe Callbacks pero no ejecuta APIs directamente" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Insigina Minimizada de Piloto Automático (Iconografia)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Mapeo Condicional Dinamico de Colores y Logos Lucide" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 AIStatusIndicator

## 🎯 Propósito
Es la versión miniatura, modo "Pastilla" o Badgeto del Panel Lateral (AIStatusHeader). Su trabajo es pintar humildemente en el Chat Principal si la inteligencia artificial está en 'Automático' (Verde), 'Supervisado' (Naranja) o 'Apagado' (Gris) y permite gatillar los cambios de estado.
## 📦 Props
```typescript
interface AIStatusIndicatorProps {
  mode: AssistantMode;           // 'auto' | 'suggest' | 'off'
  isFluxCoreEnabled: boolean;   // Control de visibilidad global
  isLoading?: boolean;          // Estado de carga del cambio de modo
  onToggle: (e: React.MouseEvent) => void; // Callback para disparar el cambio
}
```

## 🔄 Flujos de Interacción
1. **Delegación de Responsabilidad:** A diferencia del Header grande, éste no llama a hooks de automatización. Recibe la prop `mode` inyectada desde afuera y cuando lo clicas, grita hacia arriba con `onToggle`. Esencialmente un Dumb Component.

## 💡 Ejemplo de Uso
```tsx
<AIStatusIndicator 
  mode="suggest" 
  isFluxCoreEnabled={true} 
  onToggle={() => dispatchModeToggle()} 
/>
```
