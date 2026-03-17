# Kernel Console v4.0 - Especificación Completa Consolidada

## 🎯 **Visión y Propósito**

### **Objetivo Principal**
Crear una herramienta de monitoreo y debugging **exclusiva para Harvan** que permita observar, analizar y validar el funcionamiento interno del Kernel v4.0 en tiempo real.

### **Propósito de Desarrollo**
1. **Monitorear tránsito de datos** entre ChatCore ↔ Kernel ↔ FluxCore
2. **Debuggear nuevas implementaciones** (señales, projectors, features)
3. **Identificar rápidamente puntos de falla** en el pipeline
4. **Validar crecimiento del Kernel** sin romper funcionalidades existentes
5. **Realizar pruebas internas** directamente desde la consola

---

## 🏗️ **Arquitectura y Stack**

### **Tecnologías Confirmadas**
- **Backend**: Elysia + Bun (NO Express)
- **Frontend**: React + Vite
- **Database**: PostgreSQL con Drizzle ORM
- **Auth**: JWT con `authMiddleware` de Elysia
- **Real-time**: WebSocket (futuro)

### **Tablas Kernel Relevantes**
```sql
-- Confirmadas existente
fluxcore_signals              -- Señales del Kernel
fluxcore_projector_cursors    -- Estado de projectors  
fluxcore_projector_errors     -- Errores de projectors
```

### **Schema Knowledge**
- **fluxcore_signals**: `sequenceNumber`, `factType`, `evidenceRaw`, `observedAt`
- **fluxcore_projector_cursors**: `projectorName`, `lastSequenceNumber`, `lastProcessedAt`
- **fluxcore_projector_errors**: `id`, `projectorName`, `errorMessage`, `createdAt`

---

## 🎮 **Funcionalidades Completas**

### **1. Signals Monitor**
**Propósito**: Ver flujo de señales en tiempo real

**Features**:
- Últimas 50 señales con paginación
- Filtros por `factType`, `sourceNamespace`, `driverId`
- Búsqueda por `conversationId` o `accountId`
- Syntax highlighting para `evidenceRaw`
- Expandir filas para ver detalles completos
- Auto-refresh cada 5 segundos (toggle)

### **2. Projectors Status**
**Propósito**: Monitorear salud de projectors

**Features**:
- Lista de todos los projectors activos
- Último sequence number procesado
- Timestamp de última procesación
- Indicadores de salud (healthy/stale/error)
- Ver errores específicos de cada projector

### **3. Debug Tools**
**Propósito**: Herramientas de debugging avanzadas

**Features**:
- **Clipboard Functionality**: Copiar señales individuales o múltiples
- **Formatos**: JSON (pretty), CSV, Raw text
- **Multi-row selection** con checkboxes
- **Bulk copy controls** con dropdown de formato
- **Visual feedback** de copy success/failure

### **4. Search & Filter**
**Propósito**: Encontrar señales específicas rápidamente

**Features**:
- Búsqueda por texto en evidenceRaw
- Filtros combinados múltiples
- Búsqueda por rangos de tiempo
- Guardar búsquedas frecuentes

---

## 📱 **UI/UX Design**

### **Layout Structure**
```
┌─────────────────────────────────────────────────────────┐
│ Header: Kernel Console v4.0 | Auto-refresh: [ON/OFF]    │
├─────────────────────────────────────────────────────────┤
│ Filters: [factType▼] [source▼] [search_______] [Apply]  │
├─────────────────────────────────────────────────────────┤
│ ☐ │ #  │ Type        │ Source      │ Time       │ Act  │
│ ☐ │ 1  │ AI_RESPONSE  │ @fluxcore/  │ 12:34:56   │ [👋] │
│ ☐ │ 2  │ MESSAGE_RECV │ chatcore/   │ 12:34:55   │ [👋] │
├─────────────────────────────────────────────────────────┤
│ ☑ Select All │ [Copy JSON▼] │ [Copy CSV▼] │ [Copy Raw▼] │
└─────────────────────────────────────────────────────────┘
```

### **Componentes Reutilizables**
- **Button**: Variantes (primary, secondary, ghost, danger)
- **Checkbox**: Para selección de filas
- **Select**: Para dropdowns de formato y filtros
- **Table**: Con sorting y paginación
- **useClipboard**: Hook para funcionalidad de copia

---

## 🔧 **Implementación Técnica**

### **Backend API**
```typescript
// Endpoint principal
GET /kernel/console/signals
Query params: ?limit=50&offset=0&factType=AI_RESPONSE_GENERATED

// Response structure
{
  signals: Signal[],
  total: number,
  hasMore: boolean
}
```

