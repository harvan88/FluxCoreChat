# Issues/Tasks - Auditoría de UI

> **Generado desde:** UI_AUDIT_REPORT.md  
> **Fecha:** 2024-12-08

---

## 🔴 Prioridad ALTA

### ISSUE-001: Migrar ExtensionsPanel al Sistema Canónico
**Tipo:** Bug / Design Violation  
**Componente:** `apps/web/src/components/extensions/ExtensionsPanel.tsx`

**Descripción:**
ExtensionsPanel usa colores hardcodeados (bg-gray-900, text-blue-400, border-gray-700) que violan el sistema de diseño canónico.

**Impacto:**
- **Sistema:** Rompe unicidad visual
- **Código:** Dificulta mantenimiento
- **DB:** Ninguno
- **Arquitectura:** Ninguno

**Solución:**
Reemplazar todos los colores hardcodeados con clases canónicas:
- `bg-gray-900` → `bg-surface`
- `text-blue-400` → `text-accent`
- `border-gray-700` → `border-subtle`
- `bg-gray-800` → `bg-elevated`
- `text-white` → `text-primary`

**Archivos afectados:**
- `ExtensionsPanel.tsx`
- `ExtensionCard.tsx`
- `ExtensionConfigPanel.tsx`

**Estimación:** 2 horas

**Criterios de aceptación:**
- [ ] Todos los colores usan clases canónicas
- [ ] No hay referencias a bg-gray-*, text-blue-*, etc.
- [ ] Compilación sin errores
- [ ] Visual consistency con resto del sistema

---

### ISSUE-002: Prevenir Duplicación de Tabs de Chat
**Tipo:** Bug / Logic Error  
**Componente:** `apps/web/src/components/layout/ViewPort.tsx`

**Descripción:**
Al seleccionar un chat que ya está abierto, se crea un nuevo tab en lugar de activar el existente.

**Impacto:**
- **Sistema:** Confusión del usuario, múltiples tabs para mismo chat
- **Código:** Lógica de navegación incorrecta
- **DB:** Ninguno
- **Arquitectura:** Violación de "única fuente de verdad"

**Comportamiento actual:**
```tsx
// ❌ Siempre crea nuevo tab
useEffect(() => {
  if (selectedConversationId) {
    openTab('chats', { ... });
  }
}, [selectedConversationId]);
```

**Comportamiento esperado:**
1. Verificar si existe tab para este chat
2. Si existe: activar tab existente
3. Si no existe: crear nuevo tab

**Solución:**
```tsx
useEffect(() => {
  if (selectedConversationId && activeActivity === 'conversations') {
    // Buscar tab existente
    const existingTab = containers
      .flatMap(c => c.tabs)
      .find(t => t.type === 'chat' && t.context.chatId === selectedConversationId);
    
    if (existingTab) {
      // Activar existente
      const container = containers.find(c => 
        c.tabs.some(t => t.id === existingTab.id)
      );
      if (container) {
        activateTab(container.id, existingTab.id);
        focusContainer(container.id);
      }
    } else {
      // Crear nuevo
      openTab('chats', {
        type: 'chat',
        title: `Chat`,
        context: { chatId: selectedConversationId },
        closable: true,
      });
    }
  }
}, [selectedConversationId, activeActivity, openTab, containers, activateTab, focusContainer]);
```

**Archivos afectados:**
- `ViewPort.tsx`

**Estimación:** 1 hora

**Criterios de aceptación:**
- [ ] No se crean tabs duplicados
- [ ] Tab existente se activa correctamente
- [ ] Container se enfoca al activar tab
- [ ] Funciona con múltiples containers

---

### ISSUE-003: Corregir Flujo de Navegación de Settings
**Tipo:** Bug / Architecture Violation  
**Componente:** `apps/web/src/components/layout/ViewPort.tsx`

**Descripción:**
Settings abre DynamicContainer directamente desde ActivityBar, saltándose el Sidebar. Esto viola el flujo canónico: ActivityBar → Sidebar → DynamicContainer.

**Impacto:**
- **Sistema:** Inconsistencia de navegación
- **Código:** Lógica acoplada incorrectamente
- **DB:** Ninguno
- **Arquitectura:** Violación del flujo de navegación

**Flujo actual (incorrecto):**
```
ActivityBar (settings) → DynamicContainer
```

**Flujo esperado:**
```
ActivityBar (settings) → Sidebar (SettingsPanel) → DynamicContainer (opción seleccionada)
```

