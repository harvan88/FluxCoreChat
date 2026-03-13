# UI Protocol Strict - FluxCore Chat

> **Protocolo de Interfaz de Usuario**  
> Definición estricta de la arquitectura de layout y responsabilidades de cada zona.

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│ Main Window                                                 │
│ ┌────┬──────────────────────────────────────────────────┐  │
│ │ AB │ Sidebar          │ Dynamic Container(s)         │  │
│ │    │                  │                               │  │
│ │ ⚡ │ [Navegación]    │ ┌──────────────────────────┐ │  │
│ │ 💬 │ [Listas]        │ │ TabBar                    │ │  │
│ │ 👤 │ [Acciones]      │ ├───────────────────────────┤ │  │
│ │ ⚙️ │                  │ │                           │ │  │
│ │ 🔧 │                  │ │ Content                   │ │  │
│ │    │                  │ │                           │ │  │
│ │    │                  │ └───────────────────────────┘ │  │
│ └────┴──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Activity Bar (AB)

**Archivo:** `apps/web/src/components/layout/ActivityBar.tsx`

### Responsabilidades
- **Navegación de primer nivel**: Cambiar entre extensiones/vistas principales
- **Indicadores de estado**: Notificaciones, badges, estado de conexión
- **Acceso rápido**: Iconos principales sin texto

### Prohibiciones
- ❌ NO debe contener formularios
- ❌ NO debe mostrar contenido extenso
- ❌ NO debe tener scroll interno
- ❌ NO debe cambiar dinámicamente de tamaño

### Elementos permitidos
- ✅ Botones de icono (max 40x40px)
- ✅ Badges de notificación
- ✅ Avatar de usuario
- ✅ Indicadores de estado (dot)

---

## 3. Sidebar

**Archivos:** 
- `apps/web/src/components/layout/Sidebar.tsx` (genérico)
- `apps/web/src/components/contacts/ContactsSidebar.tsx`
- `apps/web/src/components/chat/ChatSidebar.tsx`
- `apps/web/src/components/fluxcore/FluxCoreSidebar.tsx`

### Responsabilidades
- **Navegación de segundo nivel**: Dentro del contexto actual (extensión/vista)
- **Listas compactas**: Conversaciones, contactos, elementos
- **Búsqueda y filtros**: Dentro del contexto
- **Acciones rápidas**: Crear nuevo, refrescar

### Prohibiciones
- ❌ NO debe contener formularios complejos (más de 2 campos)
- ❌ NO debe mostrar configuraciones detalladas
- ❌ NO debe contener editores de texto
- ❌ NO debe tener múltiples niveles de profundidad (max 2)
- ❌ NO debe hacer scrolls horizontales

### Elementos permitidos
- ✅ Listas de elementos (con virtualización si >100 items)
- ✅ Sección de búsqueda (1 input)
- ✅ Botones de acción rápida (+ Crear, 🔄 Refrescar)
- ✅ Filtros simples (toggles, chips)
- ✅ Secciones colapsables (máximo 2 niveles)

### Ancho recomendado
- Mínimo: 240px
- Ideal: 280px
- Máximo: 320px

---

## 4. Dynamic Container

**Archivo:** `apps/web/src/components/panels/DynamicContainer.tsx`

### Responsabilidades
- **Contenido principal**: Vista de chat, configuración, edición
- **Formularios complejos**: Configuración de extensiones, perfiles
- **Editores**: Texto largo, código, markdown
- **Paneles de detalle**: Información completa de entidades

### Sub-componentes

#### 4.1 TabBar
**Archivo:** `apps/web/src/components/panels/TabBar.tsx`

- Gestión de múltiples vistas abiertas
- Navegación entre tabs
- Cerrar tabs
- Indicadores de estado (modificado, cargando)

#### 4.2 Content Area
Renderiza el contenido según el tipo de tab:
- `chat` → `ChatView`
- `contact` → `ContactDetails`
- `settings` → `SettingsSection`
- `extension` → `ExtensionConfigPanel` o custom panel
- `editor` → `ExpandedEditor`

### Prohibiciones
- ❌ NO debe contener su propia Activity Bar
- ❌ NO debe cambiar el estado del Sidebar sin coordinación

### Elementos permitidos
- ✅ Cualquier tipo de contenido complejo
- ✅ Formularios largos
- ✅ Editores de texto
- ✅ Gráficos y visualizaciones
- ✅ Scroll vertical

---

## 5. Flujo de Datos

### Cambio de extensión (Activity Bar → Sidebar)
```typescript
// Usuario hace click en Activity Bar
ActivityBar.onClick(extension) 
  → uiStore.setSelectedExtension(extension)
  → Sidebar re-renderiza con nuevo contexto
  → Dynamic Container mantiene tabs existentes
```

### Abrir elemento (Sidebar → Dynamic Container)
```typescript
// Usuario hace click en lista del Sidebar
Sidebar.onItemClick(item)
  → panelStore.openTab({ type, context, containerId })
  → Dynamic Container renderiza nuevo tab o enfoca existente
```

