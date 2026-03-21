---
id: "fluxcore-template-config"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/fluxcore/templates/FluxCoreTemplateConfig.tsx"
---

# FluxCoreTemplateConfig - Configuración IA para Plantillas

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

### 4. Variables Esperadas
```typescript
const ExpectedVariablesSection = () => {
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  
  useEffect(() => {
    // Obtener variables de la plantilla
    const variables = extractVariablesFromTemplate(templateId);
    setTemplateVariables(variables);
  }, [templateId]);
  
  return (
    <div className="bg-white p-4 rounded-lg border">
      <h4 className="font-medium text-gray-900 mb-3">Variables de la Plantilla</h4>
      
      {templateVariables.length > 0 ? (
        <div className="space-y-2">
          {templateVariables.map(variable => (
            <div key={variable} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-500" />
                <code className="text-sm font-mono">{`{{${variable}}}`}</code>
              </div>
              
              <select className="text-xs px-2 py-1 border rounded">
                <option value="required">Requerido</option>
                <option value="optional">Opcional</option>
                <option value="auto">Auto-generar</option>
              </select>
            </div>
          ))}
          
          <p className="text-xs text-gray-500 mt-2">
            Define si cada variable es requerida, opcional, o puede ser generada automáticamente por la IA.
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Esta plantilla no contiene variables dinámicas.
        </p>
      )}
    </div>
  );
};
```

### 5. Contexto Autorizado
```typescript
const AuthorizedDataContext = () => {
  const [authorizedScopes, setAuthorizedScopes] = useState<string[]>([]);
  const [availableScopes] = useState([
    'displayName', 'businessHours', 'location', 'website', 
    'phone', 'email', 'avatar', 'customFields'
  ]);
  
  return (
    <div className="bg-white p-4 rounded-lg border">
      <h4 className="font-medium text-gray-900 mb-3">Datos Autorizados para la IA</h4>
      
      <p className="text-sm text-gray-600 mb-3">
        Selecciona qué datos del perfil del negocio puede usar la IA al procesar esta plantilla.
      </p>
      
      <div className="grid grid-cols-2 gap-2">
        {availableScopes.map(scope => (
          <label key={scope} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={authorizedScopes.includes(scope)}
              onChange={(e) => {
                if (e.target.checked) {
                  setAuthorizedScopes(prev => [...prev, scope]);
                } else {
                  setAuthorizedScopes(prev => prev.filter(s => s !== scope));
                }
              }}
              className="w-3 h-3 text-blue-600 rounded"
            />
            <span className="text-sm">{formatScopeName(scope)}</span>
          </label>
        ))}
      </div>
      
      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
        <p className="text-xs text-blue-700">
          💡 La IA solo tendrá acceso a los datos seleccionados cuando use esta plantilla.
        </p>
      </div>
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
            placeholder="Ej: '¿Qué horarios tienen?'"
            className="w-full px-3 py-2 border rounded-lg text-sm"
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
