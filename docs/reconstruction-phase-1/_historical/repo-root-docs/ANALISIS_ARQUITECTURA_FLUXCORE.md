# 📊 Análisis de Arquitectura FluxCore
## Sistema de Gestión de Asistentes, Instrucciones y Base de Conocimiento

**Fecha:** 2026-01-24
**Versión:** 1.0
**Autor:** Análisis técnico automatizado

---

## 🎯 Resumen Ejecutivo

Se ha realizado un análisis profundo del código fuente de FluxCore, específicamente de los módulos de:
- **Asistentes** (`AssistantsView.tsx` - 1,289 líneas)
- **Instrucciones** (`InstructionsView.tsx` - 807 líneas)  
- **Base de Conocimiento** (`VectorStoresView.tsx` - 622 líneas)
- **OpenAI Vector Stores** (`OpenAIVectorStoresView.tsx` - 726 líneas)
- **OpenAI Assistant Config** (`OpenAIAssistantConfigView.tsx` - 622 líneas)

### Hallazgos Principales

| Archivo | Líneas | Responsabilidades Mixtas | Severidad |
|---------|--------|--------------------------|-----------|
| `AssistantsView.tsx` | 1,289 | ≥8 | 🔴 Alta |
| `InstructionsView.tsx` | 807 | ≥6 | 🟠 Media-Alta |
| `VectorStoresView.tsx` | 622 | ≥5 | 🟡 Media |
| `OpenAIVectorStoresView.tsx` | 726 | ≥6 | 🟠 Media-Alta |
| `OpenAIAssistantConfigView.tsx` | 622 | ≥5 | 🟡 Media |

---

## 🚨 Problemas Identificados

### 1. Arquitectura Monolítica (God Components)

Los componentes actuales violan el **Principio de Responsabilidad Única (SRP)**. Cada vista maneja:

#### AssistantsView.tsx (1,289 líneas) - El más crítico

```
┌─────────────────────────────────────────────────────────────────┐
│                    AssistantsView                               │
├─────────────────────────────────────────────────────────────────┤
│ 1. Definición de tipos (interfaces)           líneas 40-89     │
│ 2. Constantes de configuración                líneas 34-38     │
│ 3. Estado de la lista de asistentes           líneas 93-126    │
│ 4. Estado del asistente seleccionado          líneas 100-114   │
│ 5. Lógica de guardado (debounce/immediate)    líneas 128-168   │
│ 6. CRUD de instrucciones desde aquí           líneas 170-207   │
│ 7. CRUD de vector stores desde aquí           líneas 209-249   │
│ 8. Navegación entre tabs                      líneas 251-279   │
│ 9. Lógica de activación de asistentes         líneas 359-385   │
│ 10. Formateo de datos (dates, sizes)          líneas 388-410   │
│ 11. Renderizado de vista de lista             líneas 1100+     │
│ 12. Renderizado de vista de configuración     líneas 604-1100  │
│ 13. Modal de selección de runtime             líneas 416-478   │
│ 14. Secciones colapsables de configuración    líneas 649-1000  │
└─────────────────────────────────────────────────────────────────┘
```

#### InstructionsView.tsx (807 líneas)

```
┌─────────────────────────────────────────────────────────────────┐
│                    InstructionsView                             │
├─────────────────────────────────────────────────────────────────┤
│ 1. Parser de Markdown completo                líneas 34-133    │
│ 2. Definición de tipos                        líneas 135-155   │
│ 3. Estado de lista e instrucción              líneas 158-170   │
│ 4. CRUD de instrucciones                      líneas 185-464   │
│ 5. Formateo de datos                          líneas 318-338   │
│ 6. Editor de código con números de línea      líneas 593-626   │
│ 7. Vista preview de markdown                  líneas 616-625   │
│ 8. Footer con estadísticas                    líneas 628-659   │
│ 9. Vista de lista (tabla)                     líneas 664-800   │
└─────────────────────────────────────────────────────────────────┘
```

#### VectorStoresView.tsx (622 líneas)

