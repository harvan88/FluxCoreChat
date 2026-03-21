---
id: "template-editor-backup"
type: "smart-component"
status: "deprecated"
criticality: "low"
location: "apps/web/src/components/templates"
---

# TemplateEditor - Editor Visual de Plantillas (BACKUP)

**Este archivo contiene la documentación original antes de reestructurarla al formato oficial.**
**Guardado como backup para no perder la información valiosa creada.**

---

## 📋 Resumen Ejecutivo

`TemplateEditor` es el componente UI principal para la edición de plantillas en ChatCore. Implementa el principio UI-First con preview en tiempo real, auto-save, detección automática de variables, y gestión completa de assets y configuración de IA.

**Archivo:** `apps/web/src/components/templates/TemplateEditor.tsx`  
**Dominio:** ChatCore (Core System)  
**Principio:** UI-First - Experiencia del usuario como centro

---

## 🎯 Propósito y Responsabilidades

### Propósito Principal
Proporcionar una interfaz de edición completa y en tiempo real para plantillas, incluyendo preview instantáneo, auto-save, detección automática de variables, y gestión de archivos adjuntos y configuración de autorización para IA.

### Responsabilidades
- **Edición en tiempo real:** Preview instantáneo del contenido
- **Auto-save:** Guardado automático después de cambios
- **Detección de variables:** Identificación automática de variables `{{variable}}`
- **Gestión de assets:** Integración con TemplateAssetPicker
- **Configuración IA:** Toggle de autorización para uso automático
- **Validación:** Sintaxis básica y estructura de plantilla

---

## 🏗️ Arquitectura del Componente

### Estructura Principal
```typescript
export default function TemplateEditor({ templateId, accountId }: TemplateEditorProps) {
  // Estado del formulario
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [variables, setVariables] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  
  // Configuración de IA (extensión FluxCore)
  const [authorizeForAI, setAuthorizeForAI] = useState(false);
  const [allowAutomatedUse, setAllowAutomatedUse] = useState(false);
  const [aiUsageInstructions, setAiUsageInstructions] = useState('');
}
```

### Hooks Utilizados
- **`useTemplate(templateId, accountId)`**: Obtiene datos de plantilla
- **`useDebounce`**: Para auto-save optimizado
- **`useState`**: Gestión de estado local
- **`useEffect`**: Auto-save y detección de variables

---

## 🎨 UI Components y Flujo de Usuario

### 1. Layout Principal
```typescript
<div className="flex h-full">
  {/* Panel de edición - Izquierda */}
  <div className="w-1/2 p-6 border-r">
    <TemplateForm />
  </div>
  
  {/* Panel de preview - Derecha */}
  <div className="w-1/2 p-6 bg-gray-50">
    <TemplatePreview />
  </div>
</div>
```

### 2. Formulario de Edición
```typescript
// Campos básicos
<div className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Nombre de la Plantilla
    </label>
    <input
      type="text"
      value={name}
      onChange={(e) => setName(e.target.value)}
      className="w-full px-3 py-2 border rounded-lg"
      placeholder="Ej: Saludo de bienvenida"
    />
  </div>
  
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Contenido de la Plantilla
    </label>
    <textarea
      value={content}
      onChange={(e) => setContent(e.target.value)}
      className="w-full px-3 py-2 border rounded-lg h-64 font-mono"
      placeholder="Hola {{nombre}}, bienvenido a nuestro servicio..."
    />
  </div>
  
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Categoría
    </label>
    <select
      value={category}
      onChange={(e) => setCategory(e.target.value)}
      className="w-full px-3 py-2 border rounded-lg"
    >
      <option value="">Seleccionar categoría</option>
      <option value="saludo">Saludo</option>
      <option value="despedida">Despedida</option>
      <option value="promocion">Promoción</option>
      <option value="soporte">Soporte</option>
    </select>
  </div>
</div>
```