**Solución:**
1. Eliminar lógica de apertura automática de container en ViewPort
2. Settings debe abrir su Sidebar (SettingsPanel)
3. Desde SettingsPanel, usuario selecciona opción (Apariencia, Perfil, etc.)
4. Esa opción abre tab en DynamicContainer

**Archivos afectados:**
- `ViewPort.tsx` - Eliminar useEffect de settings
- `Sidebar.tsx` - Renderizar SettingsPanel cuando activeActivity === 'settings'
- `SettingsPanel.tsx` - Agregar lógica para abrir tabs en DynamicContainer

**Estimación:** 3 horas

**Criterios de aceptación:**
- [ ] Settings abre Sidebar correctamente
- [ ] Desde Sidebar se pueden abrir opciones en DynamicContainer
- [ ] Flujo consistente con otras actividades
- [ ] Tab de settings es closable

---

### ISSUE-004: Hacer Tab de Settings Closable
**Tipo:** Bug / UX Issue  
**Componente:** `apps/web/src/components/layout/ViewPort.tsx`

**Descripción:**
El tab de configuración está marcado como `closable: false`, lo que impide cerrarlo.

**Impacto:**
- **Sistema:** UX pobre, usuario no puede cerrar tab
- **Código:** Configuración incorrecta
- **DB:** Ninguno
- **Arquitectura:** Ninguno

**Solución:**
Cambiar `closable: false` a `closable: true` en la creación del tab de settings.

**Archivos afectados:**
- `ViewPort.tsx` (si se mantiene lógica actual)
- `SettingsPanel.tsx` (si se implementa ISSUE-003)

**Estimación:** 15 minutos

**Criterios de aceptación:**
- [ ] Tab de settings se puede cerrar
- [ ] Al cerrar, no causa errores
- [ ] Container se cierra si era el único tab

---

### ISSUE-005: Crear Component Library Base
**Tipo:** Feature / Architecture  
**Ubicación:** `apps/web/src/components/ui/`

**Descripción:**
No existe un sistema de componentes predefinidos. Cada componente crea su propio HTML, causando inconsistencias y dificultando extensiones de terceros.

**Impacto:**
- **Sistema:** Inconsistencia visual, dificulta extensiones
- **Código:** Duplicación de código, mantenimiento complejo
- **DB:** Ninguno
- **Arquitectura:** Falta de abstracción de UI

**Componentes a crear:**

#### 5.1 Button.tsx
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}
```

**Variantes:**
- `primary`: bg-accent, text-inverse
- `secondary`: bg-elevated, text-primary, border-default
- `ghost`: transparent, text-secondary, hover:bg-hover
- `danger`: bg-error, text-inverse

#### 5.2 Input.tsx
```tsx
interface InputProps {
  type?: 'text' | 'search' | 'email' | 'password';
  placeholder?: string;
  icon?: React.ReactNode;
  error?: string;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}
```

#### 5.3 Card.tsx
```tsx
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'bordered';
}

// Subcomponentes
Card.Header
Card.Body
Card.Footer
```

#### 5.4 Badge.tsx
```tsx
interface BadgeProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}
```

#### 5.5 Table.tsx
```tsx
interface TableProps {
  columns: Column[];
  data: any[];
  sortable?: boolean;
  pagination?: boolean;
}
```

#### 5.6 Select.tsx
```tsx
interface SelectProps {
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}
```

#### 5.7 Checkbox.tsx
```tsx
interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}
```

#### 5.8 Avatar.tsx
```tsx
interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'circle' | 'square';
}
```

**Archivos a crear:**
- `apps/web/src/components/ui/Button.tsx`
- `apps/web/src/components/ui/Input.tsx`
- `apps/web/src/components/ui/Card.tsx`
- `apps/web/src/components/ui/Badge.tsx`
- `apps/web/src/components/ui/Table.tsx`
- `apps/web/src/components/ui/Select.tsx`
- `apps/web/src/components/ui/Checkbox.tsx`
- `apps/web/src/components/ui/Avatar.tsx`
- `apps/web/src/components/ui/index.ts`

**Estimación:** 2 semanas (10 días laborales)

**Criterios de aceptación:**
- [ ] Todos los componentes usan sistema canónico
- [ ] Props bien tipados con TypeScript
- [ ] Documentación en Storybook (opcional)
- [ ] Ejemplos de uso en README
- [ ] Accesibilidad (ARIA labels)
- [ ] Tests unitarios básicos

---

## 🟡 Prioridad MEDIA

### ISSUE-006: Crear SidebarLayout Unificado
**Tipo:** Refactor / Architecture  
**Ubicación:** `apps/web/src/components/layout/SidebarLayout.tsx`

**Descripción:**
Cada sidebar tiene estructura HTML diferente. Necesitamos un layout unificado.

**Impacto:**
- **Sistema:** Inconsistencia visual entre sidebars
- **Código:** Duplicación de estructura
- **DB:** Ninguno
- **Arquitectura:** Falta de abstracción

**Solución:**
Crear componente `SidebarLayout` con estructura estándar:

```tsx
interface SidebarLayoutProps {
  header: React.ReactNode;
  search?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  content: React.ReactNode;
  footer?: React.ReactNode;
}

