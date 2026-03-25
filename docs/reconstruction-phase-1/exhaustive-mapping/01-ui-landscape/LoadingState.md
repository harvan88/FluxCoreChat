---
id: "loading-state"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/fluxcore/shared/LoadingState.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Dependencia Aislada" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Indicador unificado textual y visual de Spinner" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Mutabilidad vía string props" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 LoadingState

## 🎯 Propósito
Componente atómico en la familia UI. Soluciona el renderizado repetitivo de "Pantallas de Carga Centradas" donde simplemente un círculo da giros junto a un texto. Alimenta la uniformidad del diseño, sustituyendo la creación manual de flexbox div > span por todo el proyecto.

## 📦 Estado y Datos
**No Reactivo:**
- Configurado por entrada directa Props `message` y `className`. Si no declara Mensaje asume `"Cargando datos..."`.

## 🔄 Flujos de Interacción
1. **Centrifugado Visual Estándar:** Imprime un círculo parcial transparente mediante bordes asimétricos y la clase `animate-spin` para simular un vórtice rotativo, centralizándolo absolutamente en base a padres relacionales `h-full`.

## 💡 Ejemplo de Uso
```tsx
import { LoadingState } from '../../components/fluxcore/shared/LoadingState';

if (isFetchingQuery) return <LoadingState message="Buscando a tu madre..." />;
```