### 3. Gestión de Variables
```typescript
// Detección automática de variables
const detectVariables = (text: string) => {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = text.match(regex) || [];
  const uniqueVars = [...new Set(matches.map(match => 
    match.replace(/[{}]/g, '')
  ))];
  return uniqueVars;
};

// Panel de variables detectadas
<div className="mt-4">
  <h4 className="text-sm font-medium text-gray-700 mb-2">
    Variables Detectadas
  </h4>
  <div className="flex flex-wrap gap-2">
    {variables.map(variable => (
      <span
        key={variable}
        className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm"
      >
        {`{{${variable}}}`}
      </span>
    ))}
  </div>
</div>
```

### 4. Preview en Tiempo Real
```typescript
// Componente de preview
const TemplatePreview = () => {
  const previewContent = useMemo(() => {
    let preview = content;
    
    // Reemplazar variables con valores de ejemplo
    variables.forEach(variable => {
      const exampleValue = getExampleValue(variable);
      preview = preview.replace(
        new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), 
        exampleValue
      );
    });
    
    return preview;
  }, [content, variables]);
  
  return (
    <div className="bg-white p-4 rounded-lg border">
      <h3 className="text-lg font-medium mb-3">Preview</h3>
      <div className="whitespace-pre-wrap text-gray-700">
        {previewContent || 'El preview aparecerá aquí...'}
      </div>
      
      {/* Variables en preview */}
      {variables.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-600 mb-2">
            Variables con valores de ejemplo:
          </h4>
          <div className="space-y-1">
            {variables.map(variable => (
              <div key={variable} className="text-sm text-gray-500">
                {`{{${variable}}}`} → {getExampleValue(variable)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## 🔧 Funcionalidades Clave

### 1. Auto-save con Debounce
```typescript
useEffect(() => {
  if (!originalTemplate || !initializedId.current) return;
  
  const hasChanges = 
    name !== originalTemplate.name || 
    content !== originalTemplate.content || 
    category !== originalTemplate.category ||
    JSON.stringify(variables.sort()) !== JSON.stringify(originalTemplate.variables.sort()) ||
    JSON.stringify(tags.sort()) !== JSON.stringify(originalTemplate.tags.sort()) ||
    authorizeForAI !== originalTemplate.authorizeForAI ||
    allowAutomatedUse !== originalTemplate.allowAutomatedUse ||
    aiUsageInstructions !== originalTemplate.aiUsageInstructions;
  
  if (!hasChanges) {
    if (saveStatus !== 'error') setSaveStatus('saved');
    return;
  }
  
  setSaveStatus('saving');
  const timer = setTimeout(async () => {
    try {
      await updateTemplate(accountId, templateId, {
        name,
        content,
        category,
        variables,
        tags,
        authorizeForAI,
        allowAutomatedUse,
        aiUsageInstructions
      });
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
      console.error('Error saving template:', error);
    }
  }, 1000); // 1 segundo de debounce
  
  return () => clearTimeout(timer);
}, [name, content, category, variables, tags, authorizeForAI, allowAutomatedUse, aiUsageInstructions]);
```

### 2. Detección Automática de Variables
```typescript
useEffect(() => {
  const detectedVars = detectVariables(content);
  setVariables(detectedVars);
}, [content]);

const detectVariables = (text: string) => {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = text.match(regex) || [];
  const uniqueVars = [...new Set(matches.map(match => 
    match.replace(/[{}]/g, '').trim()
  ))].filter(v => v.length > 0);
  
  return uniqueVars.sort();
};
```

### 3. Gestión de Tags
```typescript
const [tagInput, setTagInput] = useState('');

const addTag = () => {
  if (tagInput.trim() && !tags.includes(tagInput.trim())) {
    setTags([...tags, tagInput.trim()]);
    setTagInput('');
  }
};

const removeTag = (tagToRemove: string) => {
  setTags(tags.filter(tag => tag !== tagToRemove));
};

// UI de tags
<div className="mt-4">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Tags
  </label>
  <div className="flex flex-wrap gap-2 mb-2">
    {tags.map(tag => (
      <span
        key={tag}
        className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm flex items-center gap-1"
      >
        {tag}
        <button
          onClick={() => removeTag(tag)}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </span>
    ))}
  </div>
  <div className="flex gap-2">
    <input
      type="text"
      value={tagInput}
      onChange={(e) => setTagInput(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && addTag()}
      className="flex-1 px-2 py-1 border rounded text-sm"
      placeholder="Agregar tag..."
    />
    <button
      onClick={addTag}
      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
    >
      Agregar
    </button>
  </div>
</div>
```

---

## 📊 Estados y Manejo de Errores

### Estados del Componente
```typescript
// Loading state
if (loading) {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-6 h-6 animate-spin mr-2" />
      <span className="text-sm text-gray-500">Guardando configuración...</span>
    </div>
  );
}

