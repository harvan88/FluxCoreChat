# FLUXCORE - ANÁLISIS DE UI Y PLAN DE IMPLEMENTACIÓN

> **Fecha**: 2025-12-07  
> **Estado**: Análisis completo con plan de ejecución

---

## PARTE 1: ANÁLISIS DEL ESTADO ACTUAL DE LA UI

### 1.1 Componentes Implementados

| Componente | Estado | Alineación TOTEM | Notas |
|------------|--------|------------------|-------|
| `Layout.tsx` | ✅ Implementado | 70% | Estructura básica funcional |
| `ActivityBar.tsx` | ✅ Implementado | 60% | Solo íconos, sin expand/collapse |
| `Sidebar.tsx` | ✅ Implementado | 50% | Sin pin/lock, sin toggle visible |
| `ViewPort.tsx` | ✅ Implementado | 80% | Multi-container funcional |
| `DynamicContainer.tsx` | ✅ Implementado | 75% | Tabs funcionan, faltan controles |
| `TabBar.tsx` | ✅ Implementado | 70% | Básico, sin drag-drop |
| `panelStore.ts` | ✅ Implementado | 90% | Completo según TOTEM PARTE 11 |
| `uiStore.ts` | ✅ Implementado | 60% | Falta estado de tema |

### 1.2 Gap Analysis: ActivityBar

**Estado Actual:**
```typescript
// ActivityBar.tsx - Solo estado colapsado (íconos)
<div className="w-14 bg-gray-900 flex flex-col items-center py-4">
```

**Según Especificación Canónica:**

| Requisito | Implementado | Gap |
|-----------|--------------|-----|
| Estado colapsado (solo íconos) | ✅ | - |
| Estado expandido (íconos + texto) | ❌ | Falta toggle expand |
| Ícono hamburger para expand | ❌ | Falta UI control |
| Animación suave (300ms) | ❌ | Sin animaciones |
| Retrae al seleccionar actividad | ❌ | No implementado |
| Estado móvil (menú) | ❌ | Sin responsive |

### 1.3 Gap Analysis: Sidebar

**Estado Actual:**
```typescript
// Sidebar.tsx - Visible/oculto binario
if (!sidebarOpen) return null;
```

**Según Especificación Canónica:**

| Requisito | Implementado | Gap |
|-----------|--------------|-----|
| Cerrado/Oculto | ✅ | - |
| Abierto/Expandido | ✅ | - |
| Fijado/Pinned (candado) | ❌ | Sin icono lock |
| Animación deslizamiento | ❌ | Aparece/desaparece bruscamente |
| Toggle al re-click en ActivityBar | ❌ | No implementado |
| Header con título + controles | ⚠️ | Solo título |

### 1.4 Gap Analysis: Dynamic Containers

**Estado Actual:**
```typescript
// DynamicContainer.tsx
<div className={`flex flex-col h-full bg-gray-900 border border-gray-700 rounded`}>
```

**Según Especificación Canónica:**

| Requisito | Implementado | Gap |
|-----------|--------------|-----|
| Máximo 3 containers | ✅ | Via panelStore |
| Header con controles | ⚠️ | Solo en TabBar |
| Pin (📌) container | ⚠️ | Lógica existe, UI falta |
| Expandir/Maximizar (⤢) | ❌ | No implementado |
| Cerrar container (×) | ⚠️ | Solo en tabs |
| Ring activo (focus) | ✅ | `ring-2 ring-blue-500` |
| Diálogo max containers | ❌ | Abre como tab silenciosamente |
| Estado vacío bonito | ⚠️ | Básico |
| Drag & resize | ❌ | No implementado |

### 1.5 Gap Analysis: Sistema de Temas

**Estado Actual:**
```css
/* index.css - Solo tema oscuro hardcodeado */
:root {
  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;
}
```

**Según Especificación:**

| Requisito | Implementado | Gap |
|-----------|--------------|-----|
| Tema oscuro | ✅ | Default actual |
| Tema claro | ❌ | No existe |
| Toggle de tema | ❌ | No existe |
| Persistencia de preferencia | ❌ | No existe |
| CSS variables para temas | ❌ | Colores hardcodeados |
| Preferencia del sistema | ❌ | No detecta |

### 1.6 Gap Analysis: ViewPort Estado Vacío

