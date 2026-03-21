---
id: "template-quick-picker-backup"
type: "smart-component"
status: "deprecated"
criticality: "low"
location: "apps/web/src/components/templates"
---

# TemplateQuickPicker - Selector Rápido de Plantillas (BACKUP)

**Este archivo contiene la documentación original antes de reestructurarla al formato oficial.**
**Guardado como backup para no perder la información valiosa creada.**

---

## 📋 Resumen Ejecutivo

`TemplateQuickPicker` es el componente UI que proporciona acceso rápido a plantillas directamente desde el chat. Implementa el principio UI-First ofreciendo una experiencia fluida para seleccionar y enviar plantillas durante una conversación activa.

**Archivo:** `apps/web/src/components/chat/TemplateQuickPicker.tsx`  
**Dominio:** ChatCore (Core System)  
**Principio:** UI-First - Experiencia del usuario como centro

---

## 🎯 Propósito y Responsabilidades

### Propósito Principal
Proporcionar acceso instantáneo a plantillas disponibles durante una conversación, permitiendo a los usuarios buscar, previsualizar y enviar plantillas con un solo clic sin interrumpir el flujo del chat.

### Responsabilidades
- **Búsqueda instantánea:** Filtrado rápido por nombre y contenido
- **Preview rápido:** Vista previa del contenido de plantillas
- **Envío directo:** Un clic para enviar la plantilla
- **Indicadores visuales:** Mostrar archivos adjuntos y variables
- **Integración fluida:** Se integra con el composer del chat

---

## 🏗️ Arquitectura del Componente

### Estructura Principal
```typescript
export default function TemplateQuickPicker({
  accountId,
  conversationId,
  onSelect,
  isVisible
}: TemplateQuickPickerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
}
```

### Hooks Utilizados
- **`useTemplates(accountId)`**: Obtiene plantillas disponibles
- **`useState`**: Gestión de estado local
- **`useEffect`**: Filtrado y navegación por teclado
- **`useCallback`**: Optimización de callbacks

---

## 🎨 UI Components y Flujo de Usuario

### 1. Trigger Button (en el Composer)
```typescript
// Botón que abre el picker
<button
  onClick={() => setIsVisible(!isVisible)}
  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
  title="Insertar plantilla"
>
  <FileText className="w-5 h-5" />
</button>
```

### 2. Panel Principal del Picker
```typescript
// Panel desplegable con búsqueda y lista
<div className="absolute bottom-full left-0 right-0 mb-2 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
  {/* Header con búsqueda */}
  <div className="p-3 border-b">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        placeholder="Buscar plantilla..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
        autoFocus
      />
    </div>
  </div>
  
  {/* Lista de plantillas filtradas */}
  <div className="max-h-64 overflow-y-auto">
    {filteredTemplates.map((template, index) => (
      <TemplateItem
        key={template.id}
        template={template}
        index={index}
        isSelected={selectedIndex === index}
        onSelect={handleSelect}
        onMouseEnter={() => setSelectedIndex(index)}
      />
    ))}
  </div>
</div>
```