### Cambio de cuenta
```typescript
// Usuario cambia de cuenta
uiStore.setSelectedAccountId(newAccountId)
  → Validar tabs abiertos
  → Cerrar tabs que no pertenecen a la cuenta
  → Re-suscribir WebSocket
  → Refrescar Sidebar
```

---

## 6. Context Isolation

### Por cuenta
Cada cuenta debe tener su propio contexto:
- Conversaciones
- Contactos
- Configuración de extensiones
- Tabs abiertos

### Validación al cambiar cuenta
```typescript
function validateTabsOnAccountChange(newAccountId: string) {
  const tabs = panelStore.getAllTabs();
  tabs.forEach(tab => {
    if (tab.context.accountId && tab.context.accountId !== newAccountId) {
      panelStore.closeTab(tab.containerId, tab.id);
    }
  });
}
```

---

## 7. Extensiones y Plugins

### Sidebars personalizados
Las extensiones pueden proveer su propio Sidebar:

```typescript
// manifest.json
{
  "ui": {
    "sidebar": {
      "component": "CustomSidebar"
    }
  }
}
```

**Requisitos:**
- Debe adherirse a las mismas reglas del Sidebar estándar
- Ancho máximo: 320px
- No debe hacer llamadas API sin permisos

### Panels personalizados
Las extensiones pueden proveer paneles para Dynamic Container:

```typescript
// manifest.json
{
  "ui": {
    "panel": {
      "component": "CustomPanel"
    }
  }
}
```

**Requisitos:**
- Debe manejar su propio estado interno
- Debe renderizarse en el espacio del Dynamic Container
- No debe modificar el layout global

---

## 8. Estados Globales

### uiStore (Zustand)
```typescript
{
  selectedAccountId: string | null,
  selectedExtension: string,
  conversations: Conversation[],
  isSidebarCollapsed: boolean,
}
```

### panelStore (Zustand)
```typescript
{
  containers: DynamicContainer[],
  activeContainerId: string,
  openTab(params): void,
  closeTab(containerId, tabId): void,
  focusContainer(containerId): void,
}
```

---

## 9. Responsive Behavior

### Desktop (>1024px)
- Activity Bar: visible
- Sidebar: visible (280px)
- Dynamic Container: flex-1

### Tablet (768px - 1024px)
- Activity Bar: visible
- Sidebar: colapsable
- Dynamic Container: flex-1

### Mobile (<768px)
- Activity Bar: bottom navigation
- Sidebar: full-screen overlay
- Dynamic Container: full-screen

---

## 10. Checklist de Cumplimiento

Antes de agregar un componente a Sidebar:
- [ ] ¿Es navegación o lista compacta?
- [ ] ¿Tiene menos de 2 campos de formulario?
- [ ] ¿No necesita scroll horizontal?
- [ ] ¿Tiene máximo 2 niveles de profundidad?

Antes de agregar un componente a Dynamic Container:
- [ ] ¿Es contenido principal o detalle?
- [ ] ¿Necesita más espacio que el Sidebar?
- [ ] ¿Puede coexistir con otros tabs?

---

## 11. Ejemplos de Violaciones Comunes

### ❌ INCORRECTO: Formulario en Sidebar
```typescript
// BAD: No poner configuración compleja en Sidebar
function SettingsSidebar() {
  return (
    <div>
      <input type="text" placeholder="API Key" />
      <textarea placeholder="Description" />
      <button>Save Settings</button>
    </div>
  );
}
```

### ✅ CORRECTO: Formulario en Dynamic Container
```typescript
// GOOD: Configuración va en un tab de Dynamic Container
function SettingsPanel() {
  return (
    <div className="p-6">
      <h2>Configuración</h2>
      <form>
        <input type="text" placeholder="API Key" />
        <textarea placeholder="Description" />
        <button>Save Settings</button>
      </form>
    </div>
  );
}
```

### ❌ INCORRECTO: Sidebar cambiando sin coordinación
```typescript
// BAD: Cambiar Sidebar directamente sin pasar por el store
function MyComponent() {
  return <button onClick={() => {
    document.querySelector('.sidebar').innerHTML = '<div>New Content</div>';
  }}>Change Sidebar</button>;
}
```

### ✅ CORRECTO: Cambio coordinado
```typescript
// GOOD: Cambiar extensión a través del store
function MyComponent() {
  const setSelectedExtension = useUIStore(state => state.setSelectedExtension);
  return <button onClick={() => setSelectedExtension('my-extension')}>
    Go to Extension
  </button>;
}
```

---

## 12. Auditoría Periódica

Ejecutar cada 2 sprints:
1. Revisar todos los componentes en `components/layout/`
2. Verificar que Sidebars cumplan reglas
3. Verificar aislamiento de contexto por cuenta
4. Verificar que tabs se cierran al cambiar cuenta
5. Documentar excepciones justificadas

---

**Versión:** 1.0  
**Última actualización:** 2026-01-08  
**Responsable:** Architecture Team
