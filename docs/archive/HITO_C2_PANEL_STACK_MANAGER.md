# Hito C2: Panel Stack Manager

> **Estado**: ✅ Completado  
> **Fecha**: 2025-12-06  
> **TOTEM Referencia**: PARTE 11 - Panel & Tab System

## Resumen

Implementación completa del Panel Stack Manager según la especificación del TOTEM PARTE 11, que define el sistema de paneles dinámicos, tabs y gestión de layout para el workspace de FluxCore.

---

## Componentes Implementados

### 1. Tipos e Interfaces (`types/panels.ts`)

| Tipo | Descripción |
|------|-------------|
| `ContainerType` | Tipos de container (chats, contacts, settings, etc.) |
| `Tab` | Pestaña individual con contexto |
| `DynamicContainer` | Panel dinámico con tabs |
| `LayoutState` | Estado completo del layout |
| `PanelEvent` | Eventos emitidos por el sistema |
| `PanelStackManagerAPI` | Interfaz de comandos y queries |

### 2. Panel Stack Manager Store (`store/panelStore.ts`)

Implementación del gestor de paneles con Zustand:

```typescript
// Comandos principales
openTab(containerType, tabContext, options)
closeTab(containerId, tabId)
activateTab(containerId, tabId)
moveTab(tabId, fromContainerId, toContainerId)

openContainer(containerType, options)
closeContainer(containerId, force?)
pinContainer(containerId, pinned)
focusContainer(containerId)
duplicateContainer(containerId)

setSplitDirection(direction)
reorderContainers(containerIds)
resetLayout()
```

### 3. Componentes UI

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| `DynamicContainer` | `panels/DynamicContainer.tsx` | Panel con tabs y contenido |
| `TabBar` | `panels/TabBar.tsx` | Barra de pestañas con drag & drop |
| `ViewPort` | `layout/ViewPort.tsx` | Actualizado para multi-container |

---

## Características Implementadas (TOTEM 11.x)

### 11.3 Reglas de Layout ✅

- [x] Máximo 3 containers simultáneos
- [x] Split horizontal/vertical
- [x] Contenedores resizables
- [x] Persistencia del layout (localStorage)

### 11.4 Smart Priority ✅

- [x] Preferir tab sobre nuevo container
- [x] Reusar container del mismo tipo
- [x] Abrir en container activo si max alcanzado

### 11.5 Duplicación, Fijado y Arrastre ✅

- [x] Duplicar container
- [x] Pin/Unpin container
- [x] Drag & drop de tabs entre containers

### 11.6 Jerarquías ✅

- [x] Relación padre-hijo entre containers
- [x] Cierre de children al cerrar parent

### 11.9 API de Eventos ✅

```typescript
// Eventos emitidos
'panel.opened'
'panel.closed'
'panel.pinned'
'panel.focused'
'tab.opened'
'tab.closed'
'tab.moved'
'tab.activated'
'layout.changed'
```

---

## Archivos Creados/Modificados

### Nuevos

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `types/panels.ts` | 210 | Tipos e interfaces |
| `store/panelStore.ts` | 520 | Store del Panel Stack Manager |
| `panels/DynamicContainer.tsx` | 185 | Componente de container |
| `panels/TabBar.tsx` | 175 | Componente de tabs |
| `panels/index.ts` | 6 | Exports |
| `__tests__/panelStore.test.ts` | 430 | Tests unitarios |

### Modificados

| Archivo | Cambios |
|---------|---------|
| `layout/ViewPort.tsx` | Soporte multi-container |

---

## Tests Implementados

### Categorías de Tests (28 tests)

1. **Container Management** (6 tests)
   - Abrir container
   - Límite de 3 containers
   - Cerrar container
   - Pinned container
   - Duplicar container
   - Focus container

2. **Tab Management** (6 tests)
   - Abrir tab en container existente
   - Abrir tab crea container si no existe
   - Cerrar tab
   - Tab no-closable
   - Activar tab
   - Mover tab entre containers

3. **Layout Management** (3 tests)
   - Cambiar split direction
   - Reordenar containers
   - Reset layout

4. **Event System** (3 tests)
   - Eventos al abrir container
   - Eventos al cerrar tab
   - Unsubscribe de eventos

5. **Smart Priority** (2 tests)
   - Preferir tab en container existente
   - Usar container activo cuando max alcanzado

6. **Getters** (4 tests)
   - Get by ID
   - Get by type
   - Get active
   - Can open new

---

## Instrucciones de Prueba Manual

### Prerrequisitos

1. Servidor API corriendo (`bun run api:start`)
2. Frontend corriendo (`cd apps/web && bun run dev`)

### Pruebas Manuales

#### 1. Apertura de Paneles

```
1. Iniciar sesión en la aplicación
2. Seleccionar un contacto de la lista
3. VERIFICAR: Se abre un panel "Chats" con un tab
4. Seleccionar otro contacto
5. VERIFICAR: Se abre nuevo tab en el mismo panel
```

#### 2. Múltiples Containers

```
1. Tener un chat abierto
2. Ir a Settings (icono engranaje)
3. VERIFICAR: Se abre segundo panel "Settings"
4. VERIFICAR: Ambos paneles visibles lado a lado
```

#### 3. Límite de 3 Containers

```
1. Abrir panel de Chats
2. Abrir panel de Settings
3. Abrir panel de Contactos
4. VERIFICAR: 3 paneles visibles
5. Intentar abrir algo más
6. VERIFICAR: Se abre como tab en panel existente
```

#### 4. Drag & Drop de Tabs

```
1. Tener 2 containers abiertos
2. Arrastrar un tab del primer container
3. Soltar en el segundo container
4. VERIFICAR: Tab se mueve al segundo container
```

#### 5. Pin de Container

```
1. Abrir un container
2. Click en icono de pin (candado)
3. VERIFICAR: Container marcado como pinned
4. Intentar cerrar todas las tabs
5. VERIFICAR: Container pinned NO se cierra
```

#### 6. Persistencia

```
1. Abrir varios containers y tabs
2. Refrescar la página (F5)
3. VERIFICAR: Layout se restaura exactamente igual
```

---

## Decisiones de Diseño

### 1. Zustand con Persist

Se eligió Zustand con middleware `persist` para:
- Estado global reactivo
- Persistencia automática en localStorage
- API simple y directa

### 2. Eventos como Sistema Extensible

El sistema de eventos permite:
- Extensiones reaccionando a cambios de layout
- Analytics de uso
- Sincronización futura con backend

### 3. Smart Priority

La regla de preferir tabs sobre containers:
- Reduce sobrecarga cognitiva
- Mantiene el foco del usuario
- Cumple con TOTEM 11.4

---

## Próximos Pasos

1. **Sincronización Backend** - Persistir layout en servidor
2. **IndexedDB** - Almacenamiento offline más robusto
3. **Micro-Containers** - Implementar widgets utilitarios
4. **Keyboard Shortcuts** - Ctrl+Tab, Ctrl+W, etc.

---

## Checklist de Validación

- [x] Máximo 3 containers simultáneos
- [x] Tabs dentro de cada container
- [x] Drag & drop de tabs
- [x] Pin/Unpin de containers
- [x] Duplicar container
- [x] Smart priority (preferir tabs)
- [x] Persistencia en localStorage
- [x] Eventos API
- [x] 28 tests unitarios
- [x] Documentación completa

---

**Última actualización**: 2025-12-06
