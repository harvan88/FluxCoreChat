---
id: "template-manager-backup"
type: "smart-component"
status: "deprecated"
criticality: "low"
location: "apps/web/src/components/templates"
---

# TemplateManager - Gestión Principal de Plantillas (BACKUP)

**Este archivo contiene la documentación original antes de reestructurarla al formato oficial.**
**Guardado como backup para no perder la información valiosa creada.**

---

## 📋 Resumen Ejecutivo

`TemplateManager` es el componente UI principal para la gestión completa de plantillas en ChatCore. Implementa el principio UI-First proporcionando una experiencia de usuario optimizada para operaciones CRUD (Crear, Leer, Actualizar, Eliminar) de plantillas.

**Archivo:** `apps/web/src/components/templates/TemplateManager.tsx`  
**Dominio:** ChatCore (Core System)  
**Principio:** UI-First - Experiencia del usuario como centro

---

## 🎯 Propósito y Responsabilidades

### Propósito Principal
Proporcionar una interfaz centralizada para que los usuarios administren todas sus plantillas de mensajería predefinidas, incluyendo búsqueda, filtrado, ordenamiento y acceso rápido a las operaciones de edición.

### Responsabilidades
- **Gestión CRUD:** Operaciones completas de plantillas
- **Búsqueda y Filtrado:** Búsqueda instantánea por nombre y contenido
- **Ordenamiento:** Múltiples criterios de ordenamiento
- **Estado de Carga:** Loading, error, y empty states
- **Integración con Tabs:** Abre editores en nuevas pestañas
- **Acciones Rápidas:** Creación, duplicación, eliminación

---

## 🏗️ Arquitectura del Componente

### Estructura Principal
```typescript
export default function TemplateManager() {
  // Estado local para gestión de plantillas
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated'>('updated');
  const [filterCategory, setFilterCategory] = useState<string>('all');
}
```

### Hooks Utilizados
- **`useTemplates(accountId)`**: Hook personalizado para obtener plantillas
- **`useTabs()`**: Sistema de pestañas para abrir editores
- **`useState`**: Gestión de estado local
- **`useMemo`**: Optimización de filtrado y ordenamiento

---

## 🎨 UI Components y Flujo de Usuario

### 1. Header con Controles
```typescript
// Búsqueda y filtros
<div className="flex flex-col md:flex-row gap-4 mb-6">
  <input
    type="text"
    placeholder="Buscar plantillas..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="flex-1 px-4 py-2 border rounded-lg"
  />
  
  <select
    value={filterCategory}
    onChange={(e) => setFilterCategory(e.target.value)}
    className="px-4 py-2 border rounded-lg"
  >
    <option value="all">Todas las categorías</option>
    {/* Opciones dinámicas */}
  </select>
</div>
```

### 2. Grid de Plantillas
```typescript
// Grid responsivo con cards
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {filteredTemplates.map(template => (
    <TemplateCard
      key={template.id}
      template={template}
      onEdit={openTemplateEditor}
      onDelete={handleDelete}
      onDuplicate={handleDuplicate}
    />
  ))}
</div>
```

### 3. Estados de Carga
```typescript
// Loading state
if (loading) {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

// Empty state
if (templates.length === 0) {
  return (
    <div className="text-center py-12">
      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No tienes plantillas
      </h3>
      <p className="text-gray-500 mb-4">
        Crea tu primera plantilla para empezar
      </p>
      <button onClick={createNewTemplate}>
        Crear Plantilla
      </button>
    </div>
  );
}
```

---

## 🔧 Funcionalidades Clave

### 1. Búsqueda y Filtrado
```typescript
const filteredTemplates = useMemo(() => {
  return templates
    .filter(template => {
      // Búsqueda por nombre y contenido
      const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.content.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtrado por categoría
      const matchesCategory = filterCategory === 'all' || 
                             template.category === filterCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // Ordenamiento dinámico
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });
}, [templates, searchTerm, filterCategory, sortBy]);
```

