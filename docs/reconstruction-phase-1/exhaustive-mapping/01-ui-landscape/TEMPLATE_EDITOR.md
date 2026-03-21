---
id: "template-editor"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/templates/TemplateEditor.tsx"
---

# TemplateEditor - Editor Visual de Plantillas

## 📋 Resumen Ejecutivo

`TemplateEditor` es el componente UI principal para la edición de plantillas en ChatCore. Implementa el principio UI-First con preview en tiempo real, auto-save, detección automática de variables, y gestión completa de assets y configuración de IA.

**Archivo:** `apps/web/src/components/templates/TemplateEditor.tsx`  
**Dominio:** ChatCore (Core System)  
**Principio:** UI-First - Experiencia del usuario como centro

---

## 🎯 Propósito y Responsabilidades

### Propósito Principal
Proporcionar una interfaz de edición completa y en tiempo real para plantillas, incluyendo preview instantáneo, gestión de variables, adjuntos de archivos, y configuración de autorización para IA.

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

## 🎛️ Integración con Assets

### TemplateAssetPicker Integration
```typescript
// Integración con gestión de archivos
<div className="mt-6">
  <h3 className="text-lg font-medium mb-3">Archivos Adjuntos</h3>
  <TemplateAssetPicker
    accountId={accountId}
    templateId={templateId}
    onAssetsChange={(assets) => {
      // Manejar cambios en assets
      console.log('Assets updated:', assets);
    }}
  />
</div>
```

### Características de Assets
- **Upload:** Subida de archivos directamente
- **Preview:** Vista previa de imágenes y documentos
- **Slots:** Organización por slots/categorías
- **Validación:** Tipos de archivo y tamaños permitidos

---

## 🤖 Configuración de IA (Extensión FluxCore)

### FluxCoreTemplateConfig Integration
```typescript
// Panel de configuración de IA
<div className="mt-6 p-4 bg-blue-50 rounded-lg">
  <h3 className="text-lg font-medium mb-3">Configuración para IA</h3>
  
  <FluxCoreTemplateConfig
    accountId={accountId}
    templateId={templateId}
    authorizeForAI={authorizeForAI}
    setAuthorizeForAI={setAuthorizeForAI}
    allowAutomatedUse={allowAutomatedUse}
    setAllowAutomatedUse={setAllowAutomatedUse}
    aiUsageInstructions={aiUsageInstructions}
    setAiUsageInstructions={setAiUsageInstructions}
  />
</div>
```

### Opciones de Configuración
- **`authorizeForAI`:** Permitir que la IA use esta plantilla
- **`allowAutomatedUse`:** Uso automático sin intervención
- **`aiUsageInstructions`:** Instrucciones específicas para la IA

---

## 📊 Estados y Manejo de Errores

### Estados de Guardado
```typescript
// Indicador de estado
<div className="flex items-center gap-2">
  {saveStatus === 'saved' && (
    <span className="text-green-600 text-sm flex items-center gap-1">
      <CheckCircle className="w-4 h-4" />
      Guardado
    </span>
  )}
  
  {saveStatus === 'saving' && (
    <span className="text-blue-600 text-sm flex items-center gap-1">
      <Loader2 className="w-4 h-4 animate-spin" />
      Guardando...
    </span>
  )}
  
  {saveStatus === 'error' && (
    <span className="text-red-600 text-sm flex items-center gap-1">
      <AlertCircle className="w-4 h-4" />
      Error al guardar
    </span>
  )}
</div>
```

### Manejo de Errores
```typescript
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const loadTemplate = async () => {
    try {
      setLoading(true);
      setError(null);
      const template = await getTemplate(accountId, templateId);
      
      if (template) {
        setName(template.name);
        setContent(template.content);
        setCategory(template.category || '');
        setVariables(template.variables || []);
        setTags(template.tags || []);
        setAuthorizeForAI(template.authorizeForAI || false);
        setAllowAutomatedUse(template.allowAutomatedUse || false);
        setAiUsageInstructions(template.aiUsageInstructions || '');
        setOriginalTemplate(template);
        initializedId.current = templateId;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la plantilla');
    } finally {
      setLoading(false);
    }
  };

  if (templateId) {
    loadTemplate();
  }
}, [templateId, accountId]);
```

---

## 🎯 Experiencia de Usuario (UX)

### Principios UX
- **Preview en tiempo real:** Feedback inmediato de cambios
- **Auto-save:** No requiere acción manual de guardado
- **Detección automática:** Reduce carga cognitiva
- **Intuición:** Layout claro y organizado

### Flujos de Usuario
1. **Creación:** Usuario comienza con plantilla en blanco
2. **Edición:** Escribe contenido → preview actualiza automáticamente
3. **Variables:** Escribe `{{variable}}` → se detecta automáticamente
4. **Assets:** Agrega archivos → se integran en preview
5. **Configuración IA:** Activa toggles → habilita uso por IA

