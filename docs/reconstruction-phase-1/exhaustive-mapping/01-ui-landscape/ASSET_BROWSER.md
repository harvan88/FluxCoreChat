---
id: "asset-browser"
type: "smart-component"
status: "draft"
criticality: "medium"
location: "apps/web/src/components/assets/AssetBrowser.tsx"

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
    notes: "Falta mapear conexiones. COMPONENTE NO INTEGRADO EN UI ACTUAL"
  
  subsystem:          # Capa 3: Subsistemas Funcionales
    status: "pending"
    completed_date: ""
    confidence: 0
    subsystem: ""
    purpose_validated: false
    notes: "Falta asignar a subsistema. NO TIENE USUARIOS ACTUALES"
  
  operations:          # Capa 4: Operación y Mantenimiento
    status: "pending"
    completed_date: ""
    confidence: 0
    guides_count: 0
    notes: "Falta crear guía. NO ES VISIBLE PARA USUARIOS"

# 📊 Métricas de Evolución
evolution:
  current_layer: 1     # Última capa completada
  total_layers: 4
  completion_percentage: 25
  last_updated: "2026-03-22"
  next_milestone: "connections"
  
# 🔗 Relaciones con otros componentes
relationships:
  depends_on: ["AssetPreview", "AssetUploader", "api", "useAuthStore"]
  used_by: []           # ⚠️ NO TIENE USUARIOS ACTUALES
  similar_to: ["FileExplorer", "MediaGallery"]

# ⚠️ ESTADO ACTUAL DEL COMPONENTE
development_status:
  phase: "desarrollado pero no integrado"
  integration_status: "none"
  ui_visibility: "hidden"
  usage: "none"
  notes: "Componente existe pero no está siendo utilizado en ninguna parte de la UI actual"
---

# 📁 AssetBrowser Component

**Ubicación:** `apps/web/src/components/assets/AssetBrowser.tsx`
**Tipo:** Smart Component (con estado y lógica de negocio)
**Propósito:** Panel completo para explorar, gestionar y operar assets de una cuenta con búsqueda, filtros, vista dual y acciones CRUD

---

## 🎯 **Propósito**

Componente React que implementa un explorador de archivos completo para gestionar assets (imágenes, documentos, videos) de una cuenta. Ofrece búsqueda avanzada, filtros múltiples, vista grid/lista, preview integrado y acciones de descarga/eliminación.

---

## 🧩 **Características Principales**

### **🔍 Búsqueda y Filtros:**
- **Búsqueda texto:** Busca por nombre de archivo con debounce
- **Filtro por scope:** Adjuntos, plantillas, planes, internos
- **Filtro por estado:** Listos, pendientes, archivados
- **Filtros toggle:** Panel colapsable para filtros avanzados

### **📊 Vista Dual:**
- **Grid view:** Vista de cuadrícula con previews visuales
- **List view:** Vista de lista con información detallada
- **Responsive:** Adaptable a diferentes tamaños de pantalla

### **⚡ Gestión de Assets:**
- **Upload integrado:** Subir archivos directamente
- **Preview:** Vista previa para imágenes y otros tipos
- **Download:** Descarga con URLs firmadas
- **Delete:** Eliminación con confirmación
- **Paginación:** Navegación por grandes volúmenes

### **🎨 UX/UI:**
- **Loading states:** Indicadores durante carga
- **Error handling:** Mensajes claros de error
- **Empty states:** Estados vacíos con call-to-action
- **Hover effects:** Overlays de acciones en grid view

---

## 📊 **Estado y Datos**

### **Props (Interface):**
```typescript
interface AssetBrowserProps {
  accountId: string;                    // ID de cuenta
  onSelectAsset?: (asset: Asset) => void; // Callback de selección
  selectionMode?: boolean;             // Modo selección
  className?: string;                  // Classes CSS adicionales
}
```

### **Estado Interno:**
```typescript
const [assets, setAssets] = useState<Asset[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [total, setTotal] = useState(0);

// Filtros
const [search, setSearch] = useState('');
const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
const [statusFilter, setStatusFilter] = useState<StatusFilter>('ready');
const [viewMode, setViewMode] = useState<ViewMode>('grid');
const [showFilters, setShowFilters] = useState(false);
const [showUploader, setShowUploader] = useState(false);

// Paginación
const [offset, setOffset] = useState(0);
```

### **Hooks Utilizados:**
- **`useState`:** Manejo de estado local del componente
- **`useEffect`:** Carga automática y debounce de búsqueda
- **`useCallback`:** Optimización de handlers
- **`useAuthStore`:** Obtener usuario actual para descargas

---

## 🔄 **Flujos de Interacción**

### **🚀 Flujo Principal:**
1. **Mount:** Carga assets con filtros por defecto
2. **Search:** Usuario escribe → debounce → búsqueda
3. **Filter:** Cambio de filtros → recarga automática
4. **View Mode:** Toggle entre grid/list
5. **Actions:** Download/Delete con confirmación
6. **Pagination:** Navegación por páginas