```
┌─────────────────────────────────────────────────────────────────┐
│                    VectorStoresView                             │
├─────────────────────────────────────────────────────────────────┤
│ 1. Definición de tipos                        líneas 30-58     │
│ 2. Estado de lista y store seleccionado       líneas 60-69     │
│ 3. CRUD de vector stores                      líneas 75-235    │
│ 4. Formateo de datos                          líneas 258-278   │
│ 5. Renderizado vista detalle                  líneas 301-440   │
│ 6. Renderizado vista lista                    líneas 442-572   │
│ 7. Modal de selección de backend              líneas 574-616   │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2. Código Duplicado

Se detecta código repetido entre componentes:

#### Funciones de formateo (duplicadas en cada archivo)
```typescript
// Aparece en AssistantsView, InstructionsView, VectorStoresView
const formatSize = (bytes: number): string => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
};
```

#### StatusBadge (duplicado con variaciones)
```typescript
// Cada vista tiene su versión de getStatusBadge
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge variant="success">Activo</Badge>;
    // ... variaciones por componente
  }
};
```

#### Lógica de selección/efectos (patrón repetido)
```typescript
// Este patrón aparece en los 3 componentes principales
useEffect(() => {
  if (!entityId) return;
  if (!token) return;
  if (selectedEntity?.id === entityId) return;
  if (autoSelectedEntityIdRef.current === entityId) return;
  // ...
}, [entityId, entities, selectedEntity?.id, token]);
```

---

### 3. Tipos No Centralizados

Las interfaces están definidas localmente en cada archivo:

```typescript
// En AssistantsView.tsx
interface Assistant { ... }
interface Instruction { ... }  // Solo id y name
interface VectorStore { ... }  // Solo id, name, backend, externalId
interface Tool { ... }

// En InstructionsView.tsx
interface Instruction { ... }  // Definición DIFERENTE con más campos

