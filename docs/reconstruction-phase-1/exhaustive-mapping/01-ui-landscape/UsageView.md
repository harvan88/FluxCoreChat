---
id: "usage-view"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/fluxcore/views/UsageView.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Fetch masivo triple en paralelo (Promise.All)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Panel/Dashboard de Reporte de Consumos" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Agregación Numérica, Auto-Formatter de Miles/Megabytes" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📈 UsageView

## 🎯 Propósito
Vista de nivel Administrativo para el Cliente ("Tenant"). Le dibuja una foto en alta defición reportando cuánta infra le están drenando al clúster (El temido Storage Size por subir Pdfs tontos) y fundamentalmente, los Tokens Usados que queman saldos API. 

## 📦 Estado y Datos
**Promise Destructuring Paralelo:**
- Su `loadStats()` detiene las peticiones lentas encadenadas, acudiendo a resolver `Promise.all` contra `assistants`, `instructions` y `vector-stores`, de un solo impacto. Devuelve los arrays e itera los arreglos completos con un Reducer `reduce((acc, a) => acc + (a.sizeBytes))` acumulativo crudo lado frontend.

## 🔄 Flujos de Interacción
1. **Mapeo Humano (Formatters):** Tiene formateadores puros cortando matemáticas `(num / 1000000).toFixed(1) + 'M'` transformando `4500000` locos en `4.5M Tokens`.
2. **Barra de Progreso Capada:** Dibuja el Storage consumido frente a un Hard-Cap teórico frontend (100MB fijos) pintando la barrita del porcentaje sin pasarse gracias a `Math.min(..., 100)`.

## 💡 Ejemplo de Uso
```tsx
<UsageView accountId={tenantContextId} />
```
