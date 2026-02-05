# Plan: Componente de Gestión de Plantillas

> Este plan sigue las guías establecidas en `UI_GUIDELINES.md`

---

## 1. Objetivo

Crear un sistema UI para gestionar plantillas de mensajes que:
- Permita crear, editar, eliminar plantillas
- Se integre con el sistema de assets existente
- Respete la arquitectura ViewRegistry
- Use componentes UI base del sistema

---

## 2. Análisis del Backend Existente

packages/db/src/schema/template-assets.ts
- templateId: uuid
- assetId: uuid
- version: integer
- slot: varchar
- linkedAt: timestamp

packages/db/src/schema/templates.ts
- id: uuid
- name: varchar
- content: text
- authorizeForAI: boolean (NUEVO: Controla si la IA puede usar esta plantilla)
- isActive: boolean
```

### 2.2 API Endpoints Existentes
```
apps/api/src/routes/template.routes.ts
apps/api/src/routes/asset-relations.routes.ts

GET    /templates                    # Listar plantillas
POST   /templates                    # Crear plantilla
GET    /templates/:id                # Obtener plantilla
PUT    /templates/:id                # Actualizar plantilla
DELETE /templates/:id                # Eliminar plantilla
POST   /templates/:id/assets         # Vincular asset
GET    /templates/:id/assets         # Obtener assets
DELETE /templates/:id/assets/:assetId # Desvincular asset
POST   /templates/:id/execute        # EJECUTAR/ENVIAR plantilla (Unified Core Execution)
```

---

## 3. Componentes a Crear

### 3.1 Estructura de Archivos

```
apps/web/src/components/templates/
├── TemplateManager.tsx      # Vista principal (sidebar)
├── TemplateList.tsx         # Lista de plantillas
├── TemplateCard.tsx         # Card individual
├── TemplateEditor.tsx       # Editor de plantilla (tab)
├── TemplatePreview.tsx      # Preview de plantilla
├── TemplateAssetPicker.tsx  # Selector de assets
├── hooks/
│   └── useTemplates.ts      # Hook de datos
├── types.ts                 # Tipos TypeScript
└── index.ts                 # Exports
```

### 3.2 Componentes Detallados

#### TemplateManager.tsx (Sidebar View)
```tsx
// Responsabilidades:
// - Mostrar lista de plantillas
// - Filtrar/buscar plantillas
// - Crear nueva plantilla
// - Abrir editor en tab

interface TemplateManagerProps {
  accountId: string;
}

// Estados a manejar:
// - Loading: <LoadingState />
// - Empty: <EmptyState />
// - Error: <ErrorState />
// - Data: <TemplateList />
```

#### TemplateEditor.tsx (Tab View)
```tsx
// Responsabilidades:
// - Editar nombre, contenido, variables
// - Vincular/desvincular assets
// - Preview en tiempo real
// - Guardar cambios

interface TemplateEditorProps {
  templateId: string;
  accountId: string;
  onClose: () => void;
}
```

#### TemplateCard.tsx
```tsx
// Usa componentes UI base:
// - Card de components/ui/Card
// - Badge para estado
// - DoubleConfirmationDeleteButton para eliminar

interface TemplateCardProps {
  template: Template;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}
```

---

## 4. Integración con ViewRegistry

### 4.1 Registrar Sidebar View

```tsx
// En core/registry/chatcore-views.tsx o como extensión

viewRegistry.registerSidebarView({
  activityType: 'templates',
  component: TemplateManager,
  title: 'Plantillas',
  icon: 'FileText',
  isCore: true, // o false si es extensión
});
```

### 4.2 Registrar Tab View

```tsx
viewRegistry.registerTabView({
  tabType: 'template-editor',
  component: TemplateEditor,
  isCore: true,
});
```

### 4.3 Exponer en Tools de ChatCore

```tsx
// En components/tools/ToolsSidebar.tsx
// Agregar item dentro de la sección "Herramientas"

{
  id: 'templates',
  label: 'Plantillas',
  icon: FileTextIcon,
  onSelect: () => openTab('editor', {
    type: 'template-panel',
    identity: `template-panel:${accountId}`,
    context: { accountId },
  }),
}
```

> Nota: Las herramientas viven bajo el namespace de ChatCore Tools; mantener este punto como única vía de acceso evita llenar la ActivityBar con paneles de edición avanzados.

---

## 5. Hook de Datos

```tsx
// hooks/useTemplates.ts

interface UseTemplatesReturn {
  templates: Template[];
  isLoading: boolean;
  error: Error | null;
  
  // Mutations
  createTemplate: (data: CreateTemplateInput) => Promise<Template>;
  updateTemplate: (id: string, data: UpdateTemplateInput) => Promise<Template>;
  deleteTemplate: (id: string) => Promise<void>;
  duplicateTemplate: (id: string) => Promise<Template>;
  
  // Assets
  linkAsset: (templateId: string, assetId: string) => Promise<void>;
  unlinkAsset: (templateId: string, assetId: string) => Promise<void>;
  
  // Refetch
  refetch: () => Promise<void>;
}

export function useTemplates(accountId: string): UseTemplatesReturn {
  // Implementación con React Query o SWR
}
```

---

## 6. Tipos TypeScript

```tsx
// types.ts