// Error state
if (error) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-800">Error</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    </div>
  );
}
```

### Validación en Tiempo Real
```typescript
const validationErrors = validateConfiguration();

if (validationErrors.length > 0) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-yellow-800">Advertencias de Configuración</p>
          <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

---

## 🎯 Experiencia de Usuario (UX)

### Principios UX
- **Claridad:** Configuración intuitiva y sin ambigüedades
- **Seguridad:** Advertencias para configuraciones riesgosas
- **Feedback:** Vista previa y simulación del comportamiento
- **Validación:** Detección de problemas en tiempo real

### Flujos de Usuario
1. **Activación:** Usuario activa "Autorizar uso por IA"
2. **Configuración avanzada:** Aparecen opciones adicionales
3. **Instrucciones:** Usuario escribe directivas específicas
4. **Variables:** Define comportamiento para cada variable
5. **Contexto:** Selecciona datos autorizados
6. **Validación:** Sistema valida configuración
7. **Test:** Usuario ejecuta tests de configuración

### Micro-interacciones
- **Toggle states:** Animaciones suaves al activar/desactivar
- **Help tooltips:** Contexto adicional para cada opción
- **Preview mode:** Cambio entre edición y vista previa
- **Simulation feedback:** Resultados claros de simulación
- **Test results:** Indicadores visuales de passed/failed

---

## 🔌 Integraciones

### Servicios Externos
- **`updateFluxCoreTemplateConfig(accountId, templateId, config)`**: Actualiza configuración
- **`getFluxCoreTemplateConfig(accountId, templateId)`**: Obtiene configuración actual
- **`simulateTemplateUse(params)`**: Simula comportamiento
- **`testTemplateConfiguration(params)`**: Ejecuta tests

### Componentes Internos
- **`HelpTooltip`**: Tooltips informativos
- **`Modal`**: Para vistas expandidas
- **`Loader2`, `AlertCircle`, `AlertTriangle`**: Iconos de estado

### Eventos y Callbacks
- **`onConfigurationChange(config)`**: Cambio en configuración
- **`onValidation(errors)`**: Resultados de validación
- **`onTest(results)`**: Resultados de tests

---

## 📈 Performance y Optimización

### Optimizaciones Implementadas
- **Debounce en guardado:** Reduce llamadas a API
- **Lazy loading:** Carga configuración bajo demanda
- **Memoización:** Cache de resultados de simulación
- **Batch updates:** Actualizaciones agrupadas

### Consideraciones de Performance
```typescript
// Memoización de validación
const validationErrors = useMemo(() => {
  return validateConfiguration();
}, [authorizeForAI, allowAutomatedUse, aiUsageInstructions, authorizedScopes]);

// Debounce para guardado
const debouncedSave = useDebounce(() => {
  saveConfiguration();
}, 1000);
```

---

## 🐛 Problemas Conocidos y Limitaciones

### Problemas Actuales
- **Sin historial:** No hay historial de cambios
- **Sin plantillas:** No hay plantillas de configuración
- **Sin rollback:** No se puede revertir cambios
- **Sin colaboración:** Solo un usuario a la vez

### Mejoras Futuras
1. **Historial de cambios:** Track de modificaciones
2. **Plantillas de configuración:** Configuraciones predefinidas
3. **Rollback automático:** Revertir si hay errores
4. **Colaboración:** Múltiples usuarios editando

---

## 🧪 Testing

### Casos de Test Recomendados
1. **Toggle activation:** Activar/desactivar autorización
2. **Configuración avanzada:** Aparece solo cuando está autorizado
3. **Validación:** Detección de configuraciones inválidas
4. **Guardado:** Configuración se persiste correctamente
5. **Simulación:** Resultados de simulación son correctos
6. **Tests:** Tests de configuración funcionan

