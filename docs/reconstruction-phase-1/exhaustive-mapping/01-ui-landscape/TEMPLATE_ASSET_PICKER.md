---
id: "template-asset-picker"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/templates/TemplateAssetPicker.tsx"
---

# TemplateAssetPicker - Gestión de Archivos Adjuntos

## 📋 Resumen Ejecutivo

`TemplateAssetPicker` es el componente UI especializado para la gestión de archivos adjuntos en plantillas. Implementa el principio UI-First proporcionando una experiencia completa para subir, vincular, previsualizar y gestionar archivos asociados a plantillas.

**Archivo:** `apps/web/src/components/templates/TemplateAssetPicker.tsx`  
**Dominio:** ChatCore (Core System)  
**Principio:** UI-First - Experiencia del usuario como centro

---

## 🎯 Propósito y Responsabilidades

### Propósito Principal
Proporcionar una interfaz completa para gestionar archivos adjuntos de plantillas, incluyendo subida de nuevos archivos, vinculación de assets existentes, preview de archivos, y organización por slots/categorías.

### Responsabilidades
- **Upload de archivos:** Subida directa al sistema de assets
- **Vinculación:** Conectar assets existentes a plantillas
- **Preview:** Vista previa de imágenes y documentos
- **Gestión de slots:** Organización por categorías
- **Validación:** Tipos de archivo y tamaños permitidos
- **Eliminación:** Desvinculación y eliminación de assets

---

## 🏗️ Arquitectura del Componente

### Estructura Principal
```typescript
export default function TemplateAssetPicker({
  accountId,
  templateId,
  onAssetsChange,
  maxFiles = 5,
  allowedTypes = ['image/*', 'application/pdf', 'text/*']
}: TemplateAssetPickerProps) {
  const [assets, setAssets] = useState<TemplateAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>('general');
}
```

### Hooks Utilizados
- **`useTemplateAssets(templateId, accountId)`**: Obtiene assets vinculados
- **`useAssetUpload()`**: Hook para subida de archivos
- **`useState`**: Gestión de estado local
- **`useCallback`**: Optimización de callbacks

---

## 🎨 UI Components y Flujo de Usuario

### 1. Layout Principal
```typescript
<div className="space-y-4">
  {/* Header con información */}
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-lg font-medium text-gray-900">Archivos Adjuntos</h3>
      <p className="text-sm text-gray-500">
        {assets.length}/{maxFiles} archivos agregados
      </p>
    </div>
    
    <div className="flex gap-2">
      <button
        onClick={() => setShowAssetLibrary(true)}
        className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
      >
        <FolderOpen className="w-4 h-4 mr-1" />
        Biblioteca
      </button>
    </div>
  </div>
  
  {/* Área de upload */}
  <AssetUploadZone
    onUpload={handleUpload}
    uploading={uploading}
    progress={uploadProgress}
    maxFiles={maxFiles}
    allowedTypes={allowedTypes}
  />
  
  {/* Lista de assets */}
  <AssetList
    assets={assets}
    onRemove={handleRemove}
    onPreview={handlePreview}
    onSlotChange={handleSlotChange}
  />
</div>
```

### 2. Zona de Upload
```typescript
const AssetUploadZone = ({ onUpload, uploading, progress, maxFiles, allowedTypes }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onUpload(files);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = () => {
    setIsDragOver(false);
  };
  
  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        isDragOver 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
      } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {uploading ? (
        <div className="space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">Subiendo archivo...</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{progress}%</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Upload className="w-8 h-8 mx-auto text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Arrastra archivos aquí o haz click para seleccionar
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Máximo {maxFiles} archivos. Formatos: {allowedTypes.join(', ')}
            </p>
          </div>
          <input
            type="file"
            multiple
            accept={allowedTypes.join(',')}
            onChange={(e) => e.target.files && onUpload(Array.from(e.target.files))}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
          >
            Seleccionar Archivos
          </label>
        </div>
      )}
    </div>
  );
};
```

