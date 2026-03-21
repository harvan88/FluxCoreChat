---
id: "fluxcore-template-config-backup"
type: "smart-component"
status: "deprecated"
criticality: "low"
location: "apps/web/src/components/fluxcore/templates/FluxCoreTemplateConfig.tsx"
---

# FluxCoreTemplateConfig - Configuración IA para Plantillas (BACKUP)

**Este archivo contiene la documentación original antes de reestructurarla al formato oficial.**
**Guardado como backup para no perder la información valiosa creada.**

---

## 📋 Resumen Ejecutivo

`FluxCoreTemplateConfig` es el componente UI de extensión FluxCore que permite configurar el uso de plantillas por parte de la IA. Implementa el principio UI-First proporcionando controles intuitivos para autorizar, restringir y personalizar el comportamiento de la IA con plantillas específicas.

**Archivo:** `apps/web/src/components/fluxcore/templates/FluxCoreTemplateConfig.tsx`  
**Dominio:** FluxCore (Extensión)  
**Principio:** UI-First - Experiencia del usuario como centro

---

## 🎯 Propósito y Responsabilidades

### Propósito Principal
Proporcionar una interfaz para configurar cómo la IA puede usar plantillas específicas, incluyendo autorización, uso automatizado, instrucciones personalizadas, y restricciones de contexto.

### Responsabilidades
- **Autorización IA:** Toggle para habilitar/deshabilitar uso por IA
- **Uso automatizado:** Control de uso sin intervención humana
- **Instrucciones personalizadas:** Directivas específicas para la IA
- **Restricciones de contexto:** Configuración de datos autorizados
- **Validación:** Verificación de configuración coherente

---

## 🏗️ Arquitectura del Componente

### Estructura Principal
```typescript
export default function FluxCoreTemplateConfig({
  accountId,
  templateId,
  authorizeForAI,
  setAuthorizeForAI,
  allowAutomatedUse,
  setAllowAutomatedUse,
  aiUsageInstructions,
  setAiUsageInstructions
}: FluxCoreTemplateConfigProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
}
```

### Hooks Utilizados
- **`useFluxCoreConfig(accountId, templateId)`**: Obtiene configuración actual
- **`useAssistant(accountId)`**: Obtiene asistente activo
- **`useState`**: Gestión de estado local
- **`useEffect`**: Sincronización con servidor

---

## 🎨 UI Components y Flujo de Usuario

### 1. Panel Principal de Configuración
```typescript
<div className="space-y-6 p-4 bg-blue-50 rounded-lg">
  {/* Header */}
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
        <Bot className="w-5 h-5 text-blue-600" />
        Configuración para IA
      </h3>
      <p className="text-sm text-gray-600">
        Define cómo la IA puede usar esta plantilla
      </p>
    </div>
    
    <button
      onClick={() => setPreviewMode(!previewMode)}
      className="px-3 py-1 text-sm bg-white border rounded-lg hover:bg-gray-50"
    >
      {previewMode ? 'Editar' : 'Vista Previa'}
    </button>
  </div>
  
  {/* Contenido dinámico */}
  {previewMode ? (
    <ConfigurationPreview />
  ) : (
    <ConfigurationForm />
  )}
</div>
```

### 2. Formulario de Configuración
```typescript
const ConfigurationForm = () => {
  return (
    <div className="space-y-4">
      {/* Autorización principal */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={authorizeForAI}
              onChange={(e) => setAuthorizeForAI(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="font-medium text-gray-900">
              Autorizar uso por IA
            </span>
          </label>
          
          <HelpTooltip content="Permite que la IA use esta plantilla cuando detecte que coincide con la intención del usuario." />
        </div>
        
        <p className="text-sm text-gray-600">
          Cuando está activado, la IA podrá seleccionar y enviar esta plantilla automáticamente.
        </p>
      </div>
      
      {/* Configuración avanzada (solo si está autorizado) */}
      {authorizeForAI && (
        <div className="space-y-4">
          {/* Uso automatizado */}
          <div className="bg-white p-4 rounded-lg border">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={allowAutomatedUse}
                onChange={(e) => setAllowAutomatedUse(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="font-medium text-gray-900">
                Uso completamente automatizado
              </span>
            </label>
            
            <p className="text-sm text-gray-600">
              La IA enviará esta plantilla sin pedir confirmación. 
              Si está desactivado, se mostrará como sugerencia.
            </p>
            
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Precaución:</p>
                  <p>El uso automatizado puede enviar respuestas sin revisión humana. 
                     Activa solo para plantillas seguras y predecibles.</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Instrucciones personalizadas */}
          <div className="bg-white p-4 rounded-lg border">
            <label className="block font-medium text-gray-900 mb-2">
              Instrucciones para la IA
            </label>
            
            <textarea
              value={aiUsageInstructions}
              onChange={(e) => setAiUsageInstructions(e.target.value)}
              placeholder="Ej: 'Usa esta plantilla solo cuando el usuario pregunte por horarios de atención. Reemplaza {{nombre}} con el nombre del usuario si está disponible.'"
              className="w-full px-3 py-2 border rounded-lg h-24 text-sm font-mono resize-none"
            />
            
            <p className="text-xs text-gray-500 mt-1">
              Describe cuándo y cómo debe usar esta plantilla. Usa variables {{nombre}} para referenciar datos del usuario.
            </p>
          </div>
          
          {/* Variables esperadas */}
          <ExpectedVariablesSection />
          
          {/* Contexto autorizado */}
          <AuthorizedDataContext />
        </div>
      )}
    </div>
  );
};
```

