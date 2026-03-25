---
id: asset-uploader
type: smart-component
status: stable
criticality: high
location: apps/web/src/components/chat/AssetUploader.tsx
layers:
  discovery:
    status: complete
    completed_date: '2026-03-22'
    confidence: 100
    notes: Componente detectado y analizado automáticamente
  connections:
    status: pending
    completed_date: ''
    confidence: 0
    dependencies_mapped: 0
    notes: Falta mapear conexiones con hook de upload y API
  subsystem:
    status: pending
    completed_date: ''
    confidence: 0
    subsystem: ''
    purpose_validated: false
    notes: Falta asignar a subsistema de Chat Core
  operations:
    status: pending
    completed_date: ''
    confidence: 0
    guides_count: 0
    notes: Falta crear guía de uso y troubleshooting
evolution:
  current_layer: 2
  total_layers: 4
  completion_percentage: 50
  last_updated: '2026-03-22'
  next_milestone: subsystem
relationships:
  depends_on:
    - useAssetUpload
    - generateUUID
  used_by:
    - AssetBrowser
    - ChatInterface
    - MessageComposer
  similar_to:
    - FileUploader
    - MediaUploader
---

## 🎯 Propósito
(Texto pendiente)

# 📤 AssetUploader Component

**Ubicación:** `apps/web/src/components/chat/AssetUploader.tsx`
**Tipo:** Smart Component (con estado y lógica de negocio)
**Propósito:** Componente completo para subir archivos con drag & drop, preview, cola de uploads, barra de progreso y manejo de errores

---

## 🎯 **Propósito**

Componente React que implementa un sistema de subida de archivos completo con soporte para drag & drop, preview visual de archivos, cola de procesamiento, indicadores de progreso y manejo robusto de errores. Gestiona múltiples archivos simultáneamente con control de validación.

---

## 🧩 **Características Principales**

### **🎯 Drag & Drop:**
- **Zone interactiva:** Área visual para arrastrar archivos
- **Visual feedback:** Cambios de estilo durante drag over
- **File selection:** Alternativa con input de archivo tradicional
- **Multiple files:** Soporte para subir varios archivos a la vez

### **👁️ Preview de Archivos:**
- **Imágenes:** Preview local con URL.createObjectURL
- **Videos/Documentos:** Iconos representativos
- **Metadata:** Nombre, tamaño, tipo visible
- **Cleanup:** Revocación automática de URLs temporales

### **📊 Cola de Uploads:**
- **Queue management:** Sistema de cola para múltiples archivos
- **Sequential processing:** Un archivo a la vez
- **Status tracking:** Pending, uploading, success, error
- **Progress indicators:** Barras de progreso por archivo

### **⚡ Validación y Control:**
- **Size limits:** Validación de tamaño máximo configurable
- **MIME type filtering:** Restricción de tipos de archivo
- **Error handling:** Mensajes específicos por tipo de error
- **Retry mechanism:** Reintentar uploads fallidos

---

## 📊 **Estado y Datos**

### **Props (Interface):**
```typescript
interface AssetUploaderProps {
  accountId: string;                    // ID de cuenta propietaria
  onUploadComplete?: (asset: UploadedAsset) => void; // Callback éxito
  onCancel?: () => void;                // Callback cancelación
  maxSizeBytes?: number;                // Límite de tamaño (default: 100MB)
  allowedMimeTypes?: string[];          // Tipos permitidos (opcional)
  scope?: string;                       // Scope del asset (opcional)
  className?: string;                   // Classes CSS adicionales
}
```

### **Estado Interno:**
```typescript
const [isDragging, setIsDragging] = useState(false);
const [queue, setQueue] = useState<QueuedFile[]>([]);
const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
const [isProcessingQueue, setIsProcessingQueue] = useState(false);
```

### **Hooks Utilizados:**
- **`useAssetUpload`:** Hook principal para lógica de upload
- **`useState`:** Manejo de estado local de UI y cola
- **`useCallback`:** Optimización de handlers
- **`useRef`:** Referencias a input y tracking de uploads

---

## 🔄 **Flujos de Interacción**

### **📤 Flujo Principal de Upload:**
1. **Drag/Select:** Usuario arrastra o selecciona archivos
2. **Validation:** Validación de tamaño y tipo
3. **Preview:** Generación de previews locales
4. **Queue:** Archivos agregados a la cola
5. **Processing:** Upload secuencial con progreso
6. **Completion:** Callback con asset creado o error

### **🔄 Estados de la Cola:**
- **Pending:** Archivo en cola esperando procesamiento
- **Uploading:** Activamente subiendo con progreso
- **Success:** Upload completado exitosamente
- **Error:** Falló el upload con mensaje específico

### **⚠️ Manejo de Errores:**
- **Size exceeded:** "Archivo demasiado grande (límite: X)"
- **Type not allowed:** "Tipo de archivo no permitido"
- **Network error:** "Error de conexión, reintente"
- **Server error:** "Error del servidor, reintente más tarde"

---

## 🎨 **Implementación Técnica**

