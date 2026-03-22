---
id: "asset-preview"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/chat/AssetPreview.tsx"

# 🎯 SISTEMA DE CAPAS - EVOLUCIÓN DE DOCUMENTACIÓN
layers:
  discovery:           # Capa 1: Descubrimiento Atómico
    status: "complete"
    completed_date: "2026-03-22"
    confidence: 100
    notes: "Componente detectado y analizado automáticamente"
  
  connections:         # Capa 2: Conexiones e Interdependencias
    status: "pending"
    completed_date: ""
    confidence: 0
    dependencies_mapped: 0
    notes: "Falta mapear conexiones con API de assets"
  
  subsystem:          # Capa 3: Subsistemas Funcionales
    status: "pending"
    completed_date: ""
    confidence: 0
    subsystem: ""
    purpose_validated: false
    notes: "Falta asignar a subsistema de Chat Core"
  
  operations:          # Capa 4: Operación y Mantenimiento
    status: "pending"
    completed_date: ""
    confidence: 0
    guides_count: 0
    notes: "Falta crear guía de uso y troubleshooting"

# 📊 Métricas de Evolución
evolution:
  current_layer: 1     # Última capa completada
  total_layers: 4
  completion_percentage: 25
  last_updated: "2026-03-22"
  next_milestone: "connections"
  
# 🔗 Relaciones con otros componentes
relationships:
  depends_on: ["api", "useAuthStore"]
  used_by: ["AssetBrowser", "MessageBubble", "ChatInterface"]
  similar_to: ["FilePreview", "MediaViewer"]
---

# 🖼️ AssetPreview Component

**Ubicación:** `apps/web/src/components/chat/AssetPreview.tsx`
**Tipo:** Smart Component (con estado y lógica de negocio)
**Propósito:** Componente polimórfico para mostrar preview de diferentes tipos de assets (imágenes, videos, audio, documentos) con descarga y lightbox

---

## 🎯 **Propósito**

Componente React que renderiza previews adaptativos según el tipo de asset (MIME type). Soporta imágenes con lightbox, videos con controles nativos, audio con player y documentos con iconos representativos. Maneja URLs firmadas seguras y acciones de descarga.

---

## 🧩 **Características Principales**

### **🎨 Renderizado Polimórfico:**
- **Imágenes:** Preview con lightbox fullscreen al hacer click
- **Videos:** Player nativo con controles y carga lazy
- **Audio:** Player HTML5 con botones de descarga/abrir
- **Documentos:** Icono + metadata con acciones de descarga

### **🔐 Seguridad:**
- **URLs firmadas:** Genera URLs temporales seguras
- **Validación de usuario:** Requiere autenticación activa
- **Lazy loading:** Carga solo cuando es necesario

### **⚡ Performance:**
- **Carga bajo demanda:** Solo carga imágenes automáticamente
- **Cache de URLs:** Evita llamadas repetidas
- **Loading states:** Indicadores visuales durante carga

### **🎨 UX/UI:**
- **Compact mode:** Versión reducida para espacios limitados
- **Error handling:** Estados claros de error
- **Responsive:** Adaptable a diferentes contextos
- **Accesible:** Navegación por teclado y lectores

---

## 📊 **Estado y Datos**

### **Props (Interface):**
```typescript
interface AssetPreviewProps {
  assetId: string;           // ID único del asset
  accountId: string;         // ID de cuenta propietaria
  name: string;              // Nombre del archivo
  mimeType: string;          // MIME type para determinar tipo
  sizeBytes: number;         // Tamaño en bytes
  className?: string;        // Classes CSS adicionales
  showDownload?: boolean;    // Mostrar botón de descarga
  compact?: boolean;         // Modo compacto
  typeHint?: AssetType;      // Hint de tipo (opcional)
}
```

### **Estado Interno:**
```typescript
const [signedUrl, setSignedUrl] = useState<string | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [lightboxOpen, setLightboxOpen] = useState(false);
```

### **Hooks Utilizados:**
- **`useState`:** Manejo de estado local de URLs y UI
- **`useEffect`:** Carga automática de imágenes
- **`useCallback`:** Optimización de handlers
- **`useAuthStore`:** Obtener usuario actual para URLs firmadas

---

## 🔄 **Flujos de Interacción**

### **🖼️ Flujo de Imagen:**
1. **Mount:** Detecta tipo image → carga URL automáticamente
2. **Loading:** Muestra spinner mientras carga
3. **Click:** Abre lightbox fullscreen
4. **Close:** Cierra lightbox con click o botón X

### **🎥 Flujo de Video/Audio:**
1. **Mount:** Muestra botón de carga
2. **Click:** Usuario hace click → carga URL firmada
3. **Load:** Renderiza player nativo con controles
4. **Actions:** Botones de descarga/abrir disponibles

### **📄 Flujo de Documento:**
1. **Mount:** Renderiza icono + metadata inmediatamente
2. **Download:** Click en descarga → genera URL firmada
3. **Open:** Click en abrir → abre en nueva pestaña

### **⚠️ Manejo de Errores:**
- **No autenticado:** Mensaje de error claro
- **URL fallida:** Indicador de error con retry implícito
- **Network error:** Mensaje genérico de error

---

## 🎨 **Implementación Técnica**