export function SidebarLayout({
  header,
  search,
  actions,
  tabs,
  content,
  footer
}: SidebarLayoutProps) {
  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="px-4 py-3 border-b border-subtle">
        {header}
      </div>

      {/* Search */}
      {search && (
        <div className="px-4 py-3">
          {search}
        </div>
      )}

      {/* Actions */}
      {actions && (
        <div className="px-4 pb-3">
          {actions}
        </div>
      )}

      {/* Tabs */}
      {tabs && (
        <div className="px-4 pb-3">
          {tabs}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {content}
      </div>

      {/* Footer */}
      {footer && (
        <div className="px-4 py-3 border-t border-subtle">
          {footer}
        </div>
      )}
    </div>
  );
}
```

**Subcomponentes:**
- `SidebarHeader.tsx`
- `SidebarSearch.tsx`
- `SidebarActions.tsx`
- `SidebarTabs.tsx`

**Archivos afectados:**
- `ConversationsList.tsx` - Refactor para usar SidebarLayout
- `ContactsList.tsx` - Refactor para usar SidebarLayout
- `ExtensionsPanel.tsx` - Refactor para usar SidebarLayout
- `SettingsPanel.tsx` - Refactor para usar SidebarLayout

**Estimación:** 1 semana

**Criterios de aceptación:**
- [ ] SidebarLayout creado y documentado
- [ ] Todos los sidebars migrados
- [ ] Estructura visual consistente
- [ ] No hay regresiones funcionales

---

### ISSUE-007: Eliminar Botón X de Sidebar
**Tipo:** UX Improvement  
**Componente:** `apps/web/src/components/layout/Sidebar.tsx`

**Descripción:**
Sidebar tiene botón X para cerrar, pero el comportamiento correcto es:
- Sin pin: Click en actividad activa → colapsa sidebar
- Con pin: Sidebar permanece abierto

**Impacto:**
- **Sistema:** UX inconsistente
- **Código:** Lógica redundante
- **DB:** Ninguno
- **Arquitectura:** Ninguno

**Solución:**
1. Eliminar botón X de Sidebar
2. Implementar lógica de pin en ActivityBar
3. Actualizar `uiStore.ts` para manejar pin correctamente

**Archivos afectados:**
- `Sidebar.tsx` - Eliminar botón X
- `ActivityBar.tsx` - Implementar lógica de pin
- `uiStore.ts` - Actualizar `setActiveActivity()`

**Estimación:** 2 horas

**Criterios de aceptación:**
- [ ] No existe botón X en Sidebar
- [ ] Click en actividad activa colapsa sidebar (sin pin)
- [ ] Con pin, sidebar permanece abierto
- [ ] Comportamiento consistente en desktop y móvil

---

### ISSUE-008: Refactorizar Tabs para Usar Componentes Predefinidos
**Tipo:** Refactor  
**Componente:** `apps/web/src/components/panels/DynamicContainer.tsx`

**Descripción:**
Cada tipo de tab renderiza su propio HTML. Deben cargar componentes predefinidos.

**Impacto:**
- **Sistema:** HTML arbitrario en tabs
- **Código:** Duplicación de estructura
- **DB:** Ninguno
- **Arquitectura:** Falta de abstracción

**Solución:**
```tsx
// ❌ Antes
case 'contact':
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-primary">
        Contacto: {tab.context.contactName}
      </h2>
    </div>
  );

// ✅ Después
case 'contact':
  return <ContactDetailView contactId={tab.context.contactId} />;