**Según Especificación Canónica:**
```
┌───────────────────────────────────────────────────┐
│        [ícono de FluxCore]                        │
│        Bienvenido a FluxCore                      │
│        Selecciona una conversación o contacto     │
│        [ Botón: Explorar conversaciones ]         │
│        [ Botón: Ver todos los contactos ]         │
└───────────────────────────────────────────────────┘
```

**Estado Actual:** `WelcomeView.tsx` existe pero necesita verificación de contenido.

---

## PARTE 2: SISTEMA DE TEMAS (CLARO/OSCURO)

### 2.1 Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                    THEME SYSTEM                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  themeStore.ts          CSS Variables          Components     │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐ │
│  │ theme:      │ ────► │ :root       │ ────► │ Tailwind    │ │
│  │ 'light'     │       │ --bg-primary│       │ classes     │ │
│  │ 'dark'      │       │ --text-main │       │ bg-primary  │ │
│  │ 'system'    │       │ --border    │       │ text-main   │ │
│  └─────────────┘       └─────────────┘       └─────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Paleta de Colores

#### Tema Oscuro (Actual - Refinado)
```css
:root[data-theme="dark"] {
  /* Backgrounds */
  --bg-primary: #0f0f0f;      /* Fondo principal */
  --bg-secondary: #1a1a1a;    /* ActivityBar, Sidebar */
  --bg-tertiary: #242424;     /* Containers, cards */
  --bg-elevated: #2a2a2a;     /* Hover, modals */
  
  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #a1a1a1;
  --text-muted: #6b6b6b;
  
  /* Borders */
  --border-primary: #333333;
  --border-secondary: #404040;
  
  /* Accent */
  --accent-primary: #3b82f6;   /* Blue-500 */
  --accent-hover: #2563eb;     /* Blue-600 */
  
  /* Status */
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
}
```

#### Tema Claro (Nuevo)
```css
:root[data-theme="light"] {
  /* Backgrounds */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #fafafa;
  --bg-elevated: #ffffff;
  
  /* Text */
  --text-primary: #171717;
  --text-secondary: #525252;
  --text-muted: #a3a3a3;
  
  /* Borders */
  --border-primary: #e5e5e5;
  --border-secondary: #d4d4d4;
  
  /* Accent */
  --accent-primary: #2563eb;
  --accent-hover: #1d4ed8;
  
  /* Status */
  --success: #16a34a;
  --warning: #d97706;
  --error: #dc2626;
}
```

### 2.3 Componentes a Crear

```
apps/web/src/
├── store/
│   └── themeStore.ts          # Zustand store para tema
├── hooks/
│   └── useTheme.ts            # Hook para acceder al tema
├── components/
│   └── common/
│       └── ThemeToggle.tsx    # Componente switch de tema
└── index.css                  # CSS variables actualizadas
```

---

## PARTE 3: MILESTONE PLAN

### Milestone UI-1: Sistema de Temas (Claro/Oscuro) ✅ COMPLETADO
**Duración real:** 1 día  
**Estado:** ✅ Completado

```
Entregables implementados:
✅ themeStore.ts con persistencia (localStorage)
✅ CSS variables para ambos temas (claro/oscuro/sistema)
✅ ThemeToggle component (3 variantes)
✅ ThemeSettings para SettingsPanel
✅ Migración de colores hardcodeados a clases de tema
✅ Integración en SettingsPanel → Apariencia
```

### Milestone UI-2: ActivityBar Canónica ✅ COMPLETADO
**Duración real:** 1 día  
**Estado:** ✅ Completado

```
Entregables implementados:
✅ Estado expandido (íconos + texto)
✅ Ícono toggle expand/collapse (PanelLeftOpen/Close)
✅ Animación suave (300ms transition-all)
✅ Auto-collapse al seleccionar actividad
✅ Indicador visual de actividad activa
✅ Brand "FluxCore" visible cuando expandido
```

### Milestone UI-3: Sidebar Canónico ✅ COMPLETADO
**Duración real:** 1 día  
**Estado:** ✅ Completado

```
Entregables implementados:
✅ Ícono candado (Lock/LockOpen)
✅ Ícono cerrar (X) - solo si no está pinned
✅ Animación deslizamiento (300ms ease-in-out)
✅ Toggle al re-click en ActivityBar
✅ Header con controles visuales
✅ Comportamiento pinned vs no-pinned
✅ Persistencia de estado pinned
```

### Milestone UI-4: Dynamic Containers Canónicos ✅ COMPLETADO
**Duración real:** 1 día  
**Estado:** ✅ Completado

