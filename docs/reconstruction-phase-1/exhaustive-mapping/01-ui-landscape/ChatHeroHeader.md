---
id: "chat-hero-header"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/public-profile/components/identity/ChatHeroHeader.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Uso intensivo nativo DOM y APIs de Canvas HTML5" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Layout Parallax público" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Rutinas O(N) de muestreo de Image Pixels" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 ChatHeroHeader

## 🎯 Propósito
Esquina visual del Módulo "Public Profile". Funciona como un Cabezal (Hero Banner) altamente reactivo, responsivo y dinámico que se asimila a las cabeceras de redes sociales tipo X (Twitter) o Instagram. Está propulsado verticalmente por la posición del `progress` del scroll del Layout contenedor, logrando efectos tipo "Parallax" y disoluciones.

## 📦 Estado y Datos
**No usa Stores, Todo es Memoria Local DOM:**
- Emplea referencias cruzadas a componentes anclados (`containerRef`, `titleRef`).
- Expone un complejo objeto `dimensions` en estado, el cual guarda resultados matemáticos calculados dinámicamente: `avatarSize`, `textAreaWidth`, `titleFontSize`, coordenadas polares para `badgePosition`.
- Estado exótico `accentColor` extraído al vuelo.

## 🔄 Flujos de Interacción
1. **Extracción Cromática Dominante (Sampling):** Cuando monta la prop `profile.avatarUrl`, el hook dispara `extractDominantColor`, el cual crea silenciosamente en RAM un `new Image()`, redimensionada a 50x50px usando Canvas Context 2D. Ejecuta un bucle sobre `getImageData()` agrupando bloques RGB (quantización por divisiones de 32 bits) para hallar el color más frecuente. Esto muta el `accentColor` que colorea el Background Header y sus overlays de cristal negro.
2. **Motor Trigonométrico Responsivo (`calculateDimensions`):** Empleando el API de Canvas (`measureText`), calcula el ancho real que va a ocupar el texto bajo la fuente y el estilo determinado (rematando el tamaño entre breakpoints md de tailwind y reglas de 70/30 ratios móvil/desktop). Actualiza el Layout sin depender del lento motor de CSS y emite las coordenadas absolutas para posicionar el icono de la cuenta Verificada (Blue check/Badge).
3. **Fusión Interpolada:** Con base en el prop inyectado `progress` (0 expansionado, 1 colapsado) emite variables CSS *inline*: `opacity: 1 - Math.min(1, progress * 1.5)`, `translateY`, y altera las variables reactivas de altura permitiendo transiciones hiper fluidas a 60 FPS sin reflows pesados del DOM principal de React.

## 💡 Ejemplo de Uso
```tsx
import { ChatHeroHeader } from '../../public-profile/components/identity/ChatHeroHeader';

<ChatHeroHeader 
   profile={{ displayName: 'Coca Cola', alias: 'cocacola', avatarUrl: '...' }}
   progress={scrollProgressPercentage} 
/>
```