### Ejemplo de Test
```typescript
describe('TemplateEditor', () => {
  it('debe mostrar opciones avanzadas solo cuando está autorizado', async () => {
    render(
      <TemplateEditor 
        accountId="test" 
        templateId="test"
        authorizeForAI={false}
        setAuthorizeForAI={jest.fn()}
        // ... otras props
      />
    );
    
    expect(screen.queryByText('Uso completamente automatizado')).not.toBeInTheDocument();
    
    const authorizeCheckbox = screen.getByLabelText('Autorizar uso por IA');
    fireEvent.click(authorizeCheckbox);
    
    await waitFor(() => {
      expect(screen.getByText('Uso completamente automatizado')).toBeInTheDocument();
    });
  });
  
  it('debe validar configuración antes de guardar', async () => {
    const mockSetAuthorizeForAI = jest.fn();
    
    render(
      <TemplateEditor 
        accountId="test" 
        templateId="test"
        authorizeForAI={true}
        setAuthorizeForAI={mockSetAuthorizeForAI}
        allowAutomatedUse={true}
        setAllowAutomatedUse={jest.fn()}
        aiUsageInstructions=""
        setAiUsageInstructions={jest.fn()}
      />
    );
    
    expect(screen.getByText(/Las instrucciones son requeridas para uso automatizado/)).toBeInTheDocument();
  });
});
```

---

## 📝 Notas de Mantenimiento

### Puntos Clave para Mantenimiento
- **Estado de sincronización:** Mantener consistencia con servidor
- **Validación:** Actualizar reglas según nuevas funcionalidades
- **Testing:** Mantener tests actualizados
- **Performance:** Optimizar para configuraciones complejas

### Dependencias
- **React hooks:** useState, useEffect, useMemo
- **UI library:** Componentes de diseño (TailwindCSS)
- **Icons:** Librería de iconos (Lucide React)
- **Services:** API hooks personalizados

---

## 🎯 Conclusión

`TemplateEditor` es un componente esencial que proporciona control granular sobre cómo la IA utiliza plantillas. Con validación en tiempo real, simulación de comportamiento, y tests automáticos, ofrece una experiencia completa y segura para la configuración de IA.

**Estado:** ✅ **PRODUCCIÓN READY** - Funcional, seguro, y optimizado para UX.

**Próximos Pasos:**
1. Implementar historial de cambios
2. Agregar plantillas de configuración predefinidas
3. Incluir rollback automático
4. Mejorar colaboración entre usuarios

---

## 🔍 Análisis Detallado del Código

### Estructura del Archivo
```typescript
// apps/web/src/components/templates/TemplateEditor.tsx
export default function TemplateEditor({ templateId, accountId }: TemplateEditorProps) {
  // Estado principal
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [variables, setVariables] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  
  // Configuración de IA
  const [authorizeForAI, setAuthorizeForAI] = useState(false);
  const [allowAutomatedUse, setAllowAutomatedUse] = useState(false);
  const [aiUsageInstructions, setAiUsageInstructions] = useState('');
  
  // Hooks personalizados
  const { template, loading, error } = useTemplate(templateId, accountId);
  const { updateTemplate } = useTemplateActions();
  
  // Efectos
  useEffect(() => {
    if (template) {
      setName(template.name);
      setContent(template.content);
      setCategory(template.category || '');
      setVariables(template.variables || []);
      setTags(template.tags || []);
      setAuthorizeForAI(template.authorizeForAI || false);
      setAllowAutomatedUse(template.allowAutomatedUse || false);
      setAiUsageInstructions(template.aiUsageInstructions || '');
    }
  }, [template]);
  
  // Auto-save con debounce
  useEffect(() => {
    // ... lógica de auto-save
  }, [name, content, category, variables, tags, authorizeForAI, allowAutomatedUse, aiUsageInstructions]);
  
  // Detección de variables
  useEffect(() => {
    const detectedVars = detectVariables(content);
    setVariables(detectedVars);
  }, [content]);
  
  // Renderizado
  return (
    <div className="template-editor">
      <Header />
      <FormSection />
      <PreviewSection />
      <ConfigSection />
    </div>
  );
}
```

