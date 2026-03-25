---
id: "public-profile-header"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/public-profile/PublicProfileHeader.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Acoplado con avatar local" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Componente presentacional de cabecera" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Mapea Profile properties, Avatar en size xl, badge status" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 👤 PublicProfileHeader

## 🎯 Propósito
(La Tarjeta de Visita). El marco superior estático que pinta la biografía completa del Agente IA o del humano con el que el visitante está a punto de interactuar.

## 📦 Estado y Datos
No tiene estado interno reactivo más allá de sus props inyectadas por el Layout o la Página.

## 🔄 Flujos de Interacción
1. **Presencia Visual:** Maneja un booleano `isConnected` encendiendo un pequeño LED pseudo-verde (`bg-success`) confirmando si el sistema WSS base está online.

## 💡 Ejemplo de Uso
```tsx
<PublicProfileHeader
    profile={{
        displayName: "Soporte AI",
        alias: "soporte_ai",
        bio: "Agente certificado para incidencias B2B."
    }}
    isConnected={true}
/>
```
