---
id: "dynamic-profile-header"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/public-profile/components/identity/DynamicProfileHeader.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Recibe metadatos crudos del Enrutador (Vía props)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Cabecera Parallax Pública estilo Spotify" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Escalamiento diferencial e interpolaciones matemáticas atadas a Window.scrollY" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 DynamicProfileHeader

## 🎯 Propósito
(También conocida internamente como `SpotifyHeader`). Componente puramente visual encomendado a gobernar la presentación principal en páginas de acceso público (`Public Profile`). Implementa una cinemática de compresión ("Parallax Collapse"); pasando de un formato expansivo inmersivo (con alias y bio completas) a una barra de navegación contraída y "pegada" al techo (Sticky Nav) a medida que el usuario hace scroll para leer el contenido principal de la persona/empresa mostrada.

## 📦 Estado y Datos
**Props Matemáticas Reactivas:**
- `profile`: Objeto plano conteniendo `displayName`, `alias`, `avatarUrl`, y `bio`.
- `progress`: Float (0 a 1) derivado de un Engine de Scroll exterior (`useScroll`) que dictamina el nivel porcentual de compresión.

## 🔄 Flujos de Interacción
1. **Interpolación Matemática (Parallax Engine):** Lee activamente la variable mutante `progress` que el padre inyecta vía frames, transformando agresivamente Opacidad (`1 - progress`), Escala (`1 - (progress * 0.2)`) y Eje Vertical (`progress * -20`). Todos estos valores se inyectan en propiedades CSS puras estilo en-linea (`style={{ transform: ... }}`) para eludir los límites de renderizado de DOM y lograr 60 FPS.
2. **Sistema Binario de Estados Visuales:** Mantiene dos contenedores paralelos. Uno absoluto en Sticky (`fixed top-0 z-50`), y el otro relativo (Héroe expansivo principal). A medida que `progress` cruza la barrera de `0.8` (80% del camino scroleado hacia abajo), permuta usando clases `clsx` y condicionales opacidad la visibilidad del Header de Resumen, permitiendo una transición de desaparición suave pero de colisión visual dura en Top 0.

## 💡 Ejemplo de Uso
```tsx
import { SpotifyHeader } from '../../components/identity/DynamicProfileHeader';

<div className="scroll-container">
   <SpotifyHeader 
      profile={userPublicData} 
      progress={scrollPercentage} 
   />
</div>
```