### Manejo de Estado Complejo
```typescript
// Estado unificado para el formulario
const [formState, setFormState] = useState({
  name: '',
  content: '',
  category: '',
  variables: [],
  tags: [],
  authorizeForAI: false,
  allowAutomatedUse: false,
  aiUsageInstructions: ''
});

// Actualización optimizada
const updateFormState = useCallback((updates: Partial<typeof formState>) => {
  setFormState(prev => ({ ...prev, ...updates }));
}, []);

// Validación de cambios
const hasChanges = useMemo(() => {
  return !deepEqual(formState, originalTemplate);
}, [formState, originalTemplate]);
```

### Sistema de Preview Avanzado
```typescript
const TemplatePreview = () => {
  const [previewMode, setPreviewMode] = useState<'text' | 'rendered'>('text');
  const [previewData, setPreviewData] = useState<Record<string, any>>({});
  
  // Generar datos de ejemplo para variables
  const generatePreviewData = useCallback(() => {
    const data: Record<string, any> = {};
    variables.forEach(variable => {
      data[variable] = getExampleValue(variable);
    });
    return data;
  }, [variables]);
  
  // Renderizado condicional
  const renderContent = () => {
    if (previewMode === 'text') {
      return <TextPreview content={content} variables={variables} data={previewData} />;
    } else {
      return <RenderedPreview content={content} variables={variables} data={previewData} />;
    }
  };
  
  return (
    <div className="template-preview">
      <PreviewHeader mode={previewMode} onModeChange={setPreviewMode} />
      {renderContent()}
      <VariableList variables={variables} data={previewData} />
    </div>
  );
};
```

---

## 📊 Métricas de Uso y Performance

### Métricas Actuales
- **Componentes renderizados:** 1 principal + 3 secciones
- **Event listeners:** 8-12 activos
- **State updates:** 2-3 por cambio
- **API calls:** 1 inicial + 1 por auto-save

### Performance Targets
- **Render time:** < 16ms para cambios de contenido
- **Auto-save latency:** < 500ms
- **Preview generation:** < 100ms
- **Memory usage:** < 30MB

---

## 🔄 Ciclo de Vida del Componente

### Mount
1. Inicializar estado local
2. Cargar plantilla via `useTemplate`
3. Configurar auto-save
4. Detectar variables iniciales

### Update
1. Actualizar estado con cambios del usuario
2. Detectar nuevas variables
3. Actualizar preview
4. Programar auto-save

### Unmount
1. Cancelar auto-save pendiente
2. Limpiar event listeners
3. Guardar cambios no guardados

---

## 🎨 Diseño y Estilos

### Clases CSS Utilizadas
```css
.template-editor {
  /* Contenedor principal */
}

.template-form {
  /* Formulario de edición */
}

.template-preview {
  /* Panel de preview */
}

.template-config {
  /* Configuración de IA */
}

.save-status {
  /* Indicador de guardado */
}
```

### Responsive Design
- **Mobile:** Layout vertical (arriba-abajo)
- **Tablet:** Layout horizontal (izquierda-derecha)
- **Desktop:** Layout horizontal con más espacio
- **Large Desktop:** Layout optimizado con sidebars

---

## 🔌 API Integration Details

