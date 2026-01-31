# ChatCore UI Guidelines - Documento Canónico

> **Principio Fundamental:** ChatCore GOBIERNA la UI. Las extensiones INYECTAN capacidades.

Este documento establece las guías de desarrollo UI para ChatCore y sus extensiones.

---

## 1. Arquitectura UI

### 1.1 Estructura de Capas

```
┌─────────────────────────────────────────────────────────────┐
│                      ChatCore (Gobernante)                  │
├─────────────────────────────────────────────────────────────┤
│  ViewRegistry    │  ExtensionHost    │  UIOrchestrator      │
│  (Qué renderizar)│  (Quién puede)    │  (Dónde navegar)     │
├─────────────────────────────────────────────────────────────┤
│                    Componentes UI Base                      │
│  Button │ Switch │ Input │ Card │ Badge │ Table │ etc.     │
├─────────────────────────────────────────────────────────────┤
│                    Extensiones (Inyectan)                   │
│  FluxCore │ Karen │ Otras extensiones                       │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Flujo de Registro

```
BOOTSTRAP → EXTENSION_INIT → SEALED
    │              │             │
    ▼              ▼             ▼
 ChatCore      Extensiones    Inmutable
 registra      registran      (no más
 sus vistas    sus vistas     cambios)
```

---

## 2. Componentes UI Base

### 2.1 Ubicación

Todos los componentes base están en:
```
apps/web/src/components/ui/
├── Avatar.tsx
├── Badge.tsx
├── Button.tsx
├── Card.tsx
├── Checkbox.tsx
├── CollapsibleSection.tsx
├── DoubleConfirmationDeleteButton.tsx
├── Input.tsx
├── Select.tsx
├── SidebarLayout.tsx
├── SliderInput.tsx
├── Switch.tsx
├── Table.tsx
├── ToastStack.tsx
└── index.ts
```

### 2.2 Regla de Oro

> **NUNCA** crear estilos inline para componentes que ya existen en `components/ui/`.
> **SIEMPRE** importar y usar los componentes del sistema.

```tsx
// ❌ MAL - Estilo inline duplicado
<div className="w-8 h-4 rounded-full relative cursor-pointer...">
  <div className="absolute top-0.5 w-3 h-3 rounded-full..." />
</div>

// ✅ BIEN - Usar componente del sistema
import { Switch } from '../ui/Switch';
<Switch checked={isEnabled} onCheckedChange={onToggle} />
```

### 2.3 Componentes Disponibles

| Componente | Uso | Import |
|------------|-----|--------|
| `Button` | Acciones principales y secundarias | `import { Button } from '../ui'` |
| `Switch` | Toggle on/off | `import { Switch } from '../ui'` |
| `Input` | Campos de texto | `import { Input } from '../ui'` |
| `Select` | Dropdowns | `import { Select } from '../ui'` |
| `Card` | Contenedores con borde | `import { Card } from '../ui'` |
| `Badge` | Etiquetas de estado | `import { Badge } from '../ui'` |
| `Checkbox` | Selección múltiple | `import { Checkbox } from '../ui'` |
| `Table` | Tablas de datos | `import { Table } from '../ui'` |
| `Avatar` | Imágenes de perfil | `import { Avatar } from '../ui'` |

### 2.4 Componentes de Estado (Core)

```
apps/web/src/core/components/
├── EmptyState.tsx    # Estados vacíos
├── LoadingState.tsx  # Estados de carga
├── ErrorState.tsx    # Estados de error
├── ViewContainer.tsx # Wrapper con header
└── index.ts
```

```tsx
import { EmptyState, LoadingState, ErrorState } from '@/core';

// Estado vacío
<EmptyState 
  title="Sin plantillas"
  subtitle="Crea tu primera plantilla"
  icon={<FileText size={48} />}
  action={<Button onClick={onCreate}>Crear</Button>}
/>

// Estado de carga
<LoadingState message="Cargando plantillas..." />

// Estado de error
<ErrorState 
  message="Error al cargar"
  onRetry={refetch}
/>
```

---

## 3. Patrones de Desarrollo

### 3.1 Crear un Nuevo Componente de Vista

1. **Definir el componente** en la carpeta apropiada
2. **Registrar en ViewRegistry** (si es vista de sidebar/tab)
3. **Usar componentes UI base** del sistema
4. **No duplicar estilos**

```tsx
// apps/web/src/components/templates/TemplateManager.tsx

import { useState } from 'react';
import { Button, Card, Input } from '../ui';
import { EmptyState, LoadingState, ViewContainer } from '@/core';

