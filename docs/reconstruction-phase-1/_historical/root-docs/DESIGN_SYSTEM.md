# FluxCore Design System - Sistema de Diseño Canónico

> **REGLA INMUTABLE**: Todo componente visual DEBE seguir este sistema.
> No se permite HTML/CSS arbitrario fuera de estas reglas.

---

## PARTE 1: FILOSOFÍA DE DISEÑO

### 1.1 Principios Fundamentales
```
MINIMALISMO     → Menos es más. Sin decoración innecesaria.
CONSISTENCIA    → Todos los elementos siguen las mismas reglas.
JERARQUÍA       → Información organizada por importancia visual.
FUNCIONALIDAD   → Cada elemento tiene un propósito claro.
ACCESIBILIDAD   → Contraste adecuado, tamaños legibles.
```

### 1.2 Estilo Visual
- **Estética**: Moderna, limpia, profesional (tipo VS Code, Slack, Discord)
- **Bordes**: Sutiles, bajo contraste (no llamativos)
- **Sombras**: Mínimas o ninguna (flat design)
- **Esquinas**: Consistentes (4px para elementos pequeños, 8px para contenedores)
- **Espaciado**: Sistema de 4px (4, 8, 12, 16, 24, 32, 48)

---

## PARTE 2: PALETA DE COLORES

### 2.1 Tema Oscuro (Principal)
```css
/* Fondos - Escala de grises neutros */
--bg-base:        #0d0d0d;   /* Fondo principal (más oscuro) */
--bg-surface:     #141414;   /* Contenedores, paneles */
--bg-elevated:    #1a1a1a;   /* Elementos elevados, modales */
--bg-hover:       #242424;   /* Estado hover */
--bg-active:      #2a2a2a;   /* Estado activo/seleccionado */

/* Bordes */
--border-subtle:  #262626;   /* Bordes sutiles */
--border-default: #333333;   /* Bordes normales */
--border-strong:  #404040;   /* Bordes enfatizados */

/* Texto */
--text-primary:   #f5f5f5;   /* Texto principal */
--text-secondary: #a3a3a3;   /* Texto secundario */
--text-muted:     #737373;   /* Texto deshabilitado/hint */
--text-inverse:   #0d0d0d;   /* Texto sobre colores accent */

/* Accent - Azul frío profesional */
--accent-primary: #3b82f6;   /* Azul principal */
--accent-hover:   #2563eb;   /* Azul hover */
--accent-muted:   #1e3a5f;   /* Azul muy sutil (backgrounds) */

/* Estados semánticos */
--color-success:  #22c55e;   /* Verde éxito */
--color-warning:  #f59e0b;   /* Amarillo advertencia */
--color-error:    #ef4444;   /* Rojo error */
--color-info:     #3b82f6;   /* Azul información */

/* Overlays */
--overlay-light:  rgba(255, 255, 255, 0.05);
--overlay-dark:   rgba(0, 0, 0, 0.5);
```

### 2.2 Tema Claro
```css
/* Fondos */
--bg-base:        #ffffff;
--bg-surface:     #f9fafb;
--bg-elevated:    #f3f4f6;
--bg-hover:       #e5e7eb;
--bg-active:      #d1d5db;

/* Bordes */
--border-subtle:  #e5e7eb;
--border-default: #d1d5db;
--border-strong:  #9ca3af;

/* Texto */
--text-primary:   #111827;
--text-secondary: #4b5563;
--text-muted:     #9ca3af;
--text-inverse:   #ffffff;

/* Accent - Mismo azul */
--accent-primary: #3b82f6;
--accent-hover:   #2563eb;
--accent-muted:   #dbeafe;
```

---

## PARTE 3: TIPOGRAFÍA

### 3.1 Familia de Fuentes
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

### 3.2 Escala Tipográfica
```
text-xs:   12px / 16px   → Hints, badges, timestamps
text-sm:   14px / 20px   → Texto secundario, labels
text-base: 16px / 24px   → Texto principal (DEFAULT)
text-lg:   18px / 28px   → Títulos de sección
text-xl:   20px / 28px   → Títulos de panel
text-2xl:  24px / 32px   → Títulos principales
```

### 3.3 Pesos
```
font-normal:   400   → Texto body
font-medium:   500   → Labels, botones
font-semibold: 600   → Títulos, énfasis
font-bold:     700   → Headers principales
```

---

## PARTE 4: ESPACIADO

### 4.1 Sistema de 4px
```
space-0:   0px
space-1:   4px    → Micro espaciado interno
space-2:   8px    → Espaciado interno pequeño
space-3:   12px   → Espaciado interno medio
space-4:   16px   → Espaciado interno estándar
space-5:   20px   → Espaciado secciones
space-6:   24px   → Espaciado contenedores
space-8:   32px   → Espaciado grande
space-10:  40px   → Espaciado extra grande
space-12:  48px   → Márgenes de página
```