```
Entregables implementados:
✅ Header con controles [📌] [⤢] [×]
✅ Pin container funcional (Pin/PinOff icons)
✅ Minimize/restore container
✅ Cerrar container (deshabilitado si es el último)
✅ Clases de tema aplicadas
✅ TabItem con hover effects mejorados
```

### Milestone UI-5: WelcomeView Mejorada ✅ COMPLETADO
**Duración real:** 0.5 días  
**Estado:** ✅ Completado

```
Entregables implementados:
✅ Diseño según especificación TOTEM
✅ Botones de acción (Explorar conversaciones, Ver contactos)
✅ Link secundario (Explorar extensiones)
✅ Hint visual para sidebar
✅ Clases de tema aplicadas
```

### Milestone UI-6: Responsive & Mobile ✅ COMPLETADO
**Duración real:** 1 día  
**Estado:** ✅ Completado

```
Entregables implementados:
✅ Hook useMediaQuery / useIsMobile
✅ Estado isMobile/mobileMenuOpen en uiStore
✅ Layout condicional (Desktop vs Mobile)
✅ Mobile header con hamburger menu
✅ Mobile drawer con ActivityBar + Sidebar
✅ Overlay para cerrar al hacer clic fuera
✅ Sidebar simplificado para móvil
```

### Milestone UI-7: Documentación ✅ COMPLETADO
**Duración real:** 0.5 días  
**Estado:** ✅ Completado

```
Entregables:
✅ Documentación de UI_ANALYSIS_AND_PLAN.md
✅ Actualización de ESTADO_PROYECTO.md
✅ Comentarios TOTEM en componentes
```

---

## PARTE 4: TECHNICAL BACKLOG

### 4.1 Backlog de Alta Prioridad

| ID | Tarea | Componente | Estimación | Dependencias |
|----|-------|------------|------------|--------------|
| UI-001 | Crear `themeStore.ts` | store | 2h | - |
| UI-002 | Definir CSS variables | styles | 2h | - |
| UI-003 | Crear `ThemeToggle.tsx` | component | 1h | UI-001 |
| UI-004 | Migrar colores hardcodeados | all | 4h | UI-002 |
| UI-005 | Agregar toggle en SettingsPanel | settings | 1h | UI-003 |
| UI-006 | ActivityBar expand/collapse | layout | 3h | - |
| UI-007 | ActivityBar animaciones | layout | 2h | UI-006 |
| UI-008 | Sidebar pin/lock UI | layout | 2h | - |
| UI-009 | Sidebar animación slide | layout | 2h | UI-008 |
| UI-010 | Sidebar toggle behavior | store | 2h | UI-008 |

### 4.2 Backlog de Prioridad Media

| ID | Tarea | Componente | Estimación | Dependencias |
|----|-------|------------|------------|--------------|
| UI-011 | Container header controls | panels | 3h | - |
| UI-012 | Container pin funcional | panels | 2h | UI-011 |
| UI-013 | Container maximize/restore | panels | 3h | UI-011 |
| UI-014 | Diálogo max containers | panels | 2h | - |
| UI-015 | Context menu ViewPort vacío | viewport | 3h | - |
| UI-016 | WelcomeView mejorada | chat | 2h | - |
| UI-017 | Tab drag & drop | panels | 4h | - |
| UI-018 | Tab reorder | panels | 2h | UI-017 |
| UI-019 | Tab pop-out | panels | 3h | UI-017 |

### 4.3 Backlog de Prioridad Baja

| ID | Tarea | Componente | Estimación | Dependencias |
|----|-------|------------|------------|--------------|
| UI-020 | Responsive breakpoints | layout | 3h | - |
| UI-021 | Mobile menu | layout | 4h | UI-020 |
| UI-022 | Keyboard shortcuts | global | 4h | - |
| UI-023 | ARIA roles | all | 3h | - |
| UI-024 | Focus management | all | 2h | UI-023 |
| UI-025 | Skeleton loaders | common | 3h | - |
| UI-026 | Micro-animations | all | 4h | - |
| UI-027 | Container resize drag | panels | 4h | - |

---

## PARTE 5: ESPECIFICACIONES TÉCNICAS DETALLADAS

### 5.1 themeStore.ts

```typescript
interface ThemeStore {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

// Persistencia: localStorage + sync con sistema
// Aplicación: data-theme attribute en <html>
```

### 5.2 Tailwind Config Updates