### **Frontend Components**
```typescript
// KernelConsole.tsx - Componente principal
interface KernelConsoleProps {
  accountId: string;
}

// useKernelSignals.ts - Hook personalizado
interface UseKernelSignalsReturn {
  signals: Signal[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}
```

### **Clipboard Implementation**
```typescript
// Formatos soportados
type CopyFormat = 'json' | 'csv' | 'raw';

// Función de formateo
const formatContent = (signals: Signal[], format: CopyFormat): string => {
  switch (format) {
    case 'json': return JSON.stringify(signals, null, 2);
    case 'csv': return convertToCSV(signals);
    case 'raw': return signals.map(s => JSON.stringify(s)).join('\n');
  }
};
```

---

## 📋 **Plan de Desarrollo**

### **Fase 1 (Foundation)**: 2-3 días
- Día 1: Investigar schemas y crear endpoint básico
- Día 2: Componente UI básico con mock data
- Día 3: Conectar backend con frontend

### **Fase 2 (Core Features)**: 4-5 días
- Día 1-2: Implementar signals monitor completo
- Día 3-4: Añadir filtros y búsqueda
- Día 5: Implementar auto-refresh

### **Fase 3 (Advanced Features)**: 3-4 días
- Día 1-2: Implementar clipboard functionality
- Día 3-4: Añadir projectors status

### **Fase 4 (Polish)**: 2-3 días
- Día 1: Mejorar UI/UX basado en feedback
- Día 2: Optimizar performance
- Día 3: Testing y bug fixes

### **Fase 5 (Testing)**: 3-4 días
- Día 1-2: Test framework
- Día 3-4: Debug tools y automation

**Total**: 15-20 días (3-4 semanas)

---

## 🔄 **Refactoring de Contexto de Trazas**

### **Problema Identificado**
Las trazas del Kernel mostraban valores "unknown" para:
- `model`: "unknown" en lugar de "llama-3.1-8b-instant"
- `provider`: "unknown" en lugar de "groq"
- `PolicyContext`: Ausente en evidenceRaw

### **Root Cause**
Fallo en la propagación de contexto entre:
1. `CognitiveDispatcher` → `ActionExecutor.execute()`
2. `ActionExecutor.execute()` → `executeSendMessage()`
3. `executeSendMessage()` → `certifyAiResponse()`

### **Solución Implementada**
1. **Extender firmas** para aceptar `runtimeConfig` y `policyContext`
2. **Validación estricta** con errores ruidosos si falta contexto
3. **Propagación completa** de datos del runtime a trazas
4. **Enriquecer evidenceRaw** con PolicyContext completo

### **Cambios Realizados**
```typescript
// 1. execute() - Añadir runtimeConfig a params
async execute(actions: ExecutionAction[], params: {
  // ... campos existentes
  runtimeConfig?: RuntimeConfig; // ✅ Nuevo
})

// 2. executeSendMessage() - Extender context
private async executeSendMessage(action, context: {
  // ... campos existentes
  runtimeConfig?: RuntimeConfig;
  policyContext?: FluxPolicyContext;
})

// 3. certifyAiResponse() - Añadir provider y policyContext
async certifyAiResponse(params: {
  // ... campos existentes
  provider?: string;
  policyContext?: any;
})

// 4. evidenceRaw - Enriquecer con datos reales
context: {
  conversationId: params.conversationId,
  turnId: params.turnId,
  runtimeId: params.runtimeId || 'unknown',
  model: params.model || 'unknown',
  provider: params.provider || 'unknown',
  policyContext: params.policyContext ? {
    accountId: params.policyContext.accountId,
    mode: params.policyContext.mode,
    activeRuntimeId: params.policyContext.activeRuntimeId,
    authorizedTemplates: params.policyContext.authorizedTemplates?.length || 0,
  } : undefined,
}
```

### **Resultado Esperado**
```json
// Antes
"context": {
  "model": "unknown",
  "runtimeId": "unknown"
}

// Después
"context": {
  "model": "llama-3.1-8b-instant",
  "provider": "groq",
  "runtimeId": "asistentes-local",
  "policyContext": {
    "accountId": "3e94f74e-e6a0-4794-bd66-16081ee3b02d",
    "mode": "auto",
    "activeRuntimeId": "asistentes-local",
    "authorizedTemplates": 2
  }
}
```

---

## 🎯 **Next Steps**