### 3. Vista Previa de Configuración
```typescript
const ConfigurationPreview = () => {
  return (
    <div className="space-y-4">
      {/* Resumen de configuración */}
      <div className="bg-white p-4 rounded-lg border">
        <h4 className="font-medium text-gray-900 mb-3">Resumen de Configuración</h4>
        
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Autorizado para IA:</dt>
            <dd className="text-sm font-medium">
              {authorizeForAI ? (
                <span className="text-green-600">✅ Sí</span>
              ) : (
                <span className="text-red-600">❌ No</span>
              )}
            </dd>
          </div>
          
          {authorizeForAI && (
            <>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Uso automatizado:</dt>
                <dd className="text-sm font-medium">
                  {allowAutomatedUse ? (
                    <span className="text-green-600">✅ Automático</span>
                  ) : (
                    <span className="text-yellow-600">⚠️ Como sugerencia</span>
                  )}
                </dd>
              </div>
              
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Instrucciones:</dt>
                <dd className="text-sm font-medium max-w-xs truncate">
                  {aiUsageInstructions || 'Sin instrucciones personalizadas'}
                </dd>
              </div>
            </>
          )}
        </dl>
      </div>
      
      {/* Simulación de comportamiento */}
      <SimulationPanel />
      
      {/* Test de configuración */}
      <TestConfigurationPanel />
    </div>
  );
};
```

---

## 🔧 Funcionalidades Clave

### 1. Guardado Automático de Configuración
```typescript
useEffect(() => {
  const saveConfiguration = async () => {
    if (!templateId) return;
    
    try {
      setLoading(true);
      
      await updateFluxCoreTemplateConfig(accountId, templateId, {
        authorizeForAI,
        allowAutomatedUse,
        aiUsageInstructions,
        authorizedScopes,
        variableSettings
      });
      
    } catch (error) {
      setError('Error al guardar configuración');
    } finally {
      setLoading(false);
    }
  };
  
  // Guardar con debounce
  const timeoutId = setTimeout(saveConfiguration, 1000);
  return () => clearTimeout(timeoutId);
}, [authorizeForAI, allowAutomatedUse, aiUsageInstructions, authorizedScopes, variableSettings]);
```

### 2. Validación de Configuración
```typescript
const validateConfiguration = () => {
  const errors: string[] = [];
  
  if (authorizeForAI) {
    if (allowAutomatedUse && !aiUsageInstructions) {
      errors.push('Las instrucciones son requeridas para uso automatizado');
    }
    
    if (aiUsageInstructions && aiUsageInstructions.length > 500) {
      errors.push('Las instrucciones no deben exceder 500 caracteres');
    }
    
    const requiredVariables = templateVariables.filter(v => 
      variableSettings[v]?.required
    );
    
    if (requiredVariables.length > 0 && !aiUsageInstructions) {
      errors.push('Las instrucciones son requeridas cuando hay variables obligatorias');
    }
  }
  
  return errors;
};
```

