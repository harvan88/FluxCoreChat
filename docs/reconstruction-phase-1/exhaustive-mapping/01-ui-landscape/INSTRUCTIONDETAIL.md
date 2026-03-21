---
id: "instruction-detail"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/fluxcore/instructions/InstructionDetail.tsx"
---

# INSTRUCTIONDETAIL.md

**Componente:** InstructionDetail.tsx  
**Subsistema:** [INSTRUCTIONS_SUBSYSTEM.md](./INSTRUCTIONS_SUBSYSTEM.md)  
**Fecha:** 2026-03-19  
**Versión:** v8.3  

---

## 📍 Ubicación
`apps/web/src/components/fluxcore/instructions/InstructionDetail.tsx`

## 🎯 Propósito
Editor completo para plantillas de instrucciones reutilizables por múltiples asistentes. Soporta tres modalidades de vista (código, preview, vista final IA) y gestión de variables para personalización dinámica.

## 📏 Tamaño
**Líneas de código:** 405 líneas  
**Complejidad:** Media - Editor de texto con múltiples modos de visualización

## 🔗 Ver Documentación Completa
Para entender el contexto completo del subsistema de instrucciones, ver: **[INSTRUCTIONS_SUBSYSTEM.md](./INSTRUCTIONS_SUBSYSTEM.md)**

---

## 🏗️ Estructura del Componente

### Props Principales
```typescript
interface InstructionDetailProps {
  instruction: Instruction;              // Instrucción actual
  viewMode: EditorViewMode;               // Modo de vista actual
  copyStatus: ClipboardStatus;           // Estado de copiado
  isManaged: boolean;                    // Si es instrucción gestionada
  stats: InstructionStats;               // Estadísticas de uso
  lastAutosave?: Date | null;           // Último autoguardado
  assistantConsumers: AssistantConsumer[]; // Asistentes que usan esta instrucción
  onContentChange: (value: string) => void;
  onContentBlur?: () => void;
  onViewModeChange: (mode: EditorViewMode) => void;
  onCopyContent: () => void;
  onDownloadContent: () => void;
  onSave?: () => void;
  onClose?: () => void;
  onRequestPromptPreview: (id: string, name: string) => void;
  onCreateAssistant?: () => void;
  createAssistantLoading?: boolean;
  openProfileTab: () => void;
}
```

### Estado Interno
```typescript
const [previewPickerOpen, setPreviewPickerOpen] = useState(false);
const [promptPreview, setPromptPreview] = useState<PromptPreviewData | null>(null);
const previewPickerRef = useRef<HTMLDivElement | null>(null);
```

---

## 🎨 Las Tres Modalidades de Vista

### 💻 Modo Código (`viewMode === 'code'`)
```typescript
// Editor de texto sin formato para edición directa
<textarea
  className="flex-1 p-4 bg-transparent text-primary font-mono text-sm leading-6 resize-none focus:outline-none"
  value={instruction.content ?? ''}
  onChange={(e) => !isManaged && onContentChange(e.target.value)}
  onBlur={() => !isManaged && onContentBlur?.()}
  placeholder="# Instrucciones\n\nEscribe aquí las instrucciones para el asistente..."
  spellCheck={false}
  readOnly={isManaged}
/>
```

### 👁️ Modo Preview (`viewMode === 'preview'`)
```typescript
// Renderizado Markdown con sintaxis highlighting
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeSanitize]}
  className="prose prose-sm max-w-none dark:prose-invert"
>
  {instruction.content || '*Sin contenido*'}
</ReactMarkdown>
```

### ✨ Modo Vista Final IA (`Vista final (IA)`)
```typescript
// Simulación del prompt final que recibirá el LLM
<button
  type="button"
  onClick={() => onRequestPromptPreview(instruction.id, instruction.name)}
  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
>
  <Sparkles size={14} />
  Vista final (IA)
</button>
```

---

## 🔧 Comportamientos Clave