export function TemplateManager({ accountId }: { accountId: string }) {
  // ... lógica
  
  return (
    <ViewContainer title="Plantillas" headerActions={<Button>Nueva</Button>}>
      {isLoading && <LoadingState />}
      {!isLoading && templates.length === 0 && (
        <EmptyState title="Sin plantillas" />
      )}
      {/* contenido */}
    </ViewContainer>
  );
}
```

### 3.2 Registrar Vista en el Sistema

Para que una vista esté disponible en el sistema:

```tsx
// En core/registry/chatcore-views.tsx (para vistas del núcleo)
// O en extensions/[ext]/manifest.tsx (para extensiones)

viewRegistry.registerSidebarView({
  activityType: 'templates',
  component: TemplateManager,
  title: 'Plantillas',
  icon: 'FileText',
  isCore: true,
});
```

### 3.3 Abrir Vista como Tab

```tsx
import { usePanelStore } from '@/store/panelStore';

const { openTab } = usePanelStore();

openTab('templates', {
  type: 'template',
  identity: `template:${templateId}`,
  title: 'Editar Plantilla',
  icon: 'FileText',
  closable: true,
  context: { templateId, accountId },
});
```

---

## 4. Extensiones UI

### 4.1 Manifest de Extensión

```tsx
// extensions/[nombre]/manifest.tsx

export const miExtensionManifest: ExtensionUIManifest = {
  extensionId: '@miorg/mi-extension',
  displayName: 'Mi Extensión',
  manifestVersion: 1,
  
  permissions: [
    'ui:sidebar',      // Puede mostrar sidebar
    'ui:open_tab',     // Puede abrir tabs
    'ui:open_container', // Puede abrir containers
  ],
  
  sidebar: {
    icon: 'Puzzle',
    title: 'Mi Extensión',
    component: MiSidebarComponent,
    priority: 50,
  },
  
  views: {
    'config': {
      component: ConfigView,
      defaultTitle: 'Configuración',
      defaultIcon: 'Settings',
    },
  },
  
  limits: {
    maxTabs: 5,
    maxContainers: 1,
  },
};
```

### 4.2 Permisos de Extensión

| Permiso | Descripción |
|---------|-------------|
| `ui:sidebar` | Mostrar icono y panel en sidebar |
| `ui:open_tab` | Abrir tabs en containers existentes |
| `ui:open_container` | Crear nuevos containers |
| `ui:notifications` | Mostrar notificaciones |
| `ui:modal` | Mostrar modales |

---

## 5. Estilos y Tokens

### 5.1 Colores (CSS Variables)

```css
/* Fondos */
--color-bg-base      /* Fondo principal */
--color-bg-surface   /* Superficies elevadas */
--color-bg-elevated  /* Más elevado */
--color-bg-hover     /* Estado hover */
--color-bg-active    /* Estado activo */

/* Texto */
--color-text-primary   /* Texto principal */
--color-text-secondary /* Texto secundario */
--color-text-muted     /* Texto deshabilitado */

/* Acentos */
--color-accent         /* Color de acento */
--color-error          /* Errores */
--color-success        /* Éxito */
--color-warning        /* Advertencias */

/* Bordes */
--color-border-default /* Borde normal */
--color-border-subtle  /* Borde sutil */
```

### 5.2 Clases Tailwind Semánticas

```tsx
// Usar clases semánticas, no valores directos
className="bg-base text-primary"      // ✅
className="bg-[#1a1a1a] text-white"   // ❌

className="border-subtle"              // ✅
className="border-gray-700"            // ❌
```

---

## 6. Checklist para Nuevos Componentes

- [ ] ¿Usa componentes de `components/ui/`?
- [ ] ¿Usa componentes de estado de `core/components/`?
- [ ] ¿Usa tokens de color semánticos?
- [ ] ¿Está registrado en ViewRegistry (si aplica)?
- [ ] ¿Tiene tipos TypeScript correctos?
- [ ] ¿Maneja estados: loading, empty, error?
- [ ] ¿Es accesible (aria-labels, roles)?
- [ ] ¿Funciona en móvil?

---

## 7. Estructura de Archivos Recomendada

```
apps/web/src/
├── components/
│   ├── ui/              # Componentes base (Button, Input, etc.)
│   ├── chat/            # Componentes de chat
│   ├── contacts/        # Componentes de contactos
│   ├── templates/       # 🆕 Componentes de plantillas
│   │   ├── TemplateManager.tsx
│   │   ├── TemplateEditor.tsx
│   │   ├── TemplateList.tsx
│   │   └── index.ts
│   └── ...
├── core/
│   ├── components/      # EmptyState, LoadingState, etc.
│   ├── registry/        # ViewRegistry
│   ├── extension-api/   # ExtensionHost
│   └── orchestrator/    # UIOrchestrator
├── extensions/
│   └── fluxcore/        # Manifest de FluxCore
└── store/               # Zustand stores
```

---

## 8. Referencias

- **TOTEM.md** - Principios fundamentales del sistema
- **FLUX_CORE.md** - Arquitectura de extensiones
- **core/index.ts** - Exports del sistema core

---

*Última actualización: Enero 2025*
*Versión: 1.0*