### 3. Simulación de Comportamiento
```typescript
const SimulationPanel = () => {
  const [simulationInput, setSimulationInput] = useState('');
  const [simulationResult, setSimulationResult] = useState(null);
  
  const runSimulation = async () => {
    try {
      const result = await simulateTemplateUse({
        templateId,
        userInput: simulationInput,
        configuration: {
          authorizeForAI,
          allowAutomatedUse,
          aiUsageInstructions,
          authorizedScopes
        }
      });
      
      setSimulationResult(result);
    } catch (error) {
      setSimulationResult({ error: error.message });
    }
  };
  
  return (
    <div className="bg-white p-4 rounded-lg border">
      <h4 className="font-medium text-gray-900 mb-3">Simulación de Comportamiento</h4>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mensaje de usuario de prueba:
          </label>
          <input
            type="text"
            value={simulationInput}
            onChange={(e) => setSimulationInput(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="Ej: '¿Qué horarios tienen?'"
          />
        </div>
        
        <button
          onClick={runSimulation}
          className="w-full px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
        >
          Simular
        </button>
        
        {simulationResult && (
          <div className={`p-3 rounded ${
            simulationResult.error 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-green-50 border border-green-200'
          }`}>
            <h5 className="font-medium text-sm mb-2">
              {simulationResult.error ? 'Error' : 'Resultado'}
            </h5>
            
            {simulationResult.error ? (
              <p className="text-sm text-red-600">{simulationResult.error}</p>
            ) : (
              <div className="text-sm text-green-700">
                <p><strong>Acción:</strong> {simulationResult.action}</p>
                <p><strong>Confianza:</strong> {simulationResult.confidence}%</p>
                <p><strong>Plantilla:</strong> {simulationResult.templateName}</p>
                {simulationResult.variables && (
                  <p><strong>Variables detectadas:</strong> {simulationResult.variables.join(', ')}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
```