1. **Aprobar esta especificación** completa
2. **Realizar investigación inicial** de schemas
3. **Empezar Fase 1** con foundation sólida
4. **Validar cada fase** antes de continuar
5. **Iterar basado en feedback** real

---

## 📝 **Lessons Learned**

### **Errores a Evitar**
- ❌ **No investigar schemas primero**
- ❌ **Usar sintaxis incorrecta (Express vs Elysia)**  
- ❌ **No validar tipos de columnas**
- ❌ **Construir todo junto sin probar**
- ❌ **No tener plan de rollback**

### **Buenas Prácticas**
- ✅ **Investigación profunda antes de codear**
- ✅ **Empezar simple y agregar complejidad**
- ✅ **Validar cada paso incrementalmente**
- ✅ **Usar stack existente correctamente**
- ✅ **Tener rollback plan listo**

---

## 🧠 **Reflexión del Proceso**

### **¿Por Qué Esta Vez No Rompí Nada?**

#### **1. Mentalidad de Investigación Primero**
En lugar de empezar a codear, dediqué tiempo a entender:
- **El flujo completo de datos**: CognitiveDispatcher → ActionExecutor → CognitionGateway
- **Las interfaces existentes**: Qué parámetros recibía cada función
- **Los tipos disponibles**: RuntimeConfig, FluxPolicyContext, etc.
- **El impacto real**: Dónde exactamente aparecía "unknown"

#### **2. Documentación Estructurada**
Creé un plan formal con:
- **Cambios específicos** con ubicación exacta (líneas)
- **Estado actual vs cambio requerido**
- **Checklist de validación** pre/durante/post
- **Criterio de éxito cuantificable**

#### **3. Validación Incremental**
En lugar de hacer todos los cambios juntos:
- **Verificación previa**: Confirmar rutas y estado actual
- **Cambio por cambio**: Modificar una función, verificar, continuar
- **Imports correctos**: Asegurar que todos los tipos estén disponibles
- **Testing inmediato**: Iniciar servidor para verificar que compile

#### **4. Diseño de Errores Ruidosos**
En lugar de fallbacks silenciosos:
- **Validación explícita**: `if (!context.runtimeConfig) throw Error(...)`
- **Mensajes descriptivos**: "Missing context propagation from CognitiveDispatcher"
- **Fallbacks controlados**: Solo como último recurso con logging

#### **5. Arquitectura Backward Compatible**
Todos los cambios fueron:
- **Parámetros opcionales** con `?`
- **Optional chaining** con `?.`
- **Mismo objeto context** en todos los llamantes
- **No eliminación** de funcionalidad existente

#### **6. Flujo de Datos Mapeado**
Identifiqué exactamente:
```
CognitiveDispatcher (tiene runtimeConfig)
    ↓ pasa runtimeConfig
ActionExecutor.execute (recibe runtimeConfig)
    ↓ pasa runtimeConfig
executeSendMessage (recibe runtimeConfig)
    ↓ usa runtimeConfig
certifyAiResponse (recibe model/provider reales)
    ↓ incluye en evidenceRaw
Kernel Console (muestra datos reales)
```

### **El Secreto: Entender Antes de Actuar**

La diferencia clave fue **no asumir**. En lugar de:
- ❌ "Seguro que context tiene runtimeConfig"
- ✅ "Voy a verificar qué tiene context exactamente"

En lugar de:
- ❌ "Añado runtimeConfig y ya está"
- ✅ "Voy a trazar el flujo completo desde el origen"

### **Patrón Replicable**

1. **Investigación Profunda** (30% del tiempo)
   - Mapear flujo de datos completo
   - Identificar puntos exactos del problema
   - Entender interfaces existentes

2. **Planificación Estructurada** (20% del tiempo)
   - Documentar cambios específicos
   - Crear checklist de validación
   - Definir criterio de éxito

3. **Implementación Incremental** (40% del tiempo)
   - Cambio por cambio con validación
   - Verificar que compile después de cada cambio
   - No continuar si algo falla

4. **Testing y Validación** (10% del tiempo)
   - Probar el flujo completo
   - Verificar que no haya regresiones
   - Confirmar criterio de éxito

### **Lección Fundamental**

**"La velocidad viene de la claridad, no de la prisa"**

Cuando entendes completamente el problema y tienes un plan claro, la implementación es fluida y libre de errores. El tiempo invertido en investigación y planificación se paga con creces en ejecución limpia y sin drama.

---

*"Esta especificación es nuestra guía para construir una herramienta robusta que realmente nos ayude a desarrollar mejor el Kernel v4.0. No hay prisa - calidad sobre velocidad."*