export interface Template {
  id: string;
  accountId: string;
  name: string;
  content: string;
  variables: TemplateVariable[];
  category?: string;
  tags?: string[];
  isActive: boolean;
  authorizeForAI: boolean; // Flag para uso en flujos automáticos de IA
  assets?: TemplateAsset[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'contact';
  defaultValue?: string;
  required?: boolean;
}

export interface TemplateAsset {
  assetId: string;
  slot: string;
  version: number;
}

export interface CreateTemplateInput {
  name: string;
  content: string;
  variables?: TemplateVariable[];
  category?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  content?: string;
  variables?: TemplateVariable[];
  category?: string;
}
```

---
## 7. Flujo de Usuario

```
┌─────────────────────────────────────────────────────────────┐
│ Activity Bar: Herramientas                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ToolsSidebar (selector de herramientas)                │ │
│ │ ┌──────────────┐  ┌────────────┐  ┌──────────────┐     │ │
│ │ │ Plantillas ▶ │  │ Etiquetas │  │ Perfil       │ ... │ │
│ │ └──────────────┘  └────────────┘  └──────────────┘     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                    │ (solo selector de herramientas)
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ ViewPort (tabs por herramienta)                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Tab activo: Plantillas                                  │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ┌───────── Colección de plantillas (lista/buscador) ─┐ │ │
│ │ │ 🔍 Buscar...   [+ Nueva]                         │ │ │
│ │ │ 📄 Bienvenida  📄 Seguimiento  📄 Despedida       │ │ │
│ │ └──────────────────────────────────────────────────┘ │ │
│ │                                                     │ │
│ │ ┌───────── Editor/Preview de plantilla seleccionada ┐ │ │
│ │ │ Nombre: [____________]                           │ │ │
│ │ │ Contenido: [ ... ]                               │ │ │
│ │ │ Variables [+]   Assets [Adjuntar]                │ │ │
│ │ │ [Guardar] [Cancelar]                             │ │ │
│ │ └──────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

> Nota: la Sidebar nunca contiene la colección en sí; solo expone el **ToolsSidebar** como menú. La lista y edición de plantillas viven dentro del tab correspondiente en el ViewPort.
```

---

## 8. Fases de Implementación

### Fase 1: Estructura Base (2h)
- [x] Crear carpeta `components/templates/`
- [x] Crear `types.ts` con interfaces
- [x] Crear `useTemplates.ts` hook básico (Implementado como `templateStore.ts`)
- [x] Crear `index.ts` exports

### Fase 2: Componentes UI (3h)
- [x] Implementar `TemplateCard.tsx` (Refactorizado a formato Fila/Tabla para coherencia)
- [x] Implementar `TemplateList.tsx` (Refactorizado a estructura Tabla para coherencia)
- [x] Implementar `TemplateManager.tsx`
- [x] Usar componentes de `ui/` y `core/components/`

### Fase 3: Editor (3h)
- [x] Implementar `TemplateEditor.tsx`
- [ ] Implementar `TemplatePreview.tsx`
- [x] Implementar `TemplateAssetPicker.tsx`
- [x] Integrar con sistema de assets

### Fase 4: Integración (2h)
- [x] Registrar en ViewRegistry (Implementado via fallback legacy en `DynamicContainer` y `registry/chatcore-views.tsx`)
- [x] Registrar acceso en ToolsSidebar (ChatCore Tools)
- [x] Registrar tab type en DynamicContainer
- [x] Agregar tipos a `types/panels.ts`

- [x] Verificar accesibilidad

### Fase 6: IA Integration (2h)
- [x] Agregar campo `authorizeForAI` a DB (Migración manual 033 ejecutada)
- [x] Actualizar `TemplateEditor` para permitir toggle de autorización IA
- [x] Crear `AITemplateService` en backend
- [x] Centralizar lógica de ejecución en `TemplateService.executeTemplate` (Soberanía de Chat Core)
- [x] Implementar Tool de envío de plantillas en AI Engine (`send_template`)
- [x] Integrar selector de plantillas en `FluxCoreComposer` y `StandardComposer` (Frontend)

---

## 9. Dependencias

### Componentes UI a usar:
- `Button` - Acciones
- `Input` - Campos de texto
- `Card` - Contenedores
- `Badge` - Estados/categorías
- `DoubleConfirmationDeleteButton` - Eliminar
- `EmptyState` - Sin plantillas
- `LoadingState` - Cargando
- `ErrorState` - Error
- `ViewContainer` - Wrapper

### Hooks existentes:
- `usePanelStore` - Abrir tabs
- `useUIStore` - Estado UI
- `useAssets` - Sistema de assets (si existe)

---

## 10. Consideraciones

### Accesibilidad
- Labels en inputs
- Roles ARIA en listas
- Navegación por teclado
- Contraste de colores

### Performance
- Virtualización si hay muchas plantillas
- Lazy loading de assets
- Debounce en búsqueda

### Móvil
- Sidebar colapsable
- Editor fullscreen
- Touch-friendly

---

*Documento creado: Enero 2025*
*Estimación total: ~12 horas*