### Modo Gestionado (`isManaged`)
```typescript
// Banner azul para instrucciones del sistema
{isManaged && (
  <div className="px-6 py-3 bg-accent/10 border-b border-accent/20 flex items-center gap-3">
    <Info size={16} className="text-accent" />
    <div className="text-sm text-accent">
      <span className="font-medium">Instrucción gestionada</span>
      <span className="text-muted"> - Esta instrucción está controlada por el sistema</span>
    </div>
  </div>
)}

// Bloqueo de edición si es gestionada
disabled={isManaged}
readOnly={isManaged}
onChange={(e) => !isManaged && onContentChange(e.target.value)}
```

### Autoguardado
```typescript
// Formato de tiempo del último autoguardado
const formatAutosaveInfo = () => {
  if (!lastAutosave) return 'Autoguardado pendiente';
  const diffMs = Date.now() - lastAutosave.getTime();
  const minutes = Math.floor(diffMs / 60000);
  
  if (diffMs < 15000) return 'Autoguardado hace unos segundos';
  if (minutes < 1) return 'Autoguardado hace menos de un minuto';
  if (minutes < 60) return `Autoguardado hace ${minutes} min`;
  return `Autoguardado ${lastAutosave.toLocaleDateString()} ${lastAutosave.toLocaleTimeString()}`;
};
```

### Gestión de Variables
```typescript
// Las variables en el contenido se reemplazan dinámicamente
// Ejemplo: {{user_name}}, {{company}}, {{context}}
// El backend inyecta valores reales durante la vista final IA
```

---

## 🔄 Flujos de Interacción

### Flujo de Edición
1. Usuario escribe en modo código
2. `onContentChange` se ejecuta en cada cambio
3. Autoguardado con debounce (via hook externo)
4. Usuario puede cambiar entre modos de vista
5. Preview muestra renderizado Markdown
6. Vista Final IA muestra prompt ensamblado

### Flujo de Vista Final IA
1. Usuario hace clic en "Vista final (IA)"
2. `onRequestPromptPreview` se ejecuta
3. Backend procesa instrucción con variables reales
4. Se muestra modal con prompt final
5. Usuario puede ver exactamente qué recibirá el LLM

### Flujo de Creación de Asistente
1. Usuario hace clic en "Crear asistente con esta instrucción"
2. `onCreateAssistant` se ejecuta
3. Sistema abre modal de creación de asistente
4. Instrucción se preselecciona automáticamente

---

## 🚨 Problemas Críticos Identificados

### 1. **Bloqueo de Edición Inconsistente**
```typescript
// PROBLEMA: Algunos campos se bloquean pero otros no
disabled={isManaged}  // Input de nombre
readOnly={isManaged}  // Textarea de contenido

// SOLUCIÓN: Bloquear consistentemente todos los inputs editables
```

### 2. **Preview Picker Sin Cierre Automático**
```typescript
// PROBLEMA: Modal de preview no se cierra al hacer clic fuera
// SOLUCIÓN: Implementar click outside handler
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (previewPickerRef.current && !previewPickerRef.current.contains(event.target as Node)) {
      setPreviewPickerOpen(false);
    }
  };
  
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [previewPickerRef]);
```

### 3. **Formato de Variables No Documentado**
```typescript
// PROBLEMA: No está claro qué variables se pueden usar
// SOLUCIÓN: Documentar variables disponibles y formato
/*
Variables disponibles:
- {{user_name}} - Nombre del usuario
- {{company}} - Nombre de la empresa  
- {{context}} - Contexto de la conversación
- {{date}} - Fecha actual
- {{time}} - Hora actual
*/
```

---

## 🔌 Dependencias y Hooks

### Librerías Externas
```typescript
import ReactMarkdown from 'react-markdown';      // Renderizado Markdown
import remarkGfm from 'remark-gfm';              // GitHub Flavored Markdown
import rehypeSanitize from 'rehype-sanitize';    // Seguridad en HTML
import { Info, Sparkles } from 'lucide-react';   // Iconos
```