### 4. Test de Configuración
```typescript
const TestConfigurationPanel = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  
  const runTests = async () => {
    setTesting(true);
    
    try {
      const results = await testTemplateConfiguration({
        templateId,
        accountId,
        configuration: {
          authorizeForAI,
          allowAutomatedUse,
          aiUsageInstructions,
          authorizedScopes
        }
      });
      
      setTestResults(results);
    } catch (error) {
      console.error('Error en tests:', error);
    } finally {
      setTesting(false);
    }
  };
  
  return (
    <div className="bg-white p-4 rounded-lg border">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">Test de Configuración</h4>
        <button
          onClick={runTests}
          disabled={testing}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm disabled:opacity-50"
        >
          {testing ? 'Testing...' : 'Ejecutar Tests'}
        </button>
      </div>
      
      {testResults.length > 0 && (
        <div className="space-y-2">
          {testResults.map((result, index) => (
            <div key={index} className={`p-2 rounded text-sm ${
              result.passed 
                ? 'bg-green-50 text-green-700' 
                : 'bg-red-50 text-red-700'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{result.name}</span>
                <span>{result.passed ? '✅' : '❌'}</span>
              </div>
              {!result.passed && (
                <p className="text-xs mt-1">{result.message}</p>
              )}
            </div>
          ))}
        </div>
      )}
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
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
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
describe('FluxCoreTemplateConfig', () => {
  it('debe mostrar opciones avanzadas solo cuando está autorizado', async () => {
    render(
      <FluxCoreTemplateConfig 
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
      <FluxCoreTemplateConfig 
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

`FluxCoreTemplateConfig` es un componente esencial que proporciona control granular sobre cómo la IA utiliza plantillas. Con validación en tiempo real, simulación de comportamiento, y tests automáticos, ofrece una experiencia completa y segura para la configuración de IA.

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
// apps/web/src/components/fluxcore/templates/FluxCoreTemplateConfig.tsx
export default function FluxCoreTemplateConfig({ 
  accountId, 
  templateId, 
  authorizeForAI, 
  setAuthorizeForAI, 
  allowAutomatedUse, 
  setAllowAutomatedUse, 
  aiUsageInstructions, 
  setAiUsageInstructions 
}: FluxCoreTemplateConfigProps) {
  // Estado principal
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  
  // Hooks personalizados
  const { config, loading: configLoading } = useFluxCoreConfig(accountId, templateId);
  const { updateConfig } = useFluxCoreConfigActions();
  
  // Efectos
  useEffect(() => {
    if (config) {
      setAuthorizeForAI(config.authorizeForAI || false);
      setAllowAutomatedUse(config.allowAutomatedUse || false);
      setAiUsageInstructions(config.aiUsageInstructions || '');
    }
  }, [config]);
  
  // Auto-save con debounce
  useEffect(() => {
    // ... lógica de auto-save
  }, [authorizeForAI, allowAutomatedUse, aiUsageInstructions]);
  
  // Renderizado
  return (
    <div className="fluxcore-template-config">
      <Header />
      <ConfigurationForm />
      <PreviewSection />
      <TestSection />
    </div>
  );
}
```

### Manejo de Estado Complejo
```typescript
// Estado unificado para configuración
const [configState, setConfigState] = useState({
  authorizeForAI: false,
  allowAutomatedUse: false,
  aiUsageInstructions: '',
  authorizedScopes: [],
  variableSettings: {}
});

// Actualización optimizada
const updateConfigState = useCallback((updates: Partial<typeof configState>) => {
  setConfigState(prev => ({ ...prev, ...updates }));
}, []);

// Validación en tiempo real
const [validationErrors, setValidationErrors] = useState<string[]>([]);

useEffect(() => {
  const errors = validateConfiguration(configState);
  setValidationErrors(errors);
}, [configState]);
```

### Sistema de Validación Avanzado
```typescript
const ConfigurationValidator = {
  validateBasicRules: (config: ConfigState) => {
    const errors: string[] = [];
    
    if (config.allowAutomatedUse && !config.authorizeForAI) {
      errors.push('El uso automatizado requiere autorización básica');
    }
    
    if (config.aiUsageInstructions && config.aiUsageInstructions.length > 1000) {
      errors.push('Las instrucciones no deben exceder 1000 caracteres');
    }
    
    return errors;
  },
  
  validateVariableConsistency: (config: ConfigState, templateVariables: string[]) => {
    const errors: string[] = [];
    
    const requiredVars = Object.entries(config.variableSettings)
      .filter(([_, settings]) => settings.required)
      .map(([name]) => name);
    
    const missingVars = requiredVars.filter(v => !templateVariables.includes(v));
    
    if (missingVars.length > 0) {
      errors.push(`Variables requeridas no encontradas en plantilla: ${missingVars.join(', ')}`);
    }
    
    return errors;
  },
  
  validateScopePermissions: (config: ConfigState, availableScopes: string[]) => {
    const errors: string[] = [];
    
    const invalidScopes = config.authorizedScopes.filter(scope => !availableScopes.includes(scope));
    
    if (invalidScopes.length > 0) {
      errors.push(`Scopes no disponibles: ${invalidScopes.join(', ')}`);
    }
    
    return errors;
  }
};
```

---

## 📊 Métricas de Uso y Performance

### Métricas Actuales
- **Componentes renderizados:** 1 principal + N secciones
- **Event listeners:** 6-8 activos
- **State updates:** 2-3 por cambio
- **API calls:** 1 inicial + 1 por auto-save

### Performance Targets
- **Render time:** < 16ms para cambios de configuración
- **Auto-save latency:** < 500ms
- **Simulation time:** < 200ms
- **Memory usage:** < 25MB

---

## 🔄 Ciclo de Vida del Componente

### Mount
1. Inicializar estado local
2. Cargar configuración existente
3. Configurar auto-save

### Update
1. Actualizar estado con cambios del usuario
2. Validar configuración en tiempo real
3. Programar auto-save

### Unmount
1. Cancelar auto-save pendiente
2. Limpiar estado local
3. Limpiar timeouts

---

## 🎨 Diseño y Estilos

### Clases CSS Utilizadas
```css
.fluxcore-template-config {
  /* Contenedor principal */
}

.config-section {
  /* Sección de configuración */
}

.config-preview {
  /* Vista previa */
}

.test-section {
  /* Sección de tests */
}
```

### Responsive Design
- **Mobile:** Layout vertical
- **Tablet:** Layout horizontal con más espacio
- **Desktop:** Layout optimizado
- **Large Desktop:** Layout con sidebars

---

## 🔌 API Integration Details

### Endpoints Utilizados
```typescript
// GET /fluxcore/templates/{templateId}/config
const getFluxCoreTemplateConfig = async (accountId: string, templateId: string): Promise<FluxCoreTemplateConfig> => {
  const response = await api.get(`/fluxcore/templates/${templateId}/config`, {
    params: { accountId }
  });
  return response.data;
};

// PUT /fluxcore/templates/{templateId}/config
const updateFluxCoreTemplateConfig = async (accountId: string, templateId: string, config: Partial<FluxCoreTemplateConfig>): Promise<FluxCoreTemplateConfig> => {
  const response = await api.put(`/fluxcore/templates/${templateId}/config`, {
    ...config,
    accountId
  });
  return response.data;
};

// POST /fluxcore/templates/{templateId}/simulate
const simulateTemplateUse = async (params: SimulationParams): Promise<SimulationResult> => {
  const response = await api.post(`/fluxcore/templates/${params.templateId}/simulate`, params);
  return response.data;
};

// POST /fluxcore/templates/{templateId}/test
const testTemplateConfiguration = async (params: TestParams): Promise<TestResult[]> => {
  const response = await api.post(`/fluxcore/templates/${params.templateId}/test`, params);
  return response.data;
};
```

### Error Handling
```typescript
const handleConfigError = (error: AxiosError, operation: string) => {
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
  } else if (error.response?.status === 422) {
    // Error de validación
    showValidationError(error.response.data.message);
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
describe('FluxCoreTemplateConfig', () => {
  it('should render with default values', () => {
    render(
      <FluxCoreTemplateConfig 
        accountId="test" 
        templateId="test"
        authorizeForAI={false}
        setAuthorizeForAI={jest.fn()}
        allowAutomatedUse={false}
        setAllowAutomatedUse={jest.fn()}
        aiUsageInstructions=""
        setAiUsageInstructions={jest.fn()}
      />
    );
    
    expect(screen.getByLabelText('Autorizar uso por IA')).toBeInTheDocument();
    expect(screen.getByLabelText('Autorizar uso por IA')).not.toBeChecked();
  });
});
```

### Integration Tests
```typescript
describe('FluxCoreTemplateConfig Integration', () => {
  it('should save configuration when changed', async () => {
    const mockUpdateConfig = jest.fn();
    (useFluxCoreConfigActions as jest.Mock).mockReturnValue({
      updateConfig: mockUpdateConfig
    });

    render(
      <FluxCoreTemplateConfig 
        accountId="test" 
        templateId="test"
        authorizeForAI={true}
        setAuthorizeForAI={jest.fn()}
      />
    );
    
    // Simular cambio
    const checkbox = screen.getByLabelText('Autorizar uso por IA');
    fireEvent.click(checkbox);
    
    // Avanzar tiempo para debounce
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalledWith('test', 'test', {
        authorizeForAI: true,
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
// Cambios en configuración
analytics.track('template_config_change', {
  accountId,
  templateId,
  field: 'authorizeForAI', // o 'allowAutomatedUse', etc.
  oldValue: false,
  newValue: true
});

// Validación de configuración
analytics.track('template_config_validation', {
  accountId,
  templateId,
  errors: validationErrors,
  isValid: validationErrors.length === 0
});

// Simulación ejecutada
analytics.track('template_config_simulation', {
  accountId,
  templateId,
  userInput: simulationInput,
  result: simulationResult,
  confidence: simulationResult.confidence
});
```

### Métricas de Performance
```typescript
// Tiempo de guardado
const saveTime = performance.now() - saveStartTime;
analytics.track('template_config_save_time', {
  saveTime,
  configSize: JSON.stringify(configState).length,
  changeCount: changeCount
});

// Tiempo de simulación
const simulationTime = performance.now() - simulationStartTime;
analytics.track('template_config_simulation_time', {
  simulationTime,
  userInputLength: simulationInput.length,
  resultType: simulationResult.action
});
```

---

## 🔮 Futuras Mejoras Planificadas

### Short Term (1-2 semanas)
1. **Historial de cambios:** Track de modificaciones
2. **Plantillas de configuración:** Configuraciones predefinidas
3. **Rollback automático:** Revertir si hay errores
4. **Batch operations:** Operaciones masivas

### Medium Term (1-2 meses)
1. **AI-powered suggestions:** Sugerencias de configuración
2. **Advanced validation:** Validación semántica
3. **Configuración por contexto:** Configuraciones basadas en contexto
4. **Multi-language support:** Soporte multiidioma

### Long Term (3-6 meses)
1. **Collaborative editing:** Edición colaborativa en tiempo real
2. **Version control:** Control de versiones de configuración
3. **Config marketplace:** Marketplace de configuraciones
4. **AI optimization:** Optimización automática de configuraciones

---

## 📚 Referencias y Documentación Relacionada

### Componentes Relacionados
- **`TemplateEditor.tsx`**: Editor de plantillas
- **`TemplateManager.tsx`**: Gestión principal de plantillas
- **`useFluxCoreConfig.ts`**: Hook para obtener configuración
- **`useTemplateActions.ts`**: Hook para acciones de plantillas

### Servicios Relacionados
- **`fluxcore-template.service.ts`**: Servicio de configuración
- **`template.service.ts`**: Servicio de plantillas
- **`ai-template.service.ts`**: Servicio para IA de plantillas
- **`api.ts`**: Cliente HTTP principal

### Documentación
- **`TEMPLATES_SUBSYSTEM.md`**: Documentación del subsistema
- **`TEMPLATE_MANAGER.md`**: Documentación del gestor
- **`UI_COMPONENTS_MAP.md`**: Mapa de componentes UI

---

**Este backup preserva toda la información valiosa creada originalmente mientras se reestructura al formato oficial.**