### 3. Item de Plantilla Individual
```typescript
const TemplateItem = ({ template, index, isSelected, onSelect, onMouseEnter }) => {
  return (
    <div
      className={`p-3 cursor-pointer transition-colors ${
        isSelected 
          ? 'bg-blue-50 border-l-4 border-blue-500' 
          : 'hover:bg-gray-50'
      }`}
      onClick={() => onSelect(template)}
      onMouseEnter={onMouseEnter}
    >
      {/* Header con nombre y categoría */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">{template.name}</h4>
        {template.category && (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
            {template.category}
          </span>
        )}
      </div>
      
      {/* Preview del contenido */}
      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
        {template.content}
      </p>
      
      {/* Indicadores */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        {/* Variables */}
        {template.variables && template.variables.length > 0 && (
          <span className="flex items-center gap-1">
            <Code className="w-3 h-3" />
            {template.variables.length} variables
          </span>
        )}
        
        {/* Assets */}
        {template.assets && template.assets.length > 0 && (
          <span className="flex items-center gap-1">
            <Paperclip className="w-3 h-3" />
            {template.assets.length} archivos
          </span>
        )}
        
        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex gap-1">
            {template.tags.slice(0, 2).map(tag => (
              <span key={tag} className="px-1 py-0.5 bg-gray-100 rounded">
                {tag}
              </span>
            ))}
            {template.tags.length > 2 && (
              <span className="text-gray-400">+{template.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## 🔧 Funcionalidades Clave

### 1. Búsqueda y Filtrado Instantáneo
```typescript
const filteredTemplates = useMemo(() => {
  if (!searchTerm) return templates;
  
  const searchLower = searchTerm.toLowerCase();
  
  return templates.filter(template => 
    template.name.toLowerCase().includes(searchLower) ||
    template.content.toLowerCase().includes(searchLower) ||
    template.category?.toLowerCase().includes(searchLower) ||
    template.tags?.some(tag => tag.toLowerCase().includes(searchLower))
  );
}, [templates, searchTerm]);
```

### 2. Navegación por Teclado
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isVisible) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredTemplates.length - 1 ? prev + 1 : prev
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
        
      case 'Enter':
        e.preventDefault();
        if (filteredTemplates[selectedIndex]) {
          handleSelect(filteredTemplates[selectedIndex]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [isVisible, selectedIndex, filteredTemplates]);
```

### 3. Envío Directo de Plantilla
```typescript
const handleSelect = async (template: Template) => {
  try {
    // Cerrar picker inmediatamente
    onClose();
    
    // Si la plantilla tiene variables, abrir diálogo para ingresar valores
    if (template.variables && template.variables.length > 0) {
      openVariableDialog(template);
    } else {
      // Enviar directamente
      await sendTemplate(template);
    }
  } catch (error) {
    console.error('Error sending template:', error);
    // Mostrar error al usuario
  }
};

const sendTemplate = async (template: Template, variables?: Record<string, string>) => {
  const message = {
    conversationId,
    content: template.content,
    variables: variables || {},
    templateId: template.id
  };
  
  await sendMessage(message);
};
```

### 4. Diálogo para Variables
```typescript
const VariableDialog = ({ template, onSubmit, onCancel }) => {
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  
  // Inicializar valores por defecto
  useEffect(() => {
    const initialValues: Record<string, string> = {};
    template.variables.forEach(variable => {
      initialValues[variable] = '';
    });
    setVariableValues(initialValues);
  }, [template.variables]);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium mb-4">
          Completar variables para "{template.name}"
        </h3>
        
        <div className="space-y-3">
          {template.variables.map(variable => (
            <div key={variable}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {variable}
              </label>
              <input
                type="text"
                value={variableValues[variable] || ''}
                onChange={(e) => setVariableValues(prev => ({
                  ...prev,
                  [variable]: e.target.value
                }))}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder={`Ingrese ${variable}...`}
              />
            </div>
          ))}
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onSubmit(variableValues)}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Enviar
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 📊 Estados y Manejo de Errores

### Estados del Componente
```typescript
// Loading state
if (loading) {
  return (
    <div className="p-4 text-center">
      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
      <p className="text-sm text-gray-500">Cargando plantillas...</p>
    </div>
  );
}

// Empty state
if (templates.length === 0) {
  return (
    <div className="p-4 text-center">
      <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
      <p className="text-sm text-gray-500">No tienes plantillas</p>
      <button className="text-sm text-blue-600 hover:underline mt-2">
        Crear primera plantilla
      </button>
    </div>
  );
}