// En VectorStoresView.tsx  
interface VectorStore { ... }  // OTRA definición diferente
interface VectorStoreFile { ... }
```

**Problema:** Las interfaces no son consistentes entre archivos, lo que puede causar bugs silenciosos.

---

### 4. Acoplamiento con Fetching de Datos

Cada componente hace fetch directo sin abstracción:

```typescript
// Patrón repetido en cada componente
const loadData = async () => {
  if (!accountId || !token) return;
  setLoading(true);
  try {
    const headers = { 'Authorization': `Bearer ${token}` };
    const res = await fetch(`/api/fluxcore/...`, { headers });
    const data = await res.json();
    // ...
  } catch (error) {
    console.error('Error ...', error);
  } finally {
    setLoading(false);
  }
};
```

**Problemas:**
- No hay caché compartido
- No hay manejo de errores consistente
- No hay reintentos
- No hay invalidación de caché

---

### 5. Lógica de UI Embebida en Componentes

Los componentes mezclan lógica de negocio con presentación:

```typescript
// En AssistantsView - lógica de negocio mezclada con renderizado
{(() => {
  const currentId = selectedAssistant.instructionIds?.[0];
  const current = currentId ? instructions.find((i) => i.id === currentId) : null;
  const selectable = instructions.filter((i) => i.id !== currentId);
  return (
    // JSX complejo con lógica inline
  );
})()}
```

---

### 6. Falta de Custom Hooks

No existen hooks reutilizables para:
- Gestión de estado de entidades (CRUD pattern)
- Auto-save con debounce
- Navegación de tabs
- Clipboard operations
- Estados de carga/error

---

### 7. Bugs Detectados

#### Duplicación de código en deleteAssistantById
```typescript
// AssistantsView.tsx líneas 553-556
if (response.ok) {
  setAssistants((prev) => prev.filter((a) => a.id !== id));
  setSelectedAssistant((prev) => (prev?.id === id ? null : prev));
  setAssistants((prev) => prev.filter((a) => a.id !== id));  // ⚠️ DUPLICADO
  setSelectedAssistant((prev) => (prev?.id === id ? null : prev));  // ⚠️ DUPLICADO
  setActivateConfirm(null);
}
```

#### Doble renderizado de error en InstructionsView
```typescript
// InstructionsView.tsx línea 652
{deleteError && <span className="text-xs text-red-500">{deleteError}</span>}
{deleteError && <span className="text-xs text-red-500">{deleteError}</span>}  // ⚠️ DUPLICADO
```

---

## ✅ Aspectos Positivos

1. **Componentes extraídos correctamente:**
   - `VectorStoreFilesSection.tsx` (416 líneas) - Bien encapsulado
   - `RAGConfigSection.tsx` (347 líneas) - Patrón correcto
   - `CollapsibleSection.tsx` (127 líneas) - Componente UI reutilizable

2. **Sistema de UI consistente:**
   - Biblioteca de componentes en `ui/` bien estructurada
   - Patrones visuales consistentes (CollapsibleSection, Badge, Button)

3. **Documentación inline:**
   - Los archivos tienen comentarios documentales al inicio
   - Explican la arquitectura conceptual (composición por referencia)

4. **Separación OpenAI/Local:**
   - Se ha empezado a separar las vistas de OpenAI de las locales
   - `OpenAIVectorStoresView` y `OpenAIAssistantConfigView` son exclusivas

---

## 🏗️ Plan de Refactorización Propuesto

### Fase 1: Crear Infraestructura Base (Sin cambios visuales)

#### 1.1 Sistema de Tipos Centralizado

```
src/types/fluxcore/
├── index.ts                    # Re-exports
├── assistant.types.ts          # Interface Assistant, AssistantCreate, etc.
├── instruction.types.ts        # Interface Instruction, InstructionCreate, etc.
├── vectorStore.types.ts        # Interface VectorStore, VectorStoreFile, etc.
├── tool.types.ts               # Interface Tool, ToolDefinition, etc.
└── common.types.ts             # Status, Visibility, paginated responses
```

#### 1.2 Utilidades Compartidas

```
src/lib/fluxcore/
├── formatters.ts               # formatSize, formatDate, formatTokens
├── validators.ts               # Validación de entidades
└── constants.ts                # PROVIDER_MODELS, MAX_CHARS, etc.
```

#### 1.3 Custom Hooks

```
src/hooks/fluxcore/
├── useAssistants.ts            # CRUD + estado de asistentes
├── useInstructions.ts          # CRUD + estado de instrucciones
├── useVectorStores.ts          # CRUD + estado de vector stores
├── useTools.ts                 # CRUD + estado de tools
├── useAutoSave.ts              # Debounce save logic
├── useClipboard.ts             # Copy operations con feedback
└── useEntitySelection.ts       # Patrón común de selección
```

### Fase 2: Extraer Componentes de Presentación

#### 2.1 Componentes de Lista Genéricos

```
src/components/fluxcore/shared/
├── EntityTable.tsx             # Tabla genérica con columnas configurables
├── EntityHeader.tsx            # Header con nombre editable, ID copiable
├── EntityActions.tsx           # Acciones comunes (eliminar, compartir)
├── StatusBadge.tsx             # Badge de estado unificado
├── EmptyState.tsx              # Estado vacío reutilizable
└── LoadingState.tsx            # Estado de carga
```

#### 2.2 Componentes de Detalle

```
src/components/fluxcore/detail/
├── DetailHeader.tsx            # Header de vista detalle
├── DetailFooter.tsx            # Footer con acciones
├── EditableName.tsx            # Input de nombre con auto-save
├── IdCopyable.tsx              # ID con click-to-copy
└── BackButton.tsx              # Botón de volver consistente
```

#### 2.3 Componentes de Formulario

```
src/components/fluxcore/forms/
├── ProviderModelSelect.tsx     # Selector de proveedor + modelo
├── InstructionSelector.tsx     # Selector de instrucciones con badge
├── VectorStoreSelector.tsx     # Selector de vector stores
├── ToolSelector.tsx            # Selector de herramientas
├── ExpirationPolicySelect.tsx  # Selector de política de expiración
└── RuntimeSelector.tsx         # Modal de selección local/openai
```

### Fase 3: Refactorizar Vistas

#### Estructura objetivo para AssistantsView

```typescript
// Antes: 1,289 líneas, todo mezclado
// Después: ~200 líneas, composición de componentes