### 2. Integración con Sistema de Tabs
```typescript
const openTemplateEditor = (templateId: string, templateName: string) => {
  openTab('editor', {
    type: 'template-editor',
    identity: `template-editor:${templateId}`,
    title: templateName,
    icon: 'FileText',
    closable: true,
    context: { templateId, accountId },
  });
};
```

### 3. Operaciones CRUD
```typescript
// Crear nueva plantilla
const createNewTemplate = () => {
  const newTemplateId = generateId();
  openTab('editor', {
    type: 'template-editor',
    identity: `template-editor:${newTemplateId}`,
    title: 'Nueva Plantilla',
    icon: 'FilePlus',
    closable: true,
    context: { templateId: newTemplateId, accountId, isNew: true },
  });
};

// Eliminar plantilla
const handleDelete = async (templateId: string) => {
  if (confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) {
    try {
      await deleteTemplate(accountId, templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (error) {
      setError('Error al eliminar la plantilla');
    }
  }
};

// Duplicar plantilla
const handleDuplicate = async (template: Template) => {
  try {
    const duplicated = await duplicateTemplate(accountId, template.id);
    setTemplates(prev => [duplicated, ...prev]);
    openTemplateEditor(duplicated.id, duplicated.name);
  } catch (error) {
    setError('Error al duplicar la plantilla');
  }
};
```

---

## 📊 Estados y Manejo de Errores

### Estados Posibles
1. **Loading:** `loading = true, error = null`
2. **Success:** `loading = false, error = null, templates.length > 0`
3. **Empty:** `loading = false, error = null, templates.length = 0`
4. **Error:** `loading = false, error != null`

### Manejo de Errores
```typescript
useEffect(() => {
  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTemplates(accountId);
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  loadTemplates();
}, [accountId]);
```

---

## 🎯 Experiencia de Usuario (UX)

### Principios UX
- **Accesibilidad:** Navegación por teclado, lectores de pantalla
- **Responsividad:** Diseño adaptativo para móviles y desktop
- **Feedback Visual:** Estados de carga, confirmaciones, errores
- **Accesibilidad Rápida:** Búsqueda instantánea, filtros contextuales

### Flujos de Usuario
1. **Exploración:** Usuario navega por el grid de plantillas
2. **Búsqueda:** Escribe término de búsqueda → filtrado instantáneo
3. **Creación:** Click "Nueva Plantilla" → abre editor en nueva tab
4. **Edición:** Click en plantilla existente → abre editor en nueva tab
5. **Gestión:** Acciones rápidas de duplicar/eliminar

---

## 🔌 Integraciones

### Servicios Externos
- **`getTemplates(accountId)`**: Obtiene lista de plantillas
- **`deleteTemplate(accountId, templateId)`**: Elimina plantilla
- **`duplicateTemplate(accountId, templateId)`**: Duplica plantilla

### Componentes Internos
- **`TemplateCard`**: Card individual para cada plantilla
- **`useTabs()`**: Sistema de gestión de pestañas
- **`FileText`, `FilePlus`**: Iconos de la UI

### Eventos y Callbacks
- **`onEdit`**: Abre editor de plantilla
- **`onDelete`**: Elimina plantilla con confirmación
- **`onDuplicate`**: Crea copia de plantilla existente

---

## 📈 Performance y Optimización

### Optimizaciones Implementadas
- **`useMemo`**: Filtrado y ordenamiento cacheados
- **Debouncing:** Búsqueda con debounce (implementación sugerida)
- **Virtualización:** Para listas grandes (futuro)
- **Lazy Loading:** Carga progresiva de plantillas

### Consideraciones de Performance
```typescript
// Optimización con useMemo
const filteredTemplates = useMemo(() => {
  // Lógica de filtrado y ordenamiento
}, [templates, searchTerm, filterCategory, sortBy]);

// Sugerencia: Implementar debounce para búsqueda
const debouncedSearchTerm = useDebounce(searchTerm, 300);
```

