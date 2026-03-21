---
id: "rag-config-section"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/fluxcore/components/RAGConfigSection.tsx"
---

# RAGCONFIGSECTION.md

**Componente:** RAGConfigSection.tsx  
**Subsistema:** [RAG_SUBSYSTEM.md](./RAG_SUBSYSTEM.md)  
**Fecha:** 2026-03-19  
**Versión:** v8.3  

---

## 📍 Ubicación
`apps/web/src/components/fluxcore/components/RAGConfigSection.tsx`

## 🎯 Propósito
Sección de configuración granular para Vector Stores RAG (Retrieval Augmented Generation). Permite ajustar parámetros de chunking, embedding y retrieval para optimizar la búsqueda y recuperación de documentos vectorizados.

## 📏 Tamaño
**Líneas de código:** 371 líneas  
**Complejidad:** Media - Configuración con múltiples secciones colapsables y autoguardado

## 🔗 Ver Documentación Completa
Para entender el contexto completo del subsistema RAG, ver: **[RAG_SUBSYSTEM.md](./RAG_SUBSYSTEM.md)**

---

## 🏗️ Estructura del Componente

### Props Principales
```typescript
interface RAGConfigSectionProps {
  vectorStoreId: string;                    // ID del vector store
  accountId: string;                        // ID de la cuenta
  onConfigChange?: (config: RAGConfig) => void;  // Callback de cambios
}
```

### Estado Interno
```typescript
const [config, setConfig] = useState<RAGConfig>(DEFAULT_CONFIG);
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [saveError, setSaveError] = useState<string | null>(null);
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const latestConfigRef = useRef<RAGConfig>(DEFAULT_CONFIG);
```

### Configuración por Defecto
```typescript
const DEFAULT_CONFIG: RAGConfig = {
  chunking: {
    enabled: true,
    strategy: 'recursive',
    sizeTokens: 500,
    overlapTokens: 50,
  },
  embedding: {
    enabled: true,
    provider: 'openai',
    model: 'text-embedding-3-small',
  },
  retrieval: {
    enabled: true,
    topK: 5,
    minScore: 0.3,      // ⚠️ CORREGIDO de 0.700
    maxTokens: 2000,
  },
};
```

---

## ⚙️ Secciones de Configuración

### 1. Fragmentación de Texto (Chunking)
```typescript
// Estrategias disponibles
const CHUNKING_STRATEGIES = [
  { value: 'fixed', label: 'Tamaño fijo', description: 'Divide en chunks de tamaño uniforme' },
  { value: 'recursive', label: 'Recursivo', description: 'Divide por separadores jerárquicos' },
  { value: 'sentence', label: 'Por oraciones', description: 'Agrupa oraciones completas' },
  { value: 'paragraph', label: 'Por párrafos', description: 'Mantiene párrafos intactos' },
];

// Configuración ajustable
- Estrategia: fixed | recursive | sentence | paragraph
- Tamaño de fragmento: 100-2000 tokens (slider)
- Solapamiento: 0-200 tokens (slider)
```

### 2. Modelo de Embeddings
```typescript
// Proveedores disponibles
const EMBEDDING_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', models: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'] },
  { value: 'cohere', label: 'Cohere', models: ['embed-english-v3.0', 'embed-multilingual-v3.0'] },
  { value: 'local', label: 'Local', models: ['all-MiniLM-L6-v2'] },
];

// Configuración dinámica
- Proveedor: openai | cohere | local
- Modelo: Según proveedor seleccionado
```

### 3. Recuperación (Retrieval)
```typescript
// Parámetros de búsqueda
- Top K: 1-20 fragmentos a recuperar (slider)
- Similitud mínima: 0.1-0.7 (slider) ⚠️ RANGO CORREGIDO
- Tokens máximos: 500-8000 tokens en respuesta (slider)
```

---

## 🔧 Comportamientos Clave