```javascript
// tailwind.config.js
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'text-primary': 'var(--text-primary)',
        // ... etc
      }
    }
  }
}
```

### 5.3 ActivityBar States

```typescript
interface ActivityBarState {
  expanded: boolean;        // false = solo íconos, true = íconos + texto
  activeActivity: ActivityType;
}

// Transiciones:
// Click en hamburger → toggle expanded
// Click en actividad → set active + collapse si expanded
// Mobile → siempre collapsed, abre como drawer
```

### 5.4 Sidebar States

```typescript
interface SidebarState {
  visible: boolean;
  pinned: boolean;
}

// Reglas:
// Si pinned=true → permanece visible siempre
// Si pinned=false → toggle con click en ActivityBar
// Click en candado → toggle pinned
// Click en × (solo si !pinned) → cierra
```

### 5.5 Container Header Controls

```tsx
// Posición: esquina superior derecha del header
<div className="flex items-center gap-1">
  <button title="Fijar panel">
    {container.pinned ? <PinOff size={16} /> : <Pin size={16} />}
  </button>
  <button title="Maximizar">
    {container.maximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
  </button>
  <button title="Cerrar panel">
    <X size={16} />
  </button>
</div>
```

---

## PARTE 6: CRONOGRAMA SUGERIDO

```
Semana 1: Fundamentos UI
├── Día 1-2: Sistema de temas (UI-001 a UI-005)
├── Día 3: ActivityBar canónica (UI-006, UI-007)
├── Día 4-5: Sidebar canónico (UI-008 a UI-010)

Semana 2: Containers & Tabs
├── Día 1-2: Container controls (UI-011 a UI-014)
├── Día 3: ViewPort vacío & WelcomeView (UI-015, UI-016)
├── Día 4-5: Tabs avanzadas (UI-017 a UI-019)

Semana 3: Polish & Responsive
├── Día 1-2: Responsive (UI-020, UI-021)
├── Día 3: Accesibilidad (UI-022 a UI-024)
├── Día 4-5: Animaciones & polish (UI-025 a UI-027)
```

---

## PARTE 7: CRITERIOS DE ACEPTACIÓN

### Para Sistema de Temas:
- [ ] Usuario puede cambiar entre tema claro y oscuro
- [ ] Preferencia se persiste en localStorage
- [ ] Opción "sistema" detecta preferencia del OS
- [ ] Todos los componentes respetan el tema
- [ ] No hay colores hardcodeados en gray-XXX

### Para ActivityBar:
- [ ] Click en hamburger expande/colapsa
- [ ] Animación suave de 300ms
- [ ] Texto aparece junto a íconos cuando expandida
- [ ] Auto-colapsa al seleccionar actividad
- [ ] En móvil, abre como drawer/modal

### Para Sidebar:
- [ ] Ícono de candado visible en header
- [ ] Click en candado togglea pinned
- [ ] Si pinned, no se cierra al cambiar actividad
- [ ] Si no pinned, toggle con re-click en actividad
- [ ] Animación de slide (300ms)

### Para Dynamic Containers:
- [ ] Header muestra [📌] [⤢] [×]
- [ ] Pin funciona y se refleja visualmente
- [ ] Maximizar ocupa 100% del ViewPort
- [ ] Cerrar muestra diálogo si es último container
- [ ] Al alcanzar 3, muestra diálogo de opciones

---

## RESUMEN EJECUTIVO

### Estado Actual
La UI de FluxCore tiene una base sólida con el `panelStore` bien implementado según TOTEM PARTE 11. Sin embargo, los componentes visuales (`ActivityBar`, `Sidebar`, `DynamicContainer`) tienen implementaciones básicas que no reflejan toda la especificación canónica de comportamiento.

### Gaps Críticos
1. **Sin sistema de temas** - Solo tema oscuro hardcodeado
2. **ActivityBar** - Sin expand/collapse
3. **Sidebar** - Sin pin/lock
4. **Containers** - Sin controles de header

### Plan de Acción
3 semanas de trabajo estructurado para alcanzar 100% de alineación con la especificación canónica de comportamiento de interfaz.

### Prioridades
1. **Semana 1**: Sistema de temas + ActivityBar + Sidebar
2. **Semana 2**: Dynamic Containers + Tabs avanzadas
3. **Semana 3**: Responsive + Accesibilidad + Polish

---

*Documento generado automáticamente - 2025-12-07*