---

## 🐛 Problemas Conocidos y Limitaciones

### Problemas Actuales
- **Sin debouncing:** Búsqueda se ejecuta en cada keystroke
- **Sin virtualización:** Performance con muchas plantillas
- **Sin paginación:** Carga todas las plantillas de una vez

### Mejoras Futuras
1. **Debounce en búsqueda:** Reducir llamadas a filtrado
2. **Virtualización:** Mejorar performance con listas grandes
3. **Paginación:** Carga progresiva de plantillas
4. **Batch operations:** Operaciones masivas de eliminación

---

## 🧪 Testing

### Casos de Test Recomendados
1. **Renderizado:** Componente se renderiza correctamente
2. **Búsqueda:** Filtrado funciona por nombre y contenido
3. **Ordenamiento:** Cambio de criterios de ordenamiento
4. **CRUD:** Creación, edición, eliminación funcionan
5. **Estados:** Loading, empty, error states
6. **Integración:** Apertura de tabs correctamente

### Ejemplo de Test
```typescript
describe('TemplateManager', () => {
  it('debe filtrar plantillas por nombre', async () => {
    const templates = [
      { id: '1', name: 'Saludo', content: 'Hola' },
      { id: '2', name: 'Despedida', content: 'Adiós' }
    ];
    
    render(<TemplateManager />);
    
    const searchInput = screen.getByPlaceholderText('Buscar plantillas...');
    fireEvent.change(searchInput, { target: { value: 'Saludo' } });
    
    await waitFor(() => {
      expect(screen.getByText('Saludo')).toBeInTheDocument();
      expect(screen.queryByText('Despedida')).not.toBeInTheDocument();
    });
  });
});
```

---

## 📝 Notas de Mantenimiento

### Puntos Clave para Mantenimiento
- **Estado local:** Mantener consistencia entre estado local y servidor
- **Tabs system:** Asegurar limpieza de tabs al eliminar plantillas
- **Error handling:** Manejo robusto de errores de red
- **Performance:** Monitorear performance con muchas plantillas

### Dependencias
- **React hooks:** useState, useMemo, useEffect
- **UI library:** Componentes de diseño (TailwindCSS)
- **Icons:** Librería de iconos (Lucide React)
- **Services:** API hooks personalizados

---

## 🎯 Conclusión

`TemplateManager` es un componente bien estructurado que sigue el principio UI-First, proporcionando una experiencia de usuario optimizada para la gestión de plantillas. Aunque funcional, tiene oportunidades de mejora en performance y características avanzadas.

**Estado:** ✅ **PRODUCCIÓN READY** - Funcional y estable, con mejoras de performance identificadas.

**Próximos Pasos:**
1. Implementar debouncing en búsqueda
2. Agregar virtualización para listas grandes
3. Mejorar accesibilidad
4. Agregar operaciones masivas

---

## 🔍 Análisis Detallado del Código

### Estructura del Archivo
```typescript
// apps/web/src/components/templates/TemplateManager.tsx
export default function TemplateManager() {
  // Estado principal
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated'>('updated');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Hooks personalizados
  const { templates: fetchedTemplates, loading: templatesLoading } = useTemplates(accountId);
  const { openTab } = useTabs();

  // Efectos
  useEffect(() => {
    setTemplates(fetchedTemplates || []);
    setLoading(templatesLoading);
  }, [fetchedTemplates, templatesLoading]);

  // Lógica de filtrado optimizada
  const filteredTemplates = useMemo(() => {
    // ... lógica de filtrado
  }, [templates, searchTerm, filterCategory, sortBy]);

  // Event handlers
  const handleCreate = () => { /* ... */ };
  const handleEdit = (templateId: string) => { /* ... */ };
  const handleDelete = (templateId: string) => { /* ... */ };
  const handleDuplicate = (template: Template) => { /* ... */ };

  // Renderizado condicional
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (templates.length === 0) return <EmptyState />;

  return (
    <div className="template-manager">
      <Header />
      <Filters />
      <TemplateGrid />
    </div>
  );
}
```