### 4.2 Aplicación
- **Padding interno de componentes**: 8-16px
- **Gap entre elementos**: 8-12px
- **Márgenes entre secciones**: 16-24px
- **Padding de contenedores principales**: 16px

---

## PARTE 5: COMPONENTES CANÓNICOS

### 5.1 Botones

```
Variantes:
├── Primary   → bg-accent, text-inverse, usado para acciones principales
├── Secondary → bg-surface, border, text-primary, acciones secundarias
├── Ghost     → transparent, text-secondary, acciones terciarias
└── Danger    → bg-error, text-inverse, acciones destructivas

Tamaños:
├── sm → h-8, px-3, text-sm
├── md → h-10, px-4, text-base (DEFAULT)
└── lg → h-12, px-6, text-lg

Estados:
├── default → colores base
├── hover   → bg más claro/oscuro
├── active  → bg más intenso
├── disabled → opacity-50, cursor-not-allowed
└── loading → spinner + texto

Esquinas: rounded-lg (8px)
```

### 5.2 Inputs

```
Estructura:
├── Label (opcional) → text-secondary, text-sm, mb-1.5
├── Input container  → bg-elevated, border-default, rounded-lg
├── Icon (opcional)  → text-muted, izquierda
├── Input            → text-primary, placeholder:text-muted
└── Helper/Error     → text-sm, text-muted o text-error

Estados:
├── default → border-default
├── focus   → border-accent, ring-2 ring-accent/20
├── error   → border-error
└── disabled → opacity-50

Altura: h-10 (40px)
Padding: px-3, con icono pl-10
```

### 5.3 Cards/Contenedores

```
Jerarquía:
├── Level 0 → bg-base (fondo de página)
├── Level 1 → bg-surface (paneles principales)
├── Level 2 → bg-elevated (cards dentro de paneles)
└── Level 3 → bg-hover (elementos interactivos)

Estructura:
├── Container → bg-surface, border-subtle, rounded-lg
├── Header    → border-b, py-3, px-4, flex justify-between
├── Body      → p-4
└── Footer    → border-t, py-3, px-4

Esquinas: rounded-lg (8px)
Bordes: border border-subtle
```

### 5.4 Listas de Items

```
Estructura:
├── Container  → flex flex-col
└── Item       → flex items-center gap-3, px-3, py-2

Estados de Item:
├── default    → transparent
├── hover      → bg-hover
├── selected   → bg-active
└── unread     → + indicador visual

Anatomía de Item:
├── Avatar/Icon → w-10 h-10, rounded-full
├── Content     → flex-1, truncate
│   ├── Title  → text-primary, font-medium
│   └── Subtitle → text-secondary, text-sm
├── Meta        → text-muted, text-xs
└── Actions     → opacity-0, group-hover:opacity-100
```

### 5.5 Tabs

```
Variantes:
├── Underline → border-b, item activo con border-accent
└── Pills     → bg-hover para activo

Estructura:
├── TabList   → flex, border-b border-subtle
└── TabItem   → px-4 py-2, text-secondary, hover:text-primary
    └── Active → text-primary, border-b-2 border-accent

Estados:
├── default   → text-secondary
├── hover     → text-primary
├── active    → text-primary, indicador
└── disabled  → text-muted, cursor-not-allowed
```

### 5.6 Mensajes de Chat

```
Estructura de Burbuja:
├── Container     → flex gap-2
├── Avatar        → w-8 h-8, rounded-full (solo recibidos)
├── Bubble        → max-w-[80%], rounded-2xl
│   ├── Incoming  → bg-surface, text-primary, rounded-tl-sm
│   └── Outgoing  → bg-accent, text-inverse, rounded-tr-sm
├── Content       → px-3 py-2
└── Meta          → text-xs, text-muted, mt-1

Alineación:
├── Incoming → justify-start
└── Outgoing → justify-end
```

### 5.7 Avatares

```
Tamaños:
├── xs → w-6 h-6
├── sm → w-8 h-8
├── md → w-10 h-10 (DEFAULT)
├── lg → w-12 h-12
└── xl → w-16 h-16

Estructura:
├── Con imagen → img, object-cover, rounded-full
└── Sin imagen → bg-accent, text-inverse, iniciales centradas

Indicadores:
├── Online  → dot verde, absolute bottom-0 right-0
├── Offline → dot gris
└── Busy    → dot rojo
```

### 5.8 Badges/Pills

```
Variantes:
├── Default  → bg-hover, text-secondary
├── Primary  → bg-accent-muted, text-accent
├── Success  → bg-success/10, text-success
├── Warning  → bg-warning/10, text-warning
├── Error    → bg-error/10, text-error
└── Count    → bg-accent, text-inverse, rounded-full

Tamaño: h-5, px-2, text-xs, font-medium, rounded-full
```

---

## PARTE 6: LAYOUT CANÓNICO

