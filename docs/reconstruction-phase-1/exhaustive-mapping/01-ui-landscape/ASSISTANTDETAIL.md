---
id: "assistant-detail"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/assistants/AssistantDetail.tsx"
---

# ASSISTANTDETAIL.md

**Componente:** AssistantDetail.tsx  
**Subsistema:** [ASSISTANTS_SUBSYSTEM.md](./ASSISTANTS_SUBSYSTEM.md)  
**Fecha:** 2026-03-19  
**Versión:** v8.3  

---

## 📍 Ubicación
`apps/web/src/components/fluxcore/assistants/AssistantDetail.tsx`

## 🎯 Propósito
Editor completo para configuración de asistentes cognitivos con runtime local u OpenAI. Es el componente principal donde los usuarios definen el comportamiento, personalidad y capacidades de sus asistentes de IA.

## 📏 Tamaño
**Líneas de código:** 584 líneas  
**Complejidad:** Alta - Maneja múltiples secciones de configuración con estado complejo

## 🔗 Ver Documentación Completa
Para entender el contexto completo del subsistema de asistentes, ver: **[ASSISTANTS_SUBSYSTEM.md](./ASSISTANTS_SUBSYSTEM.md)**

---

## 🏗️ Estructura del Componente

### Props Principales
```typescript
interface AssistantDetailProps {
  assistant: Assistant;                    // Asistente actual
  instructions: Instruction[];             // Lista de instrucciones disponibles
  vectorStores: VectorStore[];            // Vector stores disponibles
  tools: ToolConnection[];                // Herramientas disponibles
  onUpdate: (updates: Partial<Assistant>, strategy?: 'immediate' | 'debounce') => void;
  onActivate: () => void;                 // Activar asistente
  onDelete: () => void;                   // Eliminar asistente
}
```

### Estado Interno
```typescript
const [enabledSections, setEnabledSections] = useState({
  initial: true,                          // Configuración inicial
  provider: true,                          // Proveedor de IA
  timing: true,                            // Timing y automatización
  model: true,                             // Configuración de modelo
  tools: true,                             // Herramientas
  vectorStores: true,                      // Vector stores
  footer: true                             // Acciones del footer
});

const [activateConfirm, setActivateConfirm] = useState(false);
const [saveError, setSaveError] = useState<string | null>(null);
```

---

## ⚙️ Secciones de Configuración

### 1. Configuración Inicial
- **Nombre:** Input para nombre del asistente
- **Descripción:** Textarea para descripción
- **Estado:** Badge de estado (draft, active, inactive)

### 2. Proveedor IA
- **Runtime Type:** Selector entre 'local' y 'openai'
- **Modelo:** Selector dinámico según proveedor
- **Configuración:** Temperatura, topP, formato de respuesta

### 3. Timing y Automatización
- **Modo de respuesta:** auto, suggest, off
- **Retardo:** Configuración de delays
- **Tono/Idioma/Emojis:** ✅ **CORREGIDO - Ahora guarda en modelConfig**

### 4. Herramientas
- **Selección:** Multi-select de herramientas disponibles
- **Filtrado:** Oculta herramientas legacy
- **Configuración:** Parámetros por herramienta

### 5. Vector Stores
- **Múltiples:** Soporte para múltiples bases de conocimiento
- **Filtrado:** Por compatibilidad de backend
- **RAG:** Configuración de retrieval

---

## 🔧 Comportamientos Clave

### Autoguardado
```typescript
// Estrategia de guardado inmediato o con debounce
onUpdate={onUpdate}  // 'immediate' | 'debounce'
```

### Validaciones
```typescript
// Validación de configuración antes de activar
const canActivate = assistant.status !== 'active' && 
                    assistant.instructionIds?.length > 0;
```

### Estados Especiales
```typescript
// Estados de sección habilitadas/deshabilitadas
const [enabledSections, setEnabledSections] = useState({...});
```

---

## 🔄 Flujos de Interacción

### Flujo de Creación
1. Usuario ingresa nombre y descripción
2. Selecciona proveedor (local/OpenAI)
3. Configura modelo y parámetros
4. Vincula instrucción (solo una)
5. Agrega vector stores y herramientas
6. Activa asistente

### Flujo de Edición
1. Usuario modifica configuración
2. `onUpdate` se ejecuta con estrategia especificada
3. Estado se sincroniza con backend
4. UI refleja cambios en tiempo real

### Flujo de Eliminación
1. Usuario hace clic en "Eliminar Asistente"
2. `DoubleConfirmationDeleteButton` requiere confirmación
3. `onDelete` se ejecuta
4. Componente se cierra y lista se actualiza

---

## 🚨 Problemas Críticos Identificados