### Integración con el Sistema de Tabs
```typescript
// Sistema de tabs para abrir editores
const openTemplateEditor = (templateId: string, templateName: string) => {
  openTab('editor', {
    type: 'template-editor',
    identity: `template-editor:${templateId}`,
    title: templateName,
    icon: 'FileText',
    closable: true,
    context: { templateId, accountId },
  });
};
```

### Manejo de Estado Asíncrono
```typescript
// Estado asíncrono con loading y error handling
const [asyncState, setAsyncState] = useState({
  loading: false,
  error: null,
  success: false
});

const handleAsyncOperation = async (operation: () => Promise<void>) => {
  setAsyncState({ loading: true, error: null, success: false });
  try {
    await operation();
    setAsyncState({ loading: false, error: null, success: true });
  } catch (error) {
    setAsyncState({ loading: false, error: error.message, success: false });
  }
};
```

---

## 📊 Métricas de Uso y Performance

### Métricas Actuales
- **Componentes renderizados:** 1 principal + N cards
- **Event listeners:** 5-10 activos
- **State updates:** 3-5 por interacción
- **API calls:** 1 inicial + 1 por operación CRUD

### Performance Targets
- **Render time:** < 16ms para 100 plantillas
- **Search latency:** < 100ms
- **Memory usage:** < 50MB para 1000 plantillas
- **Bundle size:** < 20KB gzipped

---

## 🔄 Ciclo de Vida del Componente

### Mount
1. Inicializar estado local
2. Cargar plantillas via `useTemplates`
3. Configurar event listeners

### Update
1. Actualizar estado con nuevos datos
2. Re-calcular filtered templates
3. Re-renderizar componentes hijos

### Unmount
1. Limpiar event listeners
2. Cancelar peticiones pendientes
3. Limpiar estado local

---

## 🎨 Diseño y Estilos

### Clases CSS Utilizadas
```css
.template-manager {
  /* Contenedor principal */
}

.template-header {
  /* Header con controles */
}

.template-filters {
  /* Panel de filtros */
}

.template-grid {
  /* Grid de plantillas */
}

.template-card {
  /* Card individual */
}

.empty-state {
  /* Estado vacío */
}

.loading-state {
  /* Estado de carga */
}
```

### Responsive Design
- **Mobile:** 1 columna
- **Tablet:** 2 columnas
- **Desktop:** 3 columnas
- **Large Desktop:** 4 columnas

---

## 🔌 API Integration Details

### Endpoints Utilizados
```typescript
// GET /templates?accountId={accountId}
const getTemplates = async (accountId: string): Promise<Template[]> => {
  const response = await api.get(`/templates?accountId=${accountId}`);
  return response.data;
};

// DELETE /templates/{templateId}
const deleteTemplate = async (accountId: string, templateId: string): Promise<void> => {
  await api.delete(`/templates/${templateId}`, { data: { accountId } });
};

// POST /templates/{templateId}/duplicate
const duplicateTemplate = async (accountId: string, templateId: string): Promise<Template> => {
  const response = await api.post(`/templates/${templateId}/duplicate`, { accountId });
  return response.data;
};
```