### Componentes UI
- `CollapsibleSection` - Secciones colapsables
- `StatusBadge` - Badge de estado
- `Button` - Botones estandarizados

### Servicios Externos
- `onRequestPromptPreview` - Backend para preview de prompts

---

## 📊 Métricas de Uso

### Eventos Tracking
```typescript
// Eventos importantes para analytics
- 'instruction_created'
- 'instruction_updated'
- 'instruction_view_mode_changed'
- 'instruction_preview_requested'
- 'instruction_copied'
- 'instruction_downloaded'
```

### Performance
- **Render inicial:** ~30ms
- **Cambio de modo:** ~5ms
- **Preview Markdown:** ~20ms
- **Autoguardado:** ~100ms (via hook externo)

---

## 🎨 Estilos y UI

### Clases CSS Principales
```css
.instruction-detail         /* Contenedor principal */
.instruction-header        /* Header con título y acciones */
.view-mode-tabs           /* Tabs de modo de vista */
.editor-container         /* Contenedor del editor */
.preview-container        /* Contenedor del preview */
.footer-actions           /* Acciones del footer */
```

### Estados Visuales
- **Gestionado:** Banner azul y inputs deshabilitados
- **Editando:** Borde azul y foco en editor
- **Guardando:** Spinner y estado "Guardando..."
- **Error:** Borde rojo y mensaje de error

---

## 🧪 Testing

### Casos de Prueba
1. **Creación de instrucción** - Flujo completo
2. **Edición de contenido** - Todos los modos de vista
3. **Modo gestionado** - Bloqueo de edición
4. **Vista final IA** - Preview de prompt
5. **Copia y descarga** - Funcionalidades de export
6. **Autoguardado** - Estrategias de guardado
7. **Creación de asistente** - Integración con asistentes

### Tests Unitarios
```typescript
describe('InstructionDetail', () => {
  it('debe crear instrucción con contenido básico')
  it('debe cambiar entre modos de vista correctamente')
  it('deve bloquear edición cuando es gestionado')
  it('debe solicitar preview de prompt final')
  it('debe autoguardar contenido correctamente')
  it('debe copiar y descargar contenido')
})
```

---

## 🔮 Mejoras Futuras

### Planeadas
1. **Sintaxis highlighting** - En modo código
2. **Autocompletado de variables** - Sugerencias de variables
3. **Plantillas predefinidas** - Templates comunes
4. **Colaboración en tiempo real** - Edición multiusuario
5. **Versionamiento** - Historial de cambios

### Técnicas
1. **Virtual scrolling** - Para documentos largos
2. **Debouncing optimizado** - Mejorar performance de autoguardado
3. **Split view** - Código y preview lado a lado
4. **Keyboard shortcuts** - Atajos de teclado

---

## 📚 Referencias Cruzadas

### Documentación Relacionada
- **[INSTRUCTIONS_SUBSYSTEM.md](./INSTRUCTIONS_SUBSYSTEM.md)** - Contexto completo del subsistema
- **[ASSISTANTS_SUBSYSTEM.md](./ASSISTANTS_SUBSYSTEM.md)** - Sistema de asistentes
- **[RAG_SUBSYSTEM.md](./RAG_SUBSYSTEM.md)** - Sistema de conocimiento vectorizado

### Componentes Relacionados
- `InstructionsView.tsx` - Vista principal de instrucciones
- `InstructionList.tsx` - Listado de instrucciones
- `AssistantDetail.tsx` - Editor de asistentes
- `PromptPreviewModal.tsx` - Modal de preview (implícito)

### Backend Relacionado
- `/api/fluxcore/instructions` - Endpoints de instrucciones
- `/api/fluxcore/prompt-preview` - Preview de prompts
- `fluxcore_instructions` table - Schema de base de datos

### Herramientas Relacionadas
- **Template Registry** - Sistema de plantillas
- **Variable Injection** - Sistema de variables dinámicas
- **Prompt Engineering** - Mejores prácticas de prompts
