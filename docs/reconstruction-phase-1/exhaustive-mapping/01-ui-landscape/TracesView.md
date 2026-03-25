---
id: "traces-view"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/views/TracesView.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Hits REST API `/api/fluxcore/traces` y `/suggestions`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Panel Principal del Pipeline Cognitivo FluxCore (v8.3 Canon)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Aprobación/Rechazo de Respuestas 'Suggest', JSON Parsetree expandible de uso de sub-tools" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🕵️‍♂️ TracesView

## 🎯 Propósito
Vista nivel Ingeniería/Supervisión para auditar el funcionamiento cognitivo de los Agentes. Cumple un doble rol brutal:
1) Bandeja de Tareas (Aprobar/Editar respuestas de Bots en modo 'Supervisado').
2) Caja Negra de Vuelos (Muestra los logs exactos, tokens usados y cadenas de sub-herramientas usadas del Motor).

## 📦 Estado y Datos
**Arreglos Bidimensionales:**
- Trabaja un estado de matriz para `traces` (Las cosas que fallaron/pasaron) y uno para `suggestions` (Las que piden que aprietes Aprobar).
- Lleva conteo sucio `pendingCount` dibujando una mini capsula de notificaciones roja en la pestaña (Tab).

## 🔄 Flujos de Interacción
1. **La Guillotina Cognitiva:** En la pestaña "Sugerencias", el usuario es dueño y señor: permite apretar "Rechazar" (Mata el prompt fantasma del IA), "Editar y Enviar" (Mejora la sintaxis y luego Manda HTTP PATCH), o "Aprobar Directamente" ahorrando tecleos.
2. **Despliegue de Acordeón Diagnóstico:** En la vista de Trazas Acabadas, un click destapa la matriz mostrando al humano: `PromptTokens`, `DurationMs`, Sub-Llamadas (Si usó la herramienta API de PDF, Clima, etc) y los reintentos locales (ej. Error -> Swapeó Modelo).

## 💡 Ejemplo de Uso
```tsx
<TracesView accountId="main_company_acc" />
```