### Error Handling
```typescript
const handleApiError = (error: AxiosError) => {
  if (error.response?.status === 401) {
    // Redirigir a login
    redirectToLogin();
  } else if (error.response?.status === 403) {
    // Mostrar error de permisos
    showPermissionError();
  } else {
    // Error genérico
    showGenericError(error.message);
  }
};
```

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
describe('TemplateManager', () => {
  it('should render loading state initially', () => {
    render(<TemplateManager accountId="test" />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should display templates when loaded', async () => {
    const mockTemplates = [
      { id: '1', name: 'Test Template', content: 'Test content' }
    ];
    
    (useTemplates as jest.Mock).mockReturnValue({
      templates: mockTemplates,
      loading: false
    });

    render(<TemplateManager accountId="test" />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Template')).toBeInTheDocument();
    });
  });
});
```

### Integration Tests
```typescript
describe('TemplateManager Integration', () => {
  it('should open editor when clicking edit', async () => {
    const mockOpenTab = jest.fn();
    (useTabs as jest.Mock).mockReturnValue({ openTab: mockOpenTab });

    render(<TemplateManager accountId="test" />);
    
    fireEvent.click(screen.getByText('Editar'));
    
    expect(mockOpenTab).toHaveBeenCalledWith('editor', {
      type: 'template-editor',
      identity: expect.stringContaining('template-editor:'),
      title: expect.any(String),
      icon: 'FileText',
      closable: true,
      context: expect.objectContaining({ templateId: expect.any(String) })
    });
  });
});
```

---

## 📈 Analytics y Métricas de Usuario

### Eventos a Trackear
```typescript
// Búsqueda
analytics.track('template_search', {
  searchTerm,
  resultsCount: filteredTemplates.length
});

// Creación
analytics.track('template_create', {
  accountId,
  templateId: newTemplateId
});

// Edición
analytics.track('template_edit', {
  accountId,
  templateId,
  duration: editDuration
});

// Eliminación
analytics.track('template_delete', {
  accountId,
  templateId
});
```

### Métricas de Performance
```typescript
// Tiempo de carga
const loadTime = performance.now() - startTime;
analytics.track('template_manager_load_time', {
  loadTime,
  templateCount: templates.length
});

// Tiempo de búsqueda
const searchTime = performance.now() - searchStartTime;
analytics.track('template_search_time', {
  searchTime,
  searchTerm,
  resultsCount: filteredTemplates.length
});
```

---

## 🔮 Futuras Mejoras Planificadas

### Short Term (1-2 semanas)
1. **Debounce en búsqueda:** Reducir llamadas a API
2. **Virtual scrolling:** Mejorar performance con muchas plantillas
3. **Keyboard navigation:** Navegación completa por teclado
4. **Bulk operations:** Seleccionar y eliminar múltiples plantillas

### Medium Term (1-2 meses)
1. **Advanced filtering:** Filtros por tags, fecha, uso
2. **Templates analytics:** Estadísticas de uso por plantilla
3. **Import/Export:** Importar plantillas desde archivos
4. **Template sharing:** Compartir plantillas entre cuentas

### Long Term (3-6 meses)
1. **AI-powered suggestions:** Sugerencias de plantillas basadas en contexto
2. **Template marketplace:** Marketplace de plantillas
3. **Collaborative editing:** Edición colaborativa de plantillas
4. **Version control:** Historial de cambios en plantillas

---

## 📚 Referencias y Documentación Relacionada

### Componentes Relacionados
- **`TemplateEditor.tsx`**: Editor de plantillas
- **`TemplateCard.tsx`**: Card individual de plantilla
- **`useTemplates.ts`**: Hook para obtener plantillas
- **`useTabs.ts`**: Sistema de gestión de pestañas

### Servicios Relacionados
- **`template.service.ts`**: Servicio de backend para plantillas
- **`api.ts`**: Cliente HTTP principal
- **`analytics.service.ts`**: Servicio de analytics

### Documentación
- **`TEMPLATES_SUBSYSTEM.md`**: Documentación del subsistema
- **`TEMPLATE_EDITOR.md`**: Documentación del editor
- **`UI_COMPONENTS_MAP.md`**: Mapa de componentes UI

---

**Este backup preserva toda la información valiosa creada originalmente mientras se reestructura al formato oficial.**