### **🔄 Estados de Carga:**
- **Initial loading:** Spinner al cargar primera vez
- **Search loading:** Indicador durante búsqueda
- **Action loading:** Feedback en descarga/eliminación
- **Pagination loading:** Carga de nuevas páginas

### **⚠️ Manejo de Errores:**
- **API errors:** Mensaje de error con botón de retry
- **Download errors:** Alert con mensaje específico
- **Delete errors:** Alert de confirmación fallida
- **Network errors:** Manejo genérico con retry

---

## 🎨 **Implementación Técnica**

### **🏗️ Estructura del Componente:**
```tsx
export function AssetBrowser({ accountId, onSelectAsset, selectionMode, className }) {
  // Estado principal
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filtros y configuración
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Carga de datos
  const loadAssets = useCallback(async (resetOffset = false) => {
    // Lógica de paginación y filtros
  }, [accountId, scopeFilter, statusFilter, search, offset]);
  
  // Handlers de acciones
  const handleDelete = useCallback(async (asset: Asset) => { ... });
  const handleDownload = useCallback(async (asset: Asset) => { ... };
  
  // Renderizado condicional
  return (
    <div className="flex flex-col h-full">
      {/* Header con búsqueda y controles */}
      {/* Uploader integrado */}
      {/* Content con grid/list view */}
      {/* Footer con paginación */}
    </div>
  );
}
```

### **🎯 Puntos Clave:**
- **Debounce search:** 300ms para evitar llamadas excesivas
- **Optimización con useCallback:** Previene re-renders innecesarios
- **Responsive grid:** 2-5 columnas según breakpoint
- **URL signing:** Descargas seguras con URLs firmadas
- **Selection mode:** Modo opcional para seleccionar assets

---

## 🔗 **Dependencias Externas**

### **Componentes Hijos:**
- **`AssetPreview`:** Preview de imágenes y archivos
- **`AssetUploader`:** Componente de subida de archivos

### **Servicios:**
- **`api.searchAssets`:** Búsqueda y filtrado de assets
- **`api.deleteAsset`:** Eliminación de assets
- **`api.signAssetUrl`:** Generación de URLs firmadas

### **Stores:**
- **`useAuthStore`:** Estado de autenticación global

### **Utilidades:**
- **`clsx`:** Utilidad de clases CSS condicionales
- **Iconos Lucide:** UI consistente

---

## 📋 **Casos de Uso**

### **👤 Usuario Standard:**
1. Accede a gestión de assets
2. Busca archivo específico
3. Filtra por tipo/estado
4. Descarga archivo necesario
5. Sube nuevo archivo

### **👨‍💼 Administrador:**
1. Revisa todos los assets del sistema
2. Elimina archivos obsoletos
3. Archiva assets en desuso
4. Monitorea espacio utilizado

### **🎨 Designer:**
1. Sube imágenes para plantillas
2. Busca assets existentes
3. Previsualiza antes de usar
4. Selecciona assets para proyectos

### **🔄 Edge Cases:**
- **Sin conexión:** Muestra error con retry
- **Archivos grandes:** Manejo timeouts y límites
- **Permisos denegados:** Mensaje de error específico
- **Cuota excedida:** Indicador de límite alcanzado

---

## 🎯 **Consideraciones de Diseño**

### **✅ Fortalezas:**
- **UX completa:** Todas las operaciones necesarias disponibles
- **Performance:** Debounce, paginación, lazy loading
- **Responsive:** Funciona en todos los dispositivos
- **Accesible:** Navegación por teclado y lectores de pantalla

### **⚠️ Limitaciones:**
- **Tamaño de archivo:** No maneja uploads muy grandes
- **Formatos soportados:** Depende del backend
- **Concurrent uploads:** Solo un upload a la vez
- **Offline:** No funciona sin conexión

---

## 📊 **Métricas de Uso**

### **🔍 Eventos Rastreados:**
- **Búsquedas:** Queries y resultados
- **Filtros aplicados:** Cambios en filtros
- **Downloads:** Archivos descargados
- **Deletes:** Archivos eliminados
- **Uploads:** Archivos subidos

### **📈 KPIs Relevantes:**
- **Tiempo de búsqueda:** Velocidad de respuesta
- **Tasa de conversión:** Downloads por vista
- **Uso de filtros:** Efectividad de filtros
- **Errores por acción:** Tasa de fallos

---

## 🔧 **Helpers y Utilidades**

### **Iconos por MIME Type:**
```typescript
function getAssetIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.startsWith('video/')) return Film;
  if (mimeType.startsWith('audio/')) return Music;
  return FileText;
}
```

### **Formateo de Bytes:**
```typescript
function formatBytes(bytes: number): string {
  // Convierte bytes a KB/MB/GB legibles
}
```

### **Formateo de Fechas:**
```typescript
function formatDate(dateStr: string): string {
  // Formato localizado en español
}
```

---

**NOTA:** Este componente es central para la gestión de archivos en el sistema. Su rendimiento y usabilidad impactan directamente la experiencia del usuario con manejo de medios y documentos.