export function AssistantsView({ accountId, onOpenTab, assistantId }: Props) {
  const { 
    assistants, 
    selectedAssistant, 
    loading, 
    error,
    createAssistant,
    updateAssistant,
    deleteAssistant,
    selectAssistant
  } = useAssistants(accountId);
  
  const { instructions } = useInstructions(accountId);
  const { vectorStores } = useVectorStores(accountId);
  
  // Vista de configuración
  if (selectedAssistant) {
    return (
      <AssistantDetail
        assistant={selectedAssistant}
        instructions={instructions}
        vectorStores={vectorStores}
        onUpdate={updateAssistant}
        onDelete={deleteAssistant}
        onOpenTab={onOpenTab}
      />
    );
  }
  
  // Vista de lista
  return (
    <AssistantList
      assistants={assistants}
      loading={loading}
      onSelect={selectAssistant}
      onCreate={createAssistant}
    />
  );
}
```

### Fase 4: Migración Gradual

| Paso | Componente | Riesgo | Método |
|------|------------|--------|--------|
| 1 | Tipos centralizados | ⬜ Bajo | Crear tipos, importar gradualmente |
| 2 | Utilidades | ⬜ Bajo | Extraer funciones, reemplazar imports |
| 3 | Hooks de datos | 🟡 Medio | Crear hook, probar en paralelo |
| 4 | Componentes UI | ⬜ Bajo | Extraer uno a uno, mismo aspecto |
| 5 | Refactor AssistantsView | 🔴 Alto | Branch separado, tests E2E |
| 6 | Refactor InstructionsView | 🟡 Medio | Aplicar patrones de paso 5 |
| 7 | Refactor VectorStoresView | 🟡 Medio | Aplicar patrones de paso 5 |

---

## 📁 Estructura de Carpetas Propuesta

```
src/
├── types/
│   └── fluxcore/
│       ├── index.ts
│       ├── assistant.types.ts
│       ├── instruction.types.ts
│       ├── vectorStore.types.ts
│       ├── tool.types.ts
│       └── common.types.ts
│
├── lib/
│   └── fluxcore/
│       ├── formatters.ts
│       ├── validators.ts
│       ├── constants.ts
│       └── api.ts                # Cliente API centralizado
│
├── hooks/
│   └── fluxcore/
│       ├── index.ts
│       ├── useAssistants.ts
│       ├── useInstructions.ts
│       ├── useVectorStores.ts
│       ├── useTools.ts
│       ├── useAutoSave.ts
│       ├── useClipboard.ts
│       └── useEntitySelection.ts
│
├── components/
│   └── fluxcore/
│       ├── index.ts
│       │
│       ├── shared/               # Componentes compartidos
│       │   ├── EntityTable.tsx
│       │   ├── EntityHeader.tsx
│       │   ├── StatusBadge.tsx
│       │   ├── EmptyState.tsx
│       │   └── LoadingState.tsx
│       │
│       ├── detail/               # Componentes de detalle
│       │   ├── DetailHeader.tsx
│       │   ├── DetailFooter.tsx
│       │   ├── EditableName.tsx
│       │   └── IdCopyable.tsx
│       │
│       ├── forms/                # Componentes de formulario
│       │   ├── ProviderModelSelect.tsx
│       │   ├── InstructionSelector.tsx
│       │   ├── VectorStoreSelector.tsx
│       │   └── RuntimeSelector.tsx
│       │
│       ├── assistants/           # Módulo Asistentes
│       │   ├── AssistantList.tsx
│       │   ├── AssistantDetail.tsx
│       │   ├── AssistantConfigSection.tsx
│       │   └── index.ts
│       │
│       ├── instructions/         # Módulo Instrucciones
│       │   ├── InstructionList.tsx
│       │   ├── InstructionEditor.tsx
│       │   ├── MarkdownPreview.tsx
│       │   └── index.ts
│       │
│       ├── vectorStores/         # Módulo Vector Stores
│       │   ├── VectorStoreList.tsx
│       │   ├── VectorStoreDetail.tsx
│       │   └── index.ts
│       │
│       ├── components/           # (existente) Componentes extraídos
│       │   ├── VectorStoreFilesSection.tsx
│       │   └── RAGConfigSection.tsx
│       │
│       └── views/                # Vistas principales (refactorizadas)
│           ├── AssistantsView.tsx      # Orquestador, <200 líneas
│           ├── InstructionsView.tsx    # Orquestador, <150 líneas
│           ├── VectorStoresView.tsx    # Orquestador, <150 líneas
│           └── index.ts
```

---

## 🔄 Patrones de Código Recomendados

### Patrón 1: Custom Hook para CRUD

```typescript
// hooks/fluxcore/useAssistants.ts
export function useAssistants(accountId: string) {
  const { token } = useAuthStore();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const selectedAssistant = useMemo(
    () => assistants.find(a => a.id === selectedId) ?? null,
    [assistants, selectedId]
  );

  const load = useCallback(async () => {
    if (!accountId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fluxcoreApi.assistants.list(accountId);
      setAssistants(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [accountId, token]);

  const create = useCallback(async (runtime: 'local' | 'openai') => {
    const created = await fluxcoreApi.assistants.create(accountId, runtime);
    setAssistants(prev => [...prev, created]);
    return created;
  }, [accountId]);

  const update = useCallback(async (id: string, updates: Partial<Assistant>) => {
    const updated = await fluxcoreApi.assistants.update(id, updates);
    setAssistants(prev => prev.map(a => a.id === id ? updated : a));
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    await fluxcoreApi.assistants.delete(id, accountId);
    setAssistants(prev => prev.filter(a => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [accountId, selectedId]);

  useEffect(() => { load(); }, [load]);

  return {
    assistants,
    selectedAssistant,
    loading,
    error,
    select: setSelectedId,
    create,
    update,
    remove,
    reload: load,
  };
}
```

### Patrón 2: Componente de Lista Genérico

```typescript
// components/fluxcore/shared/EntityTable.tsx
interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  hideOnMobile?: boolean;
}

interface EntityTableProps<T extends { id: string }> {
  items: T[];
  columns: Column<T>[];
  onRowClick: (item: T) => void;
  loading?: boolean;
  emptyState?: ReactNode;
  renderActions?: (item: T) => ReactNode;
}

export function EntityTable<T extends { id: string }>({
  items,
  columns,
  onRowClick,
  loading,
  emptyState,
  renderActions,
}: EntityTableProps<T>) {
  if (loading) return <LoadingState />;
  if (items.length === 0) return emptyState ?? <EmptyState />;
  
  return (
    <div className="bg-surface rounded-lg border border-subtle">
      <table className="w-full">
        <thead>
          <tr className="border-b border-subtle">
            {columns.map(col => (
              <th 
                key={col.key}
                className={cn(
                  "px-4 py-3 text-left text-xs font-medium text-muted uppercase",
                  col.hideOnMobile && "hidden md:table-cell"
                )}
              >
                {col.header}
              </th>
            ))}
            {renderActions && <th className="px-4 py-3 sticky right-0 bg-surface" />}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr
              key={item.id}
              onClick={() => onRowClick(item)}
              className="group border-b border-subtle last:border-b-0 hover:bg-hover cursor-pointer"
            >
              {columns.map(col => (
                <td 
                  key={col.key}
                  className={cn("px-4 py-3", col.hideOnMobile && "hidden md:table-cell")}
                >
                  {col.render(item)}
                </td>
              ))}
              {renderActions && (
                <td className="px-4 py-3 sticky right-0 bg-surface group-hover:bg-hover">
                  {renderActions(item)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Patrón 3: Auto-Save Hook

```typescript
// hooks/fluxcore/useAutoSave.ts
export function useAutoSave<T>(
  saveFunction: (data: T) => Promise<void>,
  delay = 500
) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDataRef = useRef<T | null>(null);

  const save = useCallback((data: T, immediate = false) => {
    lastDataRef.current = data;
    setError(null);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const executeS ave = async () => {
      setIsSaving(true);
      try {
        await saveFunction(data);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsSaving(false);
      }
    };

    if (immediate) {
      void executeSave();
      return;
    }

    timeoutRef.current = setTimeout(executeSave, delay);
  }, [saveFunction, delay]);

  const saveImmediate = useCallback((data: T) => {
    save(data, true);
  }, [save]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { save, saveImmediate, isSaving, error };
}
```

---

## 📋 Checklist de Implementación

### Fase 1: Infraestructura (Estimación: 2-3 días)
- [ ] Crear estructura de carpetas `types/fluxcore/`
- [ ] Migrar interfaces a archivos centralizados
- [ ] Crear `lib/fluxcore/formatters.ts`
- [ ] Crear `lib/fluxcore/constants.ts`
- [ ] Crear API client centralizado
- [ ] Crear `useAutoSave` hook
- [ ] Crear `useClipboard` hook
- [ ] Crear hooks CRUD básicos

### Fase 2: Componentes compartidos (Estimación: 2-3 días)
- [ ] Crear `StatusBadge.tsx` unificado
- [ ] Crear `EmptyState.tsx`
- [ ] Crear `LoadingState.tsx`
- [ ] Crear `EditableName.tsx`
- [ ] Crear `IdCopyable.tsx`
- [ ] Crear `EntityTable.tsx`
- [ ] Crear `DetailHeader.tsx`
- [ ] Crear `DetailFooter.tsx`

### Fase 3: Refactorización de Vistas (Estimación: 3-5 días)
- [ ] Refactorizar `AssistantsView.tsx`
  - [ ] Extraer `AssistantList.tsx`
  - [ ] Extraer `AssistantDetail.tsx`
  - [ ] Extraer secciones de configuración
  - [ ] Integrar hooks
  - [ ] Tests de regresión visual
- [ ] Refactorizar `InstructionsView.tsx`
  - [ ] Extraer `InstructionList.tsx`
  - [ ] Extraer `InstructionEditor.tsx`
  - [ ] Extraer `MarkdownPreview.tsx`
  - [ ] Integrar hooks
- [ ] Refactorizar `VectorStoresView.tsx`
  - [ ] Extraer `VectorStoreList.tsx`
  - [ ] Extraer `VectorStoreDetail.tsx`
  - [ ] Integrar hooks

### Fase 4: Validación (Estimación: 1-2 días)
- [ ] Test E2E de flujos críticos
- [ ] Verificación visual de todas las vistas
- [ ] Validar que no hay regresiones funcionales
- [ ] Documentar cambios

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Romper funcionalidad existente | Alta | Alto | Branch separado, tests antes de merge |
| Cambios visuales no deseados | Media | Medio | Screenshots comparativos |
| Pérdida de estado durante refactor | Media | Alto | Mantener API de props idéntica |
| Conflictos con otros cambios | Baja | Medio | Comunicación clara del scope |

---

## 📊 Métricas de Éxito

| Métrica | Valor Actual | Objetivo |
|---------|--------------|----------|
| Líneas en AssistantsView | 1,289 | <300 |
| Líneas en InstructionsView | 807 | <200 |
| Líneas en VectorStoresView | 622 | <200 |
| Funciones duplicadas | ~15 | 0 |
| Tipos centralizados | 0% | 100% |
| Cobertura de hooks | 0% | >80% |
| Componentes reutilizables | ~3 | >15 |

---

## 🔜 Próximos Pasos Recomendados

1. **Revisar y aprobar** este documento de análisis
2. **Priorizar** qué fase iniciar primero
3. **Crear branch** de feature para refactorización
4. **Iniciar con Fase 1** (infraestructura base) que tiene menor riesgo
5. **Implementar tests E2E** antes de refactorizar vistas
6. **Refactorizar gradualmente** un componente a la vez

---

## 🚀 Case Study: Soberanía de Chat Core (Plantillas)

**Problema:** La lógica de envío de plantillas estaba duplicada entre el Frontend (que enviaba múltiples mensajes manuales) y el `AITemplateService` (que reconstruía el mensaje para la IA).

**Solución (Febrero 2026):**
1. **Centralización:** Se creó `templateService.executeTemplate` en el backend como fuente de verdad.
2. **Atomicidad:** El envío de texto + múltiples assets ahora es una sola operación atómica via API.
3. **IA Blind Trigger:** La IA ya no "construye" el mensaje; solo invoca el ID de la plantilla. El núcleo se encarga de la seguridad y ejecución.
4. **Frontend Delegado:** Los componentes de UI (`StandardComposer`) ahora son simples invocadores del endpoint `/execute`.

**Resultado:** Reducción de ~150 líneas de código inconsistente y eliminación de condiciones de carrera en el cliente.

---

*Este documento es un análisis vivo y debe actualizarse conforme avance la refactorización.*