// No results state
if (filteredTemplates.length === 0 && searchTerm) {
  return (
    <div className="p-4 text-center">
      <Search className="w-6 h-6 text-gray-400 mx-auto mb-2" />
      <p className="text-sm text-gray-500">
        No se encontraron plantillas para "{searchTerm}"
      </p>
    </div>
  );
}
```

### Manejo de Errores
```typescript
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTemplates(accountId);
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  };

  if (isVisible) {
    loadTemplates();
  }
}, [accountId, isVisible]);
```

---

## 🎯 Experiencia de Usuario (UX)

### Principios UX
- **Accesibilidad:** Navegación completa por teclado
- **Velocidad:** Búsqueda y filtrado instantáneos
- **Contexto:** Se mantiene en el flujo del chat
- **Feedback visual:** Indicadores claros de estado

### Flujos de Usuario
1. **Activación:** Click en icono de plantilla en composer
2. **Búsqueda:** Escribe término → filtrado instantáneo
3. **Navegación:** Flechas arriba/abajo para seleccionar
4. **Selección:** Enter o click en plantilla
5. **Variables:** Diálogo para completar variables (si aplica)
6. **Envío:** Plantilla se inserta en el chat

### Micro-interacciones
- **Hover states:** Feedback visual al pasar mouse
- **Selection highlight:** Elemento seleccionado claramente visible
- **Loading states:** Indicadores durante carga
- **Error states:** Mensajes claros y recuperables
- **Success feedback:** Confirmación visual de envío

---

## 🔌 Integraciones

### Servicios Externos
- **`getTemplates(accountId)`**: Obtiene plantillas disponibles
- **`sendMessage(message)`**: Envía mensaje al chat
- **`getTemplate(accountId, templateId)`**: Obtiene detalles de plantilla

### Componentes Internos
- **`Search`, `FileText`, `Paperclip`, `Code`**: Iconos de UI
- **`Loader2`**: Indicador de carga
- **`Composer del chat`**: Integración con input principal

### Eventos y Callbacks
- **`onSelect(template)`**: Selección de plantilla
- **`onClose()`**: Cierre del picker
- **`onSendMessage(message)`**: Envío al chat

---

## 📈 Performance y Optimización

### Optimizaciones Implementadas
- **Memoización:** Filtrado cacheado con useMemo
- **Lazy loading:** Carga solo cuando es visible
- **Virtual scrolling:** Para listas grandes (futuro)
- **Debounce:** Para búsqueda (implementación sugerida)

### Consideraciones de Performance
```typescript
// Memoización de filtrado
const filteredTemplates = useMemo(() => {
  // Lógica de filtrado
}, [templates, searchTerm]);

// Lazy loading de datos
useEffect(() => {
  if (isVisible && !templates.length) {
    loadTemplates();
  }
}, [isVisible]);