### Autoguardado con Debounce
```typescript
// Estrategia de autoguardado para evitar demasiadas peticiones
const debouncedSave = useCallback((newConfig: RAGConfig) => {
  latestConfigRef.current = newConfig;
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
    persistConfig(latestConfigRef.current);
  }, 600);  // 600ms de debounce
}, [persistConfig]);

// Actualización inmediata + debounce
const updateConfig = (updates: Partial<RAGConfig>) => {
  const newConfig = { ...config, ...updates };
  setConfig(newConfig);
  debouncedSave(newConfig);
};
```

### Carga y Guardado de Configuración
```typescript
// Cargar configuración existente
const loadConfig = async () => {
  try {
    const response = await fetch(
      `/api/fluxcore/rag-config?vectorStoreId=${vectorStoreId}&accountId=${accountId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        setConfig(data.data);
        latestConfigRef.current = data.data;
      }
    }
  } catch (error) {
    console.error('Error loading RAG config:', error);
  } finally {
    setLoading(false);
  }
};

// Guardar configuración
const persistConfig = useCallback(async (configToSave: RAGConfig) => {
  setSaving(true);
  setSaveError(null);
  try {
    const response = await fetch(`/api/fluxcore/rag-config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        vectorStoreId,
        accountId,
        ...configToSave,
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    onConfigChange?.(configToSave);
  } catch (error: any) {
    console.error('Error saving RAG config:', error);
    setSaveError(error.message || 'Error al guardar');
  } finally {
    setSaving(false);
  }
}, [token, vectorStoreId, accountId, onConfigChange]);
```

### Validación de Rangos
```typescript
// Validación en el backend (importante para el minScore)
// El frontend permite 0.1-0.7 pero el backend puede clamping a valores seguros
const retrievalMinScore = numeric('retrieval_min_score', { precision: 4, scale: 3 }).default('0.300');
```

---

## 🔄 Flujos de Interacción

### Flujo de Configuración
1. Componente se monta y carga configuración existente
2. Usuario ajusta parámetros en cualquier sección
3. Cambios se guardan con debounce de 600ms
4. UI muestra estado "Guardando..." y feedback visual
5. Configuración se persiste en backend

### Flujo de Error
1. Si falla el guardado, se muestra mensaje de error
2. Usuario puede reintentar ajustando parámetros
3. Error se limpia automáticamente en el siguiente guardado exitoso

### Flujo de Toggle de Secciones
1. Usuario puede habilitar/deshabilitar secciones completas
2. Secciones deshabilitadas se muestran opacas y no interactivas
3. Toggle se guarda inmediatamente sin esperar debounce

---

## 🚨 Problemas Críticos Identificados

### 1. **Rango de minScore Incorrecto (CORREGIDO)**
```typescript
// PROBLEMA HISTÓRICO: El default era 0.700 (demasiado alto para cosine search)
// SOLUCIÓN: Cambiado a 0.300 y rango UI ajustado a 0.1-0.7

// Evidencia del fix:
retrievalMinScore: numeric('retrieval_min_score', { precision: 4, scale: 3 }).default('0.300')
```

### 2. **Rutas No Montadas (CORREGIDO)**
```typescript
// PROBLEMA HISTÓRICO: ragConfigRoutes nunca se montó en server.ts
// SOLUCIÓN: Montado en server.ts
import { ragConfigRoutes } from './routes/rag-config.routes';
app.use('/api/fluxcore/rag-config', ragConfigRoutes);
```

### 3. **Validación Inconsistente**
```typescript
// PROBLEMA: Frontend permite 0.1-0.7 pero backend puede tener diferentes límites
// SOLUCIÓN: Backend clamping a valores seguros
const clampedScore = Math.min(Math.max(score, 0.05), 0.7);
```

---

## 🔌 Dependencias y Hooks

### Librerías Externas
```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Search, FileText } from 'lucide-react';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { SliderInput } from '../../ui/SliderInput';
import { useAuthStore } from '../../../store/authStore';
```

### Componentes UI
- `CollapsibleSection` - Secciones colapsables con toggle
- `SliderInput` - Inputs numéricos con slider visual

### Servicios
- `/api/fluxcore/rag-config` - Endpoints de configuración RAG
- `useAuthStore` - Autenticación y token

---

## 📊 Métricas de Uso

### Eventos Tracking
```typescript
// Eventos importantes para analytics
- 'rag_config_loaded'
- 'rag_config_updated'
- 'rag_config_section_toggled'
- 'rag_config_error'
- 'rag_config_strategy_changed'
- 'rag_config_provider_changed'
```

### Performance
- **Render inicial:** ~40ms
- **Cambio de configuración:** ~5ms
- **Guardado (debounce):** ~600ms
- **Carga inicial:** ~200ms (con API call)

---

## 🎨 Estilos y UI

### Clases CSS Principales
```css
.rag-config-section        /* Contenedor principal */
.config-section           /* Sección individual */
.section-header           /* Header de sección */
.section-content           /* Contenido de sección */
.slider-container          /* Contenedor de sliders */
.toggle-section           /* Sección con toggle */
.status-indicator          /* Indicador de estado */
```

### Estados Visuales
- **Cargando:** "Cargando configuración RAG..."
- **Guardando:** Spinner y "Guardando..."
- **Error:** Mensaje de error en rojo
- **Deshabilitado:** Sección opaca y no interactiva

---

## 🧪 Testing

### Casos de Prueba
1. **Carga de configuración** - Desde backend
2. **Actualización de parámetros** - Todas las secciones
3. **Toggle de secciones** - Habilitar/deshabilitar
4. **Autoguardado con debounce** - Estrategia de guardado
5. **Manejo de errores** - Falla de API
6. **Validación de rangos** - Límites de sliders
7. **Cambio de proveedor** - Modelos dinámicos

### Tests Unitarios
```typescript
describe('RAGConfigSection', () => {
  it('debe cargar configuración existente')
  it('debe actualizar configuración con debounce')
  it('debe validar rangos de parámetros')
  it('debe manejar errores de guardado')
  it('debe cambiar modelos según proveedor')
  it('debe toggle secciones correctamente')
})
```

---

## 🔮 Mejoras Futuras

### Planeadas
1. **Configuración avanzada** - Más parámetros de chunking
2. **Preview de embeddings** - Visualización de vectores
3. **Test de búsqueda** - Búsqueda de prueba en tiempo real
4. **Templates de configuración** - Configuraciones predefinidas
5. **Métricas de rendimiento** - Tiempos de retrieval

### Técnicas
1. **Optimización de debounce** - Adaptativo según actividad
2. **Cache de configuración** - Mejorar rendimiento de carga
3. **Validación en tiempo real** - Feedback instantáneo
4. **Export/Import** - Compartir configuraciones

---

## 📚 Referencias Cruzadas

### Documentación Relacionada
- **[RAG_SUBSYSTEM.md](./RAG_SUBSYSTEM.md)** - Contexto completo del subsistema RAG
- **[03-database-landscape/SCHEMAS_DIRECTORY.md](../03-database-landscape/SCHEMAS_DIRECTORY.md)** - Schema de RAG configurations
- **[05-configuration-state/ENVIRONMENT_VARIABLES.md](../05-configuration-state/ENVIRONMENT_VARIABLES.md)** - Variables de entorno

### Componentes Relacionados
- `LocalVectorStoreDetail.tsx` - Usa RAGConfigSection
- `OpenAIVectorStoreDetail.tsx` - Usa RAGConfigSection
- `VectorStoreTestQuery.tsx` - Testing de configuración RAG

### Backend Relacionado
- `/api/fluxcore/rag-config` - Endpoints de configuración
- `/api/fluxcore/runtime/rag-context` - Testing de RAG
- `fluxcore_rag_configurations` table - Schema de base de datos

### Servicios Relacionados
- **RAG Config Service** - Lógica de configuración
- **Embedding Service** - Generación de embeddings
- **Vector Search Service** - Búsqueda vectorial