```

**Componentes a crear:**
- `ContactDetailView.tsx`
- `EditorView.tsx`
- `ExtensionView.tsx`

**Archivos afectados:**
- `DynamicContainer.tsx`
- Crear nuevos componentes de vista

**Estimación:** 1 semana

**Criterios de aceptación:**
- [ ] Todos los tabs cargan componentes predefinidos
- [ ] No hay HTML arbitrario en switch cases
- [ ] Componentes bien estructurados
- [ ] Funcionalidad preservada

---

## 🟢 Prioridad BAJA

### ISSUE-009: Hacer ActivityBar Header Responsive
**Tipo:** Enhancement  
**Componente:** `apps/web/src/components/layout/ActivityBar.tsx`

**Descripción:**
Logo de ActivityBar no se adapta cuando la barra se colapsa.

**Impacto:**
- **Sistema:** Desperdicio de espacio vertical
- **Código:** Falta de responsive design
- **DB:** Ninguno
- **Arquitectura:** Ninguno

**Solución:**
```tsx
<div className={clsx(
  "mb-8 transition-all",
  expanded ? "w-10 h-10" : "w-8 h-8"
)}>
  <div className="w-full h-full bg-accent rounded-lg flex items-center justify-center">
    <span className={clsx(
      "text-inverse font-bold",
      expanded ? "text-xl" : "text-sm"
    )}>
      F
    </span>
  </div>
</div>
```

**Archivos afectados:**
- `ActivityBar.tsx`

**Estimación:** 30 minutos

**Criterios de aceptación:**
- [ ] Logo se adapta al estado de ActivityBar
- [ ] Transición suave
- [ ] No causa layout shift

---

## 📚 Documentación

### ISSUE-010: Documentar Component Library para Extensiones
**Tipo:** Documentation  
**Ubicación:** `docs/COMPONENT_LIBRARY.md`

**Descripción:**
Crear guía completa de componentes permitidos para desarrolladores de extensiones.

**Contenido:**
1. Introducción al sistema de componentes
2. Componentes disponibles con ejemplos
3. Props y variantes
4. Reglas de uso (qué está permitido/prohibido)
5. Ejemplos de extensiones bien diseñadas
6. Anti-patrones a evitar

**Estimación:** 1 día

**Criterios de aceptación:**
- [ ] Documento completo y claro
- [ ] Ejemplos de código funcionales
- [ ] Capturas de pantalla de componentes
- [ ] Sección de FAQ

---

### ISSUE-011: Crear Guía de Diseño para Extensiones
**Tipo:** Documentation  
**Ubicación:** `docs/EXTENSION_DESIGN_GUIDE.md`

**Descripción:**
Guía visual con ejemplos de interfaces bien diseñadas para extensiones.

**Contenido:**
1. Principios de diseño de FluxCore
2. Paleta de colores canónica
3. Tipografía y espaciado
4. Layouts recomendados
5. Ejemplos visuales (similar a las imágenes proporcionadas)
6. Checklist de diseño

**Estimación:** 2 días

**Criterios de aceptación:**
- [ ] Documento visual completo
- [ ] Ejemplos de interfaces reales
- [ ] Checklist descargable
- [ ] Figma/Sketch templates (opcional)

---

## 🔄 Dependencias entre Issues

```
ISSUE-005 (Component Library)
  ├─> ISSUE-001 (ExtensionsPanel)
  ├─> ISSUE-006 (SidebarLayout)
  ├─> ISSUE-008 (Tabs Refactor)
  └─> ISSUE-010 (Documentación)

ISSUE-003 (Settings Flow)
  └─> ISSUE-004 (Settings Closable)

ISSUE-006 (SidebarLayout)
  └─> ISSUE-007 (Eliminar X)

ISSUE-010 (Docs Component Library)
  └─> ISSUE-011 (Guía de Diseño)
```

---

## 📊 Estimación Total

| Prioridad | Issues | Tiempo Estimado |
|-----------|--------|-----------------|
| 🔴 ALTA | 5 | 3 semanas |
| 🟡 MEDIA | 4 | 2.5 semanas |
| 🟢 BAJA | 1 | 0.5 días |
| 📚 Docs | 2 | 3 días |
| **TOTAL** | **12** | **~6 semanas** |

---

## ✅ Checklist de Implementación

### Semana 1-3: Prioridad ALTA
- [ ] ISSUE-001: Migrar ExtensionsPanel
- [ ] ISSUE-002: Prevenir duplicación de tabs
- [ ] ISSUE-003: Corregir flujo de Settings
- [ ] ISSUE-004: Settings closable
- [ ] ISSUE-005: Component Library (inicio)

### Semana 4-5: Component Library + Media
- [ ] ISSUE-005: Component Library (completar)
- [ ] ISSUE-006: SidebarLayout
- [ ] ISSUE-007: Eliminar botón X
- [ ] ISSUE-008: Refactor tabs

### Semana 6: Refinamiento + Docs
- [ ] ISSUE-009: ActivityBar responsive
- [ ] ISSUE-010: Docs Component Library
- [ ] ISSUE-011: Guía de Diseño
- [ ] Testing y QA final

---

**Próximo paso:** Actualizar EXECUTION_PLAN.md con nuevos hitos