// Sugerencia: Debounce para búsqueda
const debouncedSearchTerm = useDebounce(searchTerm, 300);
```

---

## 🐛 Problemas Conocidos y Limitaciones

### Problemas Actuales
- **Sin debouncing:** Búsqueda se ejecuta en cada keystroke
- **Sin virtual scrolling:** Performance con muchas plantillas
- **Sin categorización:** No hay agrupación por categoría
- **Sin favoritos:** No hay plantillas frecuentes

### Mejoras Futuras
1. **Debounce en búsqueda:** Reducir llamadas a filtrado
2. **Virtual scrolling:** Mejorar performance con listas grandes
3. **Categorización:** Agrupar plantillas por categoría
4. **Favoritos:** Marcar plantillas como frecuentes
5. **Uso reciente:** Mostrar plantillas usadas recientemente

---

## 🧪 Testing

### Casos de Test Recomendados
1. **Renderizado:** Componente se renderiza correctamente
2. **Búsqueda:** Filtrado funciona por nombre y contenido
3. **Navegación:** Flechas arriba/abajo funcionan
4. **Selección:** Enter y click envían plantilla
5. **Variables:** Diálogo para completar variables
6. **Teclado:** Escape cierra el picker

### Ejemplo de Test
```typescript
describe('TemplateQuickPicker', () => {
  it('debe filtrar plantillas por nombre', async () => {
    const templates = [
      { id: '1', name: 'Saludo', content: 'Hola' },
      { id: '2', name: 'Despedida', content: 'Adiós' }
    ];
    
    render(<TemplateQuickPicker accountId="test" conversationId="test" />);
    
    const searchInput = screen.getByPlaceholderText('Buscar plantilla...');
    fireEvent.change(searchInput, { target: { value: 'Saludo' } });
    
    await waitFor(() => {
      expect(screen.getByText('Saludo')).toBeInTheDocument();
      expect(screen.queryByText('Despedida')).not.toBeInTheDocument();
    });
  });
  
  it('debe navegar con flechas del teclado', async () => {
    render(<TemplateQuickPicker accountId="test" conversationId="test" />);
    
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    
    await waitFor(() => {
      expect(screen.getByText('Saludo')).toHaveClass('bg-blue-50');
    });
  });
  
  it('debe enviar plantilla al presionar Enter', async () => {
    const mockOnSelect = jest.fn();
    
    render(
      <TemplateQuickPicker 
        accountId="test" 
        conversationId="test" 
        onSelect={mockOnSelect}
      />
    );
    
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'Enter' });
    
    await waitFor(() => {
      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Saludo' })
      );
    });
  });
});
```

---

## 📝 Notas de Mantenimiento

### Puntos Clave para Mantenimiento
- **Estado de visibilidad:** Sincronizar con estado del composer
- **Foco del input:** Mantener foco en búsqueda cuando está abierto
- **Posicionamiento:** Ajustar según viewport y scroll
- **Accesibilidad:** Mantener navegación por teclado funcional

### Dependencias
- **React hooks:** useState, useEffect, useMemo, useCallback
- **UI library:** Componentes de diseño (TailwindCSS)
- **Icons:** Librería de iconos (Lucide React)
- **Services:** API hooks personalizados

---

## 🎯 Conclusión

`TemplateQuickPicker` es un componente esencial que proporciona acceso rápido y fluido a plantillas durante el chat. Con búsqueda instantánea, navegación por teclado, y envío directo, mejora significativamente la productividad del usuario sin interrumpir el flujo conversacional.

**Estado:** ✅ **PRODUCCIÓN READY** - Funcional, accesible, y optimizado para UX.

**Próximos Pasos:**
1. Implementar debouncing en búsqueda
2. Agregar virtual scrolling para listas grandes
3. Incluir categorización y favoritos
4. Mejorar accesibilidad con lectores de pantalla

---

## 🔍 Análisis Detallado del Código

### Estructura del Archivo
```typescript
// apps/web/src/components/chat/TemplateQuickPicker.tsx
export default function TemplateQuickPicker({ 
  accountId, 
  conversationId, 
  onSelect, 
  isVisible 
}: TemplateQuickPickerProps) {
  // Estado principal
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Hooks personalizados
  const { templates: fetchedTemplates, loading: templatesLoading } = useTemplates(accountId);
  
  // Efectos
  useEffect(() => {
    if (isVisible && !templates.length) {
      loadTemplates();
    }
  }, [isVisible]);
  
  useEffect(() => {
    setTemplates(fetchedTemplates || []);
    setLoading(templatesLoading);
  }, [fetchedTemplates, templatesLoading]);
  
  // Filtrado optimizado
  const filteredTemplates = useMemo(() => {
    // ... lógica de filtrado
  }, [templates, searchTerm]);
  
  // Navegación por teclado
  useEffect(() => {
    // ... lógica de keyboard navigation
  }, [isVisible, selectedIndex]);
  
  // Renderizado condicional
  if (!isVisible) return null;
  
  return (
    <div className="template-quick-picker">
      <SearchInput />
      <TemplateList />
      <EmptyState />
    </div>
  );
}
```

### Manejo de Estado Asíncrono
```typescript
// Estado asíncrono con loading y error handling
const [asyncState, setAsyncState] = useState({
  loading: false,
  error: null,
  success: false
});

