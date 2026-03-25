---
id: "public-profile-layout"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/public-profile/layouts/PublicProfileLayout.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Framework Envolvente" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Estructura Base de 3 Columnas (CSS Grid)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Radial Gradients, Fallback Skeletons" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📐 PublicProfileLayout

## 🎯 Propósito
Esqueleto maestro del diseño responsivo para los portales de vista pública. Emplea un esquema de CSS Grid moderno de 12 columnas (`grid-cols-12`) colapsable, permitiendo la inyección a través de slots (`chatBlock`, `infoBlock`, `actionsBlock`).

## 📦 Estado y Datos
100% Sin Estado lógico, 100% Presentacional Layout.

## 🔄 Flujos de Interacción
1. **Inmersión de Fondo:** Posee un div fijo pintando dos enormes gradientes circulares usando Tailwind arbitrario `bg-[radial-gradient(circle_...)]`. Evita interacciones de puntero.
2. **Skeletons Nativos:** Si la página madre no provee componentes para las columnas laterales (`infoBlock` / `actionsBlock`), él auto-dibuja bloques traslucidos falsos (Skeletons / placeholders vacíos) para mantener el peso visual de la arquitectura.

## 💡 Ejemplo de Uso
```tsx
<PublicProfileLayout
    chatBlock={<ProfileChatBlockDesktop />}
    infoBlock={<PublicProfileHeader />}
/>
```