### 6.1 Estructura Principal
```
┌─────────────────────────────────────────────────────┐
│ App Container (bg-base, h-screen, flex)             │
├────┬────────────────────────────────────────────────┤
│ AB │ Sidebar          │ ViewPort                    │
│    │ (bg-surface)     │ (bg-base)                   │
│ 56 │ w-80             │ flex-1                      │
│ px │                  │                             │
│    │                  │ ┌─────────────────────────┐ │
│    │                  │ │ DynamicContainer        │ │
│    │                  │ │ (bg-surface)            │ │
│    │                  │ │                         │ │
│    │                  │ └─────────────────────────┘ │
└────┴──────────────────┴─────────────────────────────┘

AB = ActivityBar (w-14 collapsed, w-52 expanded)
```

### 6.2 Reglas de Anidamiento
```
bg-base     → Fondo de aplicación
  └── bg-surface   → Paneles principales (Sidebar, Containers)
        └── bg-elevated  → Cards, inputs, elementos elevados
              └── bg-hover    → Estados interactivos
```

---

## PARTE 7: ICONOGRAFÍA

### 7.1 Librería
- **Principal**: Lucide React
- **Tamaño por defecto**: 20px
- **Color por defecto**: currentColor (hereda del texto)

### 7.2 Tamaños
```
icon-sm:  16px  → Dentro de inputs, badges
icon-md:  20px  → Botones, listas (DEFAULT)
icon-lg:  24px  → Headers, acciones principales
icon-xl:  32px  → Estados vacíos, ilustraciones
```

### 7.3 Iconos Personalizados
Para iconos especiales no incluidos en Lucide:
1. Crear componente en `src/components/ui/icons`
2. Registrar en `src/lib/icon-library.ts`
3. Usar con tamaño consistente (ej: `<OpenAIIcon size={20} />`)

**Ejemplo de uso:**
```tsx
import { OpenAIIcon } from '@/lib/icon-library';

function MyComponent() {
  return (
    <div>
      <OpenAIIcon size={24} className="text-accent" />
    </div>
  );
}
```

---

## PARTE 8: ANIMACIONES

### 8.1 Transiciones
```css
/* Duración */
--duration-fast:   150ms
--duration-normal: 200ms
--duration-slow:   300ms

/* Easing */
--ease-default: cubic-bezier(0.4, 0, 0.2, 1)
--ease-in:      cubic-bezier(0.4, 0, 1, 1)
--ease-out:     cubic-bezier(0, 0, 0.2, 1)
```

### 8.2 Aplicación
- **Hover/Focus**: 150ms
- **Expand/Collapse**: 200ms
- **Modal/Drawer**: 300ms
- **Page transitions**: 300ms

---

## PARTE 9: REGLAS DE IMPLEMENTACIÓN

### 9.1 Clases Tailwind Canónicas
```
/* Usar SIEMPRE estas clases, NO colores hardcodeados */

Fondos:
- bg-base        → var(--bg-base)
- bg-surface     → var(--bg-surface)
- bg-elevated    → var(--bg-elevated)
- bg-hover       → var(--bg-hover)
- bg-active      → var(--bg-active)

Bordes:
- border-subtle  → var(--border-subtle)
- border-default → var(--border-default)
- border-strong  → var(--border-strong)

Texto:
- text-primary   → var(--text-primary)
- text-secondary → var(--text-secondary)
- text-muted     → var(--text-muted)

Accent:
- bg-accent      → var(--accent-primary)
- text-accent    → var(--accent-primary)
- border-accent  → var(--accent-primary)
```

### 9.2 Prohibiciones
```
❌ NO usar colores hardcodeados (bg-gray-800, text-blue-500, etc.)
❌ NO usar tailwind colors directos en componentes
❌ NO crear estilos inline para colores
❌ NO mezclar sistemas de diseño
❌ NO usar bordes gruesos (border-2, border-4)
❌ NO usar sombras grandes (shadow-lg, shadow-xl)
```

### 9.3 Obligaciones
```
✅ SIEMPRE usar variables CSS del tema
✅ SIEMPRE usar clases canónicas definidas aquí
✅ SIEMPRE seguir la jerarquía de fondos
✅ SIEMPRE usar espaciado del sistema de 4px
✅ SIEMPRE aplicar transiciones a estados interactivos
```

---

## PARTE 10: CHECKLIST DE AUDITORÍA

Para cada componente, verificar:

```
[ ] Usa solo colores del sistema (variables CSS)
[ ] Sigue jerarquía de fondos correcta
[ ] Espaciado usa sistema de 4px
[ ] Bordes son sutiles (border-subtle o border-default)
[ ] Esquinas son consistentes (4px o 8px)
[ ] Estados hover/focus definidos
[ ] Transiciones aplicadas (200ms)
[ ] Tipografía usa escala definida
[ ] Iconos usan tamaños del sistema
[ ] Accesible (contraste, focus visible)
```

---

**ÚLTIMA ACTUALIZACIÓN**: 2025-12-07
**VERSIÓN**: 1.0.0