const loadTemplates = async () => {
  setAsyncState({ loading: true, error: null, success: false });
  try {
    const data = await getTemplates(accountId);
    setTemplates(data);
    setAsyncState({ loading: false, error: null, success: true });
  } catch (error) {
    setAsyncState({ loading: false, error: error.message, success: false });
  }
};
```

### Sistema de Búsqueda Avanzado
```typescript
const useAdvancedSearch = (templates: Template[], searchTerm: string) => {
  return useMemo(() => {
    if (!searchTerm.trim()) return templates;
    
    const searchLower = searchTerm.toLowerCase();
    
    return templates.filter(template => {
      // Búsqueda en múltiples campos
      const nameMatch = template.name.toLowerCase().includes(searchLower);
      const contentMatch = template.content.toLowerCase().includes(searchLower);
      const categoryMatch = template.category?.toLowerCase().includes(searchLower);
      const tagsMatch = template.tags?.some(tag => 
        tag.toLowerCase().includes(searchLower)
      );
      
      return nameMatch || contentMatch || categoryMatch || tagsMatch;
    }).sort((a, b) => {
      // Ordenamiento por relevancia
      const aScore = calculateRelevanceScore(a, searchLower);
      const bScore = calculateRelevanceScore(b, searchLower);
      return bScore - aScore;
    });
  }, [templates, searchTerm]);
};

const calculateRelevanceScore = (template: Template, searchTerm: string): number => {
  let score = 0;
  
  // Nombre exacto: 100 puntos
  if (template.name.toLowerCase() === searchTerm) score += 100;
  // Nombre parcial: 50 puntos
  else if (template.name.toLowerCase().includes(searchTerm)) score += 50;
  
  // Contenido: 30 puntos
  if (template.content.toLowerCase().includes(searchTerm)) score += 30;
  
  // Categoría: 20 puntos
  if (template.category?.toLowerCase().includes(searchTerm)) score += 20;
  
  // Tags: 10 puntos por tag
  template.tags?.forEach(tag => {
    if (tag.toLowerCase().includes(searchTerm)) score += 10;
  });
  
  return score;
};
```

---

## 📊 Métricas de Uso y Performance

### Métricas Actuales
- **Componentes renderizados:** 1 principal + N items
- **Event listeners:** 3-5 activos
- **State updates:** 1-2 por interacción
- **API calls:** 1 inicial

### Performance Targets
- **Search latency:** < 50ms para 100 plantillas
- **Render time:** < 16ms para 50 items
- **Memory usage:** < 20MB para 1000 plantillas
- **Bundle size:** < 10KB gzipped

---

## 🔄 Ciclo de Vida del Componente

### Mount
1. Inicializar estado local
2. Configurar event listeners de teclado
3. Cargar plantillas si es visible

### Update
1. Actualizar estado de búsqueda
2. Re-calcular filtered templates
3. Actualizar índice seleccionado

### Unmount
1. Limpiar event listeners
2. Cancelar peticiones pendientes
3. Limpiar estado local

---

## 🎨 Diseño y Estilos

### Clases CSS Utilizadas
```css
.template-quick-picker {
  /* Contenedor principal */
}

.search-input {
  /* Input de búsqueda */
}

.template-item {
  /* Item de plantilla */
}

.template-item.selected {
  /* Item seleccionado */
}

.empty-state {
  /* Estado vacío */
}
```

### Responsive Design
- **Mobile:** Ancho completo, scroll vertical
- **Tablet:** Ancho completo, scroll optimizado
- **Desktop:** Ancho completo, scroll suave
- **Large Desktop:** Ancho completo, virtual scrolling

---

## 🔌 API Integration Details

### Endpoints Utilizados
```typescript
// GET /templates?accountId={accountId}&include=assets
const getTemplates = async (accountId: string): Promise<Template[]> => {
  const response = await api.get('/templates', {
    params: { accountId, include: 'assets' }
  });
  return response.data;
};

// GET /templates/{templateId}
const getTemplate = async (accountId: string, templateId: string): Promise<Template> => {
  const response = await api.get(`/templates/${templateId}`, {
    params: { accountId }
  });
  return response.data;
};