### 3. Lista de Assets
```typescript
const AssetList = ({ assets, onRemove, onPreview, onSlotChange }) => {
  return (
    <div className="space-y-3">
      {assets.map(asset => (
        <AssetItem
          key={asset.assetId}
          asset={asset}
          onRemove={onRemove}
          onPreview={onPreview}
          onSlotChange={onSlotChange}
        />
      ))}
    </div>
  );
};

const AssetItem = ({ asset, onRemove, onPreview, onSlotChange }) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      {/* Preview/Icon */}
      <div className="flex-shrink-0 w-12 h-12 bg-white rounded border flex items-center justify-center">
        {asset.mimeType?.startsWith('image/') ? (
          <img
            src={asset.url}
            alt={asset.name}
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <FileText className="w-6 h-6 text-gray-400" />
        )}
      </div>
      
      {/* Información */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {asset.name}
          </h4>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
            {formatFileSize(asset.sizeBytes)}
          </span>
        </div>
        
        {/* Slot selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Slot:</label>
          <select
            value={asset.slot || 'general'}
            onChange={(e) => onSlotChange(asset.assetId, e.target.value)}
            className="text-xs px-2 py-1 border rounded"
          >
            <option value="general">General</option>
            <option value="header">Header</option>
            <option value="footer">Footer</option>
            <option value="attachment">Adjunto</option>
            <option value="gallery">Galería</option>
          </select>
        </div>
      </div>
      
      {/* Acciones */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPreview(asset)}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
          title="Previsualizar"
        >
          <Eye className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => onRemove(asset.assetId)}
          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
          title="Eliminar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
```

---

## 🔧 Funcionalidades Clave

### 1. Upload de Archivos
```typescript
const handleUpload = async (files: File[]) => {
  if (assets.length + files.length > maxFiles) {
    setError(`Solo puedes agregar máximo ${maxFiles} archivos`);
    return;
  }
  
  setUploading(true);
  setError(null);
  
  try {
    const uploadPromises = files.map(async (file) => {
      // Validar tipo de archivo
      if (!isAllowedType(file.type, allowedTypes)) {
        throw new Error(`Tipo de archivo no permitido: ${file.type}`);
      }
      
      // Validar tamaño (ej: 10MB máximo)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(`Archivo demasiado grande: ${file.name}`);
      }
      
      // Subir archivo
      const uploadedAsset = await uploadAsset(file, accountId, {
        onProgress: (progress) => setUploadProgress(progress)
      });
      
      // Vincular a plantilla
      await linkAsset(accountId, templateId, uploadedAsset.assetId, 'general');
      
      return uploadedAsset;
    });
    
    const uploadedAssets = await Promise.all(uploadPromises);
    
    // Actualizar estado local
    setAssets(prev => [...prev, ...uploadedAssets]);
    onAssetsChange?.([...assets, ...uploadedAssets]);
    
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Error al subir archivos');
  } finally {
    setUploading(false);
    setUploadProgress(0);
  }
};
```

### 2. Vinculación de Assets Existentes
```typescript
const AssetLibraryModal = ({ isOpen, onClose, onSelect }) => {
  const [libraryAssets, setLibraryAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      loadLibraryAssets();
    }
  }, [isOpen]);
  
  const loadLibraryAssets = async () => {
    try {
      setLoading(true);
      const assets = await getAccountAssets(accountId);
      setLibraryAssets(assets.filter(asset => 
        !assets.some(linked => linked.assetId === asset.assetId)
      ));
    } catch (error) {
      console.error('Error loading library assets:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-lg font-medium mb-4">Biblioteca de Archivos</h2>
        
        {/* Búsqueda */}
        <input
          type="text"
          placeholder="Buscar archivos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg mb-4"
        />
        
        {/* Grid de assets */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
          {libraryAssets
            .filter(asset => 
              asset.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map(asset => (
              <AssetLibraryItem
                key={asset.assetId}
                asset={asset}
                onSelect={() => onSelect(asset)}
              />
            ))}
        </div>
      </div>
    </Modal>
  );
};
```