---

## 🔌 Integraciones

### Servicios Externos
- **`getTemplate(accountId, templateId)`**: Obtiene plantilla
- **`updateTemplate(accountId, templateId, data)`**: Actualiza plantilla
- **`createTemplate(accountId, data)`**: Crea nueva plantilla

### Componentes Internos
- **`TemplateAssetPicker`**: Gestión de archivos adjuntos
- **`FluxCoreTemplateConfig`**: Configuración de IA
- **`Loader2`, `CheckCircle`, `AlertCircle`**: Iconos de estado

### Eventos y Callbacks
- **`onAssetsChange`:** Cambios en archivos adjuntos
- **`onSave`:** Guardado manual (opcional)
- **`onCancel`:** Cancelar edición

---

## 📈 Performance y Optimización

### Optimizaciones Implementadas
- **Debounce en auto-save:** Reduce llamadas a API
- **Memoización de preview:** Calcula preview solo cuando cambia contenido
- **Lazy loading de assets:** Carga assets bajo demanda
- **Virtualización:** Para contenido largo (futuro)

### Consideraciones de Performance
```typescript
// Memoización de preview
const previewContent = useMemo(() => {
  // Lógica de preview
}, [content, variables]);

// Debounce para auto-save
const debouncedSave = useDebounce(() => {
  // Lógica de guardado
}, 1000);
```

---

## 🐛 Problemas Conocidos y Limitaciones

### Problemas Actuales
- **Sin validación de sintaxis:** Variables mal formateadas
- **Sin límite de tamaño:** Plantillas muy grandes
- **Sin historial:** No hay undo/redo
- **Sin colaboración:** Solo un usuario a la vez

### Mejoras Futuras
1. **Validador de sintaxis:** Para variables y estructura
2. **Historial de cambios:** Undo/redo functionality
3. **Colaboración en tiempo real:** Múltiples usuarios
4. **Plantillas avanzadas:** Condicionales, loops

---

## 🧪 Testing

### Casos de Test Recomendados
1. **Renderizado:** Componente se renderiza correctamente
2. **Auto-save:** Guardado automático después de cambios
3. **Detección de variables:** Identificación correcta
4. **Preview:** Actualización en tiempo real
5. **Assets:** Integración con TemplateAssetPicker
6. **Configuración IA:** Toggle de autorización

### Ejemplo de Test
```typescript
describe('TemplateEditor', () => {
  it('debe detectar variables automáticamente', async () => {
    render(<TemplateEditor templateId="test" accountId="test" />);
    
    const contentTextarea = screen.getByPlaceholderText('Hola {{nombre}}...');
    fireEvent.change(contentTextarea, { 
      target: { value: 'Hola {{nombre}}, tu pedido {{pedido}} está listo.' }
    });
    
    await waitFor(() => {
      expect(screen.getByText('{{nombre}}')).toBeInTheDocument();
      expect(screen.getByText('{{pedido}}')).toBeInTheDocument();
    });
  });
  
  it('debe guardar automáticamente después de cambios', async () => {
    jest.useFakeTimers();
    
    render(<TemplateEditor templateId="test" accountId="test" />);
    
    const nameInput = screen.getByPlaceholderText('Ej: Saludo de bienvenida');
    fireEvent.change(nameInput, { target: { value: 'Nuevo nombre' } });
    
    // Verificar estado "saving"
    expect(screen.getByText('Guardando...')).toBeInTheDocument();
    
    // Avanzar tiempo para debounce
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.getByText('Guardado')).toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });
});
```

---

## 📝 Notas de Mantenimiento

### Puntos Clave para Mantenimiento
- **Estado de sincronización:** Mantener consistencia entre estado local y servidor
- **Debounce timing:** Ajustar según necesidades de performance
- **Validación de variables:** Prevenir variables duplicadas o inválidas
- **Error handling:** Manejo robusto de errores de red

### Dependencias
- **React hooks:** useState, useEffect, useMemo
- **UI library:** Componentes de diseño (TailwindCSS)
- **Icons:** Librería de iconos (Lucide React)
- **Services:** API hooks personalizados
- **FluxCore extension:** TemplateAssetPicker, FluxCoreTemplateConfig

---

## 🎯 Conclusión

`TemplateEditor` es un componente robusto y bien diseñado que sigue el principio UI-First, proporcionando una experiencia de usuario excelente para la edición de plantillas. Con auto-save, preview en tiempo real, y detección automática de variables, ofrece una productividad alta para los usuarios.

**Estado:** ✅ **PRODUCCIÓN READY** - Funcional, estable, y optimizado para UX.

**Próximos Pasos:**
1. Implementar validación de sintaxis de variables
2. Agregar historial de cambios (undo/redo)
3. Mejorar performance con contenido muy largo
4. Agregar plantillas avanzadas con condicionales