// POST /messages
const sendMessage = async (message: Message): Promise<Message> => {
  const response = await api.post('/messages', message);
  return response.data;
};
```

### Error Handling
```typescript
const handleApiError = (error: AxiosError, operation: string) => {
  console.error(`Error in ${operation}:`, error);
  
  if (error.response?.status === 401) {
    // Redirigir a login
    redirectToLogin();
  } else if (error.response?.status === 403) {
    // Mostrar error de permisos
    showPermissionError();
  } else if (error.response?.status === 404) {
    // Plantilla no encontrada
    showTemplateNotFoundError();
  } else {
    // Error genérico
    showGenericError(error.message);
  }
  
  setError(error.message);
};
```

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
describe('TemplateQuickPicker', () => {
  it('should render when visible', () => {
    render(<TemplateQuickPicker accountId="test" conversationId="test" isVisible={true} />);
    expect(screen.getByPlaceholderText('Buscar plantilla...')).toBeInTheDocument();
  });

  it('should not render when hidden', () => {
    render(<TemplateQuickPicker accountId="test" conversationId="test" isVisible={false} />);
    expect(screen.queryByPlaceholderText('Buscar plantilla...')).not.toBeInTheDocument();
  });
});
```

### Integration Tests
```typescript
describe('TemplateQuickPicker Integration', () => {
  it('should call onSelect when template is selected', async () => {
    const mockOnSelect = jest.fn();
    
    render(
      <TemplateQuickPicker 
        accountId="test" 
        conversationId="test" 
        isVisible={true}
        onSelect={mockOnSelect}
      />
    );
    
    fireEvent.click(screen.getByText('Saludo'));
    
    await waitFor(() => {
      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Saludo' })
      );
    });
  });
});
```

---

## 📈 Analytics y Métricas de Usuario

### Eventos a Trackear
```typescript
// Apertura del picker
analytics.track('template_picker_open', {
  accountId,
  conversationId,
  trigger: 'button_click' // o 'keyboard_shortcut'
});

// Búsqueda
analytics.track('template_picker_search', {
  accountId,
  searchTerm,
  resultsCount: filteredTemplates.length,
  searchDuration: searchEndTime - searchStartTime
});

// Selección
analytics.track('template_picker_select', {
  accountId,
  conversationId,
  templateId: template.id,
  templateName: template.name,
  hasVariables: template.variables?.length > 0,
  selectionMethod: 'click' // o 'keyboard'
});
```

### Métricas de Performance
```typescript
// Tiempo de carga
const loadTime = performance.now() - startTime;
analytics.track('template_picker_load_time', {
  loadTime,
  templateCount: templates.length
});

// Tiempo de búsqueda
const searchTime = performance.now() - searchStartTime;
analytics.track('template_picker_search_time', {
  searchTime,
  searchTerm,
  resultsCount: filteredTemplates.length
});
```

---

## 🔮 Futuras Mejoras Planificadas

### Short Term (1-2 semanas)
1. **Debounce en búsqueda:** Reducir llamadas a filtrado
2. **Keyboard shortcuts:** Atajos de teclado adicionales
3. **Categorización:** Agrupación por categoría
4. **Favoritos:** Plantillas favoritas

### Medium Term (1-2 meses)
1. **Virtual scrolling:** Performance con muchas plantillas
2. **Advanced search:** Búsqueda avanzada con filtros
3. **Recent templates:** Plantillas usadas recientemente
4. **Template preview:** Preview mejorado con renderizado

### Long Term (3-6 meses)
1. **AI suggestions:** Sugerencias de plantillas
2. **Template analytics:** Estadísticas de uso
3. **Collaborative templates:** Plantillas compartidas
4. **Multi-language support:** Soporte multiidioma

---

## 📚 Referencias y Documentación Relacionada

### Componentes Relacionados
- **`TemplateManager.tsx`**: Gestión principal de plantillas
- **`TemplateEditor.tsx`**: Editor de plantillas
- **`useTemplates.ts`**: Hook para obtener plantillas
- **`ChatComposer.tsx`**: Compositor de mensajes

### Servicios Relacionados
- **`template.service.ts`**: Servicio de backend para plantillas
- **`message.service.ts`**: Servicio de mensajes
- **`api.ts`**: Cliente HTTP principal

### Documentación
- **`TEMPLATES_SUBSYSTEM.md`**: Documentación del subsistema
- **`TEMPLATE_MANAGER.md`**: Documentación del gestor
- **`UI_COMPONENTS_MAP.md`**: Mapa de componentes UI

---

**Este backup preserva toda la información valiosa creada originalmente mientras se reestructura al formato oficial.**