### 3. Preview de Archivos
```typescript
const AssetPreviewModal = ({ asset, isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">{asset.name}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Preview según tipo */}
        {asset.mimeType?.startsWith('image/') ? (
          <div className="text-center">
            <img
              src={asset.url}
              alt={asset.name}
              className="max-w-full max-h-96 mx-auto rounded"
            />
          </div>
        ) : asset.mimeType === 'application/pdf' ? (
          <div className="text-center">
            <iframe
              src={asset.url}
              className="w-full h-96 rounded"
              title={asset.name}
            />
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Vista previa no disponible</p>
            <a
              href={asset.url}
              download={asset.name}
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mt-4"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar
            </a>
          </div>
        )}
        
        {/* Información del archivo */}
        <div className="mt-4 pt-4 border-t">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-gray-500">Tipo:</dt>
              <dd className="font-medium">{asset.mimeType}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Tamaño:</dt>
              <dd className="font-medium">{formatFileSize(asset.sizeBytes)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Subido:</dt>
              <dd className="font-medium">{new Date(asset.createdAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Slot:</dt>
              <dd className="font-medium">{asset.slot || 'general'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </Modal>
  );
};
```

### 4. Eliminación de Assets
```typescript
const handleRemove = async (assetId: string) => {
  // Confirmación
  if (!confirm('¿Estás seguro de que quieres eliminar este archivo de la plantilla?')) {
    return;
  }
  
  try {
    // Desvincular de plantilla
    await unlinkAsset(accountId, templateId, assetId);
    
    // Opcional: eliminar asset si no está usado en otros lugares
    const asset = assets.find(a => a.assetId === assetId);
    if (asset && !isAssetUsedElsewhere(assetId)) {
      await deleteAsset(assetId, accountId);
    }
    
    // Actualizar estado local
    const updatedAssets = assets.filter(a => a.assetId !== assetId);
    setAssets(updatedAssets);
    onAssetsChange?.(updatedAssets);
    
  } catch (error) {
    setError('Error al eliminar archivo');
  }
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
      <span className="text-sm text-gray-500">Cargando archivos...</span>
    </div>
  );
}

// Empty state
if (assets.length === 0) {
  return (
    <div className="text-center py-8">
      <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
      <p className="text-sm text-gray-500 mb-4">
        No hay archivos adjuntos
      </p>
      <p className="text-xs text-gray-400">
        Arrastra archivos o usa la biblioteca para agregar
      </p>
    </div>
  );
}
```

### Manejo de Errores
```typescript
const [error, setError] = useState<string | null>(null);

// Error boundary
if (error) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center">
        <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
        <div>
          <p className="text-sm font-medium text-red-800">Error</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
        <button
          onClick={() => setError(null)}
          className="ml-auto text-red-500 hover:text-red-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
```

---

## 🎯 Experiencia de Usuario (UX)

### Principios UX
- **Drag & Drop:** Intuitivo y familiar
- **Feedback visual:** Estados de carga y progreso
- **Preview inmediato:** Vista previa de archivos
- **Organización:** Slots para categorización
- **Accesibilidad:** Navegación por teclado

### Flujos de Usuario
1. **Upload:** Arrastra archivos → upload automático
2. **Biblioteca:** Click en "Biblioteca" → selecciona existente
3. **Preview:** Click en ojo → vista previa modal
4. **Organización:** Select de slot → categorización
5. **Eliminación:** Click en basurero → confirmación

### Micro-interacciones
- **Drag over feedback:** Cambio de estilo al arrastrar
- **Upload progress:** Barra de progreso animada
- **Hover states:** Feedback visual en botones
- **Modal animations:** Transiciones suaves
- **Error states:** Mensajes claros y recuperables

---

## 🔌 Integraciones

### Servicios Externos
- **`uploadAsset(file, accountId, options)`**: Subida de archivos
- **`linkAsset(accountId, templateId, assetId, slot)`**: Vinculación
- **`unlinkAsset(accountId, templateId, assetId, slot)`**: Desvinculación
- **`deleteAsset(assetId, accountId)`**: Eliminación de asset
- **`getAccountAssets(accountId)`**: Obtener assets de cuenta

### Componentes Internos
- **`Modal`**: Componente genérico de modales
- **`AssetPreview`**: Preview de archivos
- **`AssetLibrary`**: Biblioteca de assets existentes

### Eventos y Callbacks
- **`onAssetsChange(assets)`**: Cambio en lista de assets
- **`onUpload(file)`**: Subida de archivo
- **`onRemove(assetId)`**: Eliminación de asset
- **`onPreview(asset)`**: Preview de asset

---

## 📈 Performance y Optimización