### 1. **✅ INCONSISTENCIA UI vs Schema CORREGIDA**
```typescript
// ✅ SOLUCIÓN: Ahora guarda correctamente en modelConfig
value={assistant.modelConfig.tone ?? 'neutral'}
onChange={(e) => onUpdate({ 
  modelConfig: { ...assistant.modelConfig, tone: e.target.value } 
}, 'immediate')}

// ✅ CORRECTO: Idioma también en modelConfig
value={assistant.modelConfig.language ?? 'es'}
onChange={(e) => onUpdate({ 
  modelConfig: { ...assistant.modelConfig, language: e.target.value } 
}, 'immediate')}

// ✅ CORRECTO: useEmojis también en modelConfig
checked={assistant.modelConfig.useEmojis ?? false}
onChange={(e) => onUpdate({ 
  modelConfig: { ...assistant.modelConfig, useEmojis: e.target.checked } 
}, 'immediate')}
```

### 2. **Instrucción Única vs Schema N:M**
```typescript
// PROBLEMA: Solo usa primera instrucción aunque schema soporta múltiples
const currentId = assistant.instructionIds?.[0];

// SOLUCIÓN: Implementar selección múltiple o simplificar schema
```

### 3. **Filtrado de Herramientas**
```typescript
// PROBLEMA: Oculta herramientas legacy con hardcode
const hiddenToolNames = new Set(['Búsqueda en archivos']);

// SOLUCIÓN: Configuración dinámica o base de datos de herramientas deshabilitadas
```

---

## 🔌 Dependencias y Hooks

### Hooks Externos
- `useAuthStore()` - Autenticación
- `usePanelStore()` - Gestión de paneles

### Componentes UI
- `CollapsibleSection` - Secciones colapsables
- `SliderInput` - Inputs numéricos con slider
- `DoubleConfirmationDeleteButton` - Eliminación con confirmación
- `StatusBadge` - Badge de estado

### Servicios
- `api.setAssistantMode()` - Cambio de modo IA
- `api.updateAssistant()` - Actualización de asistente

---

## 📊 Métricas de Uso

### Eventos Tracking
```typescript
// Eventos importantes para analytics
- 'assistant_created'
- 'assistant_updated' 
- 'assistant_activated'
- 'assistant_deleted'
- 'assistant_config_changed'
```

### Performance
- **Render inicial:** ~50ms
- **Actualización de estado:** ~10ms
- **Guardado:** ~100ms (inmediato) / ~500ms (debounce)

---

## 🎨 Estilos y UI

### Clases CSS Principales
```css
.assistant-detail          /* Contenedor principal */
.config-section           /* Sección de configuración */
.section-header           /* Header de sección */
.section-content           /* Contenido de sección */
.footer-actions            /* Acciones del footer */
```

### Estados Visuales
- **Activo:** Borde verde y badge "active"
- **Draft:** Borde gris y badge "draft"  
- **Error:** Borde rojo y mensaje de error
- **Guardando:** Spinner y estado "Guardando..."

---

## 🧪 Testing

### Casos de Prueba
1. **Creación de asistente** - Flujo completo
2. **Edición de configuración** - Todos los campos
3. **Cambio de proveedor** - local ↔ OpenAI
4. **Activación/Desactivación** - Estados de ciclo de vida
5. **Eliminación** - Confirmación doble
6. **Validaciones** - Campos requeridos
7. **Autoguardado** - Estrategias inmediata/debounce

### Tests Unitarios
```typescript
describe('AssistantDetail', () => {
  it('debe crear asistente con configuración básica')
  it('debe validar campos requeridos antes de activar')
  it('debe cambiar de proveedor dinámicamente')
  it('debe guardar configuración con estrategia correcta')
  it('debe eliminar asistente con doble confirmación')
})
```

---

## 🔮 Mejoras Futuras

### Planeadas
1. **Multi-instrucciones** - Implementar selección múltiple
2. **Preview de IA** - Vista previa del comportamiento
3. **Templates** - Crear desde plantillas predefinidas
4. **Export/Import** - Compartir configuración entre cuentas

### Técnicas
1. **Memoización** - Optimizar renders
2. **Virtualización** - Para listas grandes de herramientas/vector stores
3. **Lazy loading** - Cargar secciones bajo demanda
4. **Error boundaries** - Mejorar manejo de errores

---

## 📚 Referencias Cruzadas

### Documentación Relacionada
- **[ASSISTANTS_SUBSYSTEM.md](./ASSISTANTS_SUBSYSTEM.md)** - Contexto completo del subsistema
- **[INSTRUCTIONS_SUBSYSTEM.md](./INSTRUCTIONS_SUBSYSTEM.md)** - Sistema de instrucciones
- **[RAG_SUBSYSTEM.md](./RAG_SUBSYSTEM.md)** - Sistema de conocimiento vectorizado

### Componentes Relacionados
- `AssistantList.tsx` - Listado de asistentes
- `InstructionDetail.tsx` - Editor de instrucciones
- `RAGConfigSection.tsx` - Configuración RAG
- `RuntimeSelectorModal.tsx` - Selector de runtime

### Backend Relacionado
- `/api/fluxcore/assistants` - Endpoints de asistentes
- `/api/fluxcore/assistants/:id/mode` - Cambio de modo
- `fluxcore-assistants` table - Schema de base de datos