### **🏗️ Estructura del Componente:**
```tsx
export function AssetPreview({ assetId, accountId, name, mimeType, sizeBytes, ...props }) {
  // Estado para URL firmada y UI
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  // Determinar tipo de asset
  const assetType = typeHint ?? getAssetType(mimeType);
  
  // Obtener URL firmada (lazy loading)
  const fetchSignedUrl = useCallback(async () => {
    // Lógica de API con seguridad
  }, [assetId, accountId, signedUrl, currentUserId, assetType]);
  
  // Carga automática para imágenes
  useEffect(() => {
    if (assetType === 'image' && !signedUrl && !loading && !error) {
      fetchSignedUrl();
    }
  }, [assetType, signedUrl, loading, error, fetchSignedUrl]);
  
  // Renderizado polimórfico
  const renderContent = () => {
    switch (assetType) {
      case 'image': return renderImage();
      case 'video': return renderVideo();
      case 'audio': return renderAudio();
      default: return renderDocument();
    }
  };
  
  return <div className={clsx('asset-preview', className)}>{renderContent()}</div>;
}
```

### **🎯 Puntos Clave:**
- **Detección automática:** MIME type → tipo de renderizado
- **Lazy loading:** Solo carga imágenes automáticamente
- **URL caching:** Evita múltiples llamadas API
- **Polimorfismo:** Un componente para múltiples tipos
- **Security first:** URLs firmadas con validación de usuario

---

## 🔗 **Dependencias Externas**

### **Servicios:**
- **`api.signAssetUrl`:** Generación de URLs firmadas seguras

### **Stores:**
- **`useAuthStore`:** Estado de autenticación global

### **Utilidades:**
- **`clsx`:** Utilidad de clases CSS condicionales
- **Iconos Lucide:** UI consistente (ImageIcon, Film, Music, etc.)

---

## 📋 **Casos de Uso**

### **💬 Chat Interface:**
1. Usuario envía mensaje con archivo adjunto
2. AssetPreview muestra preview inline
3. Click en imagen → lightbox fullscreen
4. Descarga disponible para todos los tipos

### **📁 Asset Browser:**
1. Lista de assets en grid view
2. AssetPreview compact para thumbnails
3. Click para preview completo
4. Acciones de gestión disponibles

### **📝 Message History:**
1. Mensajes históricos con archivos
2. Preview sin carga automática (excepto imágenes)
3. Download on-demand para videos/audio
4. Documentos con metadata visible

### **🔄 Edge Cases:**
- **Archivos grandes:** Manejo de timeouts en carga
- **Formatos no soportados:** Fallback a documento genérico
- **URLs expiradas:** Recarga automática si falla
- **Permisos denegados:** Mensaje de error específico

---

## 🎯 **Consideraciones de Diseño**

### **✅ Fortalezas:**
- **Polimorfismo inteligente:** Un componente para todos los tipos
- **Seguridad integrada:** URLs firmadas y validación
- **Performance optimizado:** Lazy loading y caching
- **UX completa:** Lightbox, descargas, estados de carga

### **⚠️ Limitaciones:**
- **Dependencia de API:** Requiere backend funcional
- **Formatos limitados:** Solo los soportados por el browser
- **Tamaño de archivos:** No maneja archivos muy grandes
- **Offline:** No funciona sin conexión

---

## 📊 **Métricas de Uso**

### **🔍 Eventos Rastreados:**
- **Previews cargados:** Por tipo de asset
- **Lightbox abierto:** Interacciones con imágenes
- **Downloads:** Archivos descargados
- **Errores de carga:** Fallos por tipo

### **📈 KPIs Relevantes:**
- **Tiempo de carga:** Velocidad de preview
- **Tasa de interacción:** Clicks en previews
- **Uso de descargas:** Popularidad por tipo
- **Error rate:** Fiabilidad del componente

---

## 🔧 **Helpers y Utilidades**

### **Detección de Tipo:**
```typescript
function getAssetType(mimeType: string): AssetType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}
```

### **Iconos por Tipo:**
```typescript
function getAssetIcon(type: AssetType) {
  switch (type) {
    case 'image': return ImageIcon;
    case 'video': return Film;
    case 'audio': return Music;
    default: return FileText;
  }
}
```

### **Formateo de Metadata:**
```typescript
function formatBytes(bytes: number): string {
  // Convierte bytes a formato legible
}

function getFileExtension(name: string): string {
  // Extrae extensión del nombre
}
```

---

## 🎨 **Variantes de Renderizado**

### **🖼️ Image Preview:**
- **Auto-load:** Carga automática al montar
- **Lightbox:** Fullscreen con overlay
- **Responsive:** Max-width/height según modo
- **Error state:** Placeholder con retry

### **🎥 Video Preview:**
- **Click-to-load:** Botón para cargar URL
- **Native controls:** Player HTML5 completo
- **Compact mode:** Tamaño reducido opcional
- **Fallback:** Mensaje si no soportado

### **🎵 Audio Preview:**
- **Player integrado:** Controles nativos
- **Actions panel:** Botones de descarga/abrir
- **Metadata visible:** Nombre y tamaño
- **Loading state:** Spinner durante carga

### **📄 Document Preview:**
- **Icon + metadata:** Visual inmediato
- **Extension badge:** Tipo de archivo visible
- **Action buttons:** Descarga y abrir externo
- **Compact mode:** Diseño reducido disponible

---

**NOTA:** Este componente es fundamental para la experiencia de usuario con archivos multimedia. Su diseño polimórfico reduce la complejidad del sistema mientras mantiene una UX consistente across todos los tipos de assets.