### Optimizaciones Implementadas
- **Lazy loading:** Carga assets bajo demanda
- **Thumbnails:** Generación de miniaturas para imágenes
- **Compression:** Compresión de imágenes en upload
- **Caching:** Cache de URLs de assets

### Consideraciones de Performance
```typescript
// Memoización de lista de assets
const assetList = useMemo(() => {
  return assets.map(asset => ({
    ...asset,
    thumbnailUrl: getThumbnailUrl(asset.url)
  }));
}, [assets]);

// Lazy loading de previews
const loadPreview = useCallback(async (assetId: string) => {
  if (!loadedPreviews.has(assetId)) {
    const preview = await generatePreview(assetId);
    setLoadedPreviews(prev => new Map(prev.set(assetId, preview)));
  }
}, []);
```

---

## 🐛 Problemas Conocidos y Limitaciones

### Problemas Actuales
- **Sin validación avanzada:** No hay validación de contenido
- **Sin edición:** No se puede editar assets después de subidos
- **Sin versionado:** No hay control de versiones
- **Sin metadatos:** No hay campos personalizados

### Mejoras Futuras
1. **Validación avanzada:** Verificación de contenido malicioso
2. **Edición de assets:** Recorte de imágenes, edición de PDFs
3. **Versionado:** Control de versiones de assets
4. **Metadatos personalizados:** Campos adicionales por tipo
5. **Batch operations:** Operaciones masivas

---

## 🧪 Testing

### Casos de Test Recomendados
1. **Upload:** Subida de archivos funciona
2. **Drag & Drop:** Arrastrar archivos funciona
3. **Preview:** Vista previa se muestra correctamente
4. **Eliminación:** Eliminación con confirmación
5. **Slots:** Cambio de slot se guarda
6. **Validación:** Tipos y tamaños de archivo

### Ejemplo de Test
```typescript
describe('TemplateAssetPicker', () => {
  it('debe subir archivos correctamente', async () => {
    const mockUpload = jest.fn().mockResolvedValue({ assetId: 'asset-1' });
    const mockLink = jest.fn().mockResolvedValue({});
    
    render(
      <TemplateAssetPicker 
        accountId="test" 
        templateId="test" 
        onAssetsChange={jest.fn()}
      />
    );
    
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText('Seleccionar Archivos');
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith(file, 'test', expect.any(Object));
      expect(mockLink).toHaveBeenCalledWith('test', 'test', 'asset-1', 'general');
    });
  });
  
  it('debe mostrar preview de imágenes', async () => {
    const asset = {
      assetId: 'asset-1',
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      url: 'http://example.com/test.jpg'
    };
    
    render(
      <TemplateAssetPicker 
        accountId="test" 
        templateId="test" 
        onAssetsChange={jest.fn()}
      />
    );
    
    // Simular asset existente
    fireEvent.click(screen.getByText('Biblioteca'));
    fireEvent.click(screen.getByText('test.jpg'));
    
    await waitFor(() => {
      expect(screen.getByAltText('test.jpg')).toBeInTheDocument();
    });
  });
});
```

---

## 📝 Notas de Mantenimiento

### Puntos Clave para Mantenimiento
- **Estado de sincronización:** Mantener consistencia con servidor
- **Upload progress:** Actualizar correctamente durante upload
- **Error handling:** Manejo robusto de errores de red
- **Memory management:** Limpiar URLs de blobs

### Dependencias
- **React hooks:** useState, useEffect, useMemo, useCallback
- **UI library:** Componentes de diseño (TailwindCSS)
- **Icons:** Librería de iconos (Lucide React)
- **Services:** API hooks personalizados

---

## 🎯 Conclusión

`TemplateAssetPicker` es un componente completo y robusto que proporciona una excelente experiencia para la gestión de archivos adjuntos en plantillas. Con drag & drop, preview inmediato, y organización por slots, ofrece todas las funcionalidades necesarias para una gestión eficiente de assets.

**Estado:** ✅ **PRODUCCIÓN READY** - Funcional, estable, y optimizado para UX.

**Próximos Pasos:**
1. Implementar validación avanzada de contenido
2. Agregar edición básica de imágenes
3. Incluir metadatos personalizados
4. Mejorar performance con muchos archivos