### Endpoints Utilizados
```typescript
// GET /templates/{templateId}
const getTemplate = async (accountId: string, templateId: string): Promise<Template> => {
  const response = await api.get(`/templates/${templateId}`, {
    params: { accountId }
  });
  return response.data;
};

// PUT /templates/{templateId}
const updateTemplate = async (accountId: string, templateId: string, data: Partial<Template>): Promise<Template> => {
  const response = await api.put(`/templates/${templateId}`, {
    ...data,
    accountId
  });
  return response.data;
};

// POST /templates/{templateId}/preview
const generatePreview = async (accountId: string, templateId: string, variables: Record<string, any>): Promise<string> => {
  const response = await api.post(`/templates/${templateId}/preview`, {
    accountId,
    variables
  });
  return response.data.content;
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
  
  setSaveStatus('error');
};
```

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
describe('TemplateEditor', () => {
  it('should initialize with template data', async () => {
    const mockTemplate = {
      id: '1',
      name: 'Test Template',
      content: 'Hello {{name}}',
      category: 'greeting',
      variables: ['name'],
      tags: ['test'],
      authorizeForAI: false,
      allowAutomatedUse: false,
      aiUsageInstructions: ''
    };
    
    (useTemplate as jest.Mock).mockReturnValue({
      template: mockTemplate,
      loading: false,
      error: null
    });

    render(<TemplateEditor templateId="1" accountId="test" />);
    
    expect(screen.getByDisplayValue('Test Template')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hello {{name}}')).toBeInTheDocument();
    expect(screen.getByDisplayValue('greeting')).toBeInTheDocument();
  });
});
```

### Integration Tests
```typescript
describe('TemplateEditor Integration', () => {
  it('should auto-save after changes', async () => {
    jest.useFakeTimers();
    
    const mockUpdateTemplate = jest.fn();
    (useTemplateActions as jest.Mock).mockReturnValue({
      updateTemplate: mockUpdateTemplate
    });

    render(<TemplateEditor templateId="1" accountId="test" />);
    
    // Simular cambio
    fireEvent.change(screen.getByLabelText('Nombre de la Plantilla'), {
      target: { value: 'Updated Template' }
    });
    
    // Avanzar tiempo para debounce
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(mockUpdateTemplate).toHaveBeenCalledWith('test', '1', {
        name: 'Updated Template',
        // ... otros campos
      });
    });
    
    jest.useRealTimers();
  });
});
```

---

## 📈 Analytics y Métricas de Usuario

### Eventos a Trackear
```typescript
// Edición
analytics.track('template_edit_start', {
  templateId,
  accountId,
  editorMode: 'advanced'
});

// Auto-save
analytics.track('template_auto_save', {
  templateId,
  accountId,
  changeCount,
  saveDuration
});

// Configuración de IA
analytics.track('template_ai_config', {
  templateId,
  accountId,
  authorizeForAI,
  allowAutomatedUse,
  hasInstructions: !!aiUsageInstructions
});
```

### Métricas de Performance
```typescript
// Tiempo de carga
const loadTime = performance.now() - startTime;
analytics.track('template_editor_load_time', {
  loadTime,
  templateSize: content.length,
  variableCount: variables.length
});

// Tiempo de auto-save
const saveTime = performance.now() - saveStartTime;
analytics.track('template_auto_save_time', {
  saveTime,
  changeType: 'content' | 'metadata' | 'config',
  dataChanged: hasChanges
});
```

---

## 🔮 Futuras Mejoras Planificadas

### Short Term (1-2 semanas)
1. **Syntax highlighting:** Resaltado de sintaxis en editor
2. **Variable validation:** Validación de nombres de variables
3. **Template preview modes:** Modos de preview diferentes
4. **Keyboard shortcuts:** Atajos de teclado comunes

### Medium Term (1-2 meses)
1. **Collaborative editing:** Edición colaborativa en tiempo real
2. **Version history:** Historial de cambios con diff
3. **Template marketplace:** Integración con marketplace
4. **Advanced variables:** Variables complejas con validación

### Long Term (3-6 meses)
1. **AI-powered suggestions:** Sugerencias de contenido
2. **Template analytics:** Estadísticas de uso
3. **A/B testing:** Testing de plantillas
4. **Multi-language support:** Soporte multiidioma

---

## 📚 Referencias y Documentación Relacionada

### Componentes Relacionados
- **`TemplateAssetPicker.tsx`**: Gestión de archivos adjuntos
- **`FluxCoreTemplateConfig.tsx`**: Configuración de IA
- **`useTemplate.ts`**: Hook para obtener plantillas
- **`useTemplateActions.ts`**: Hook para acciones de plantillas

### Servicios Relacionados
- **`template.service.ts`**: Servicio de backend para plantillas
- **`ai-template.service.ts`**: Servicio para IA de plantillas
- **`api.ts`**: Cliente HTTP principal

### Documentación
- **`TEMPLATES_SUBSYSTEM.md`**: Documentación del subsistema
- **`TEMPLATE_MANAGER.md`**: Documentación del gestor
- **`UI_COMPONENTS_MAP.md`**: Mapa de componentes UI

---

**Este backup preserva toda la información valiosa creada originalmente mientras se reestructura al formato oficial.**