### **🏗️ Estructura del Componente:**
```tsx
export function AssetUploader({ accountId, onUploadComplete, onCancel, ...props }) {
  // Estado de drag & drop y cola
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  
  // Hook personalizado para upload
  const { uploadAsset, ...uploadState } = useAssetUpload();
  
  // Manejo de archivos
  const handleFiles = useCallback((files: FileList) => {
    // Validación y agregado a la cola
  }, [maxSizeBytes, allowedMimeTypes]);
  
  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => { ... });
  const handleDragLeave = useCallback((e: React.DragEvent) => { ... });
  const handleDrop = useCallback((e: React.DragEvent) => { ... });
  
  // Procesamiento de cola
  const processQueue = useCallback(async () => {
    // Lógica de upload secuencial
  }, [queue, uploadAsset]);
  
  return (
    <div className="asset-uploader">
      {/* Drag & drop zone */}
      {/* File list con previews */}
      {/* Progress indicators */}
      {/* Action buttons */}
    </div>
  );
}
```

### **🎯 Puntos Clave:**
- **Sequential uploads:** Un archivo a la vez para evitar sobrecarga
- **Memory management:** Revocación de URLs temporales
- **Error recovery:** Reintentos automáticos y manuales
- **Visual feedback:** Estados claros durante todo el proceso

---

## 🔗 **Dependencias Externas**

### **Hooks Personalizados:**
- **`useAssetUpload`:** Lógica principal de upload y progreso

### **Utilidades:**
- **`generateUUID`:** Generación de IDs únicos para cola
- **`formatBytes`:** Formateo de tamaños de archivo
- **`clsx`:** Utilidad de clases CSS condicionales

### **Iconos Lucide:**
- **UI consistente:** Upload, X, Image, FileText, Film, Music, etc.

---

## 📋 **Casos de Uso**

### **💬 Chat Interface:**
1. Usuario quiere enviar archivo en mensaje
2. AssetUploader se abre en composer
3. Arrastra imágenes o documentos
4. Preview y upload automático
5. Archivo disponible en mensaje

### **📁 Asset Management:**
1. Usuario accede a gestión de assets
2. Click en "Subir archivo"
3. Selección múltiple de documentos
4. Proceso batch con cola
5. Assets disponibles en browser

### **🎨 Template Editor:**
1. Designer necesita agregar imágenes a plantilla
2. Upload de assets específicos para template
3. Scope configurado como "template_asset"
4. Preview inmediato de imágenes
5. Integración con editor

### **🔄 Edge Cases:**
- **Archivos grandes:** Validación y rechazo amigable
- **Conexión lenta:** Indicadores de progreso detallados
- **Múltiples uploads:** Gestión ordenada de cola
- **Cancelación:** Usuario puede cancelar uploads activos

---

## 🎯 **Consideraciones de Diseño**

### **✅ Fortalezas:**
- **UX completa:** Drag & drop + selección tradicional
- **Visual feedback:** Previews y progreso en tiempo real
- **Error handling:** Mensajes específicos y recuperación
- **Memory safe:** Limpieza automática de recursos

### **⚠️ Limitaciones:**
- **Tamaño máximo:** Configurable pero limitado por browser
- **Concurrent uploads:** Secuencial, no paralelo
- **Formatos soportados:** Depende de backend
- **Offline:** No funciona sin conexión

---

## 📊 **Métricas de Uso**

### **🔍 Eventos Rastreados:**
- **Upload attempts:** Intentos de subida
- **File types:** Distribución por MIME type
- **Success rate:** Porcentaje de uploads exitosos
- **Error types:** Clasificación de fallos
- **Queue size:** Número promedio de archivos por sesión

### **📈 KPIs Relevantes:**
- **Upload speed:** Velocidad promedio por tamaño
- **User engagement:** Interacciones con drag & drop
- **Error recovery:** Tasa de reintentos exitosos
- **Processing time:** Tiempo total por archivo

---

## 🔧 **Helpers y Utilidades**

### **Detección de Tipo:**
```typescript
function getFileType(mimeType: string): FilePreview['type'] {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}
```

### **Iconos por Tipo:**
```typescript
function getFileIcon(type: FilePreview['type']) {
  switch (type) {
    case 'image': return Image;
    case 'video': return Film;
    case 'audio': return Music;
    default: return FileText;
  }
}
```

### **Generación de Preview:**
```typescript
function createPreview(file: File): Promise<string | null> {
  // URL.createObjectURL para imágenes
  // Placeholder para otros tipos
}
```

---

## 🎨 **Estados Visuales**

### **🎯 Drag & Drop Zone:**
- **Default:** Borde punteado, texto "Arrastra archivos aquí"
- **Drag Over:** Borde sólido, fondo destacado
- **Has Files:** Preview de archivos en cola

### **📊 File Item States:**
- **Pending:** Icono + nombre + tamaño
- **Uploading:** Barra de progreso animada
- **Success:** Checkmark verde + nombre del asset
- **Error:** Icono rojo + mensaje de error + retry

### **⚡ Progress Indicators:**
- **Barra de progreso:** Visual del porcentaje completado
- **Bytes transferidos:** "1.2 MB / 5.0 MB"
- **Speed indicator:** "a 2.5 MB/s" (opcional)
- **Time remaining:** Estimación de tiempo restante

---

**NOTA:** Este componente es crítico para la experiencia de usuario con manejo de archivos. Su diseño robusto con cola de procesamiento y manejo de errores asegura una experiencia confiable incluso con condiciones de red variables.


## 🔗 Capa 2: Conexiones e Interdependencias

### 📦 Dependencias (LO QUE CONSUME)
- `../../hooks/useAssetUpload`
- `../../utils/uuid`

### 🔄 Dependientes (QUIÉN LO CONSUME)
- *No hay consumidores detectados o es un entry point*

## 📦 Estado y Datos
(Texto pendiente)

## 🔄 Flujos de Interacción
(Texto pendiente)
