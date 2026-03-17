# Kernel Console v4.0 - Especificación Completa

## 🎯 **Visión y Propósito**

### **Objetivo Principal**
Crear una herramienta de monitoreo y debugging **exclusiva para Harvan** que permita observar, analizar y validar el funcionamiento interno del Kernel v4.0 en tiempo real.

### **Propósito de Desarrollo**
1. **Monitorear tránsito de datos** entre ChatCore ↔ Kernel ↔ FluxCore
2. **Debuggear nuevas implementaciones** (señales, projectors, features)
3. **Identificar rápidamente puntos de falla** en el pipelinesi
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
-- Confirmadas existentes
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
- Color coding por tipo de señal
- Export a CSV/JSON

**Indicadores Semánticos**:
- ✅ **Señal procesada correctamente**: Verde
- ⚠️ **Señal con evidence nulo**: Amarillo  
- 🔴 **Señal repetida**: Rojo
- 🔍 **Señal en procesamiento**: Azul parpadeante

### **2. Projectors Status**
**Propósito**: Monitor salud de los projectors

**Features**:
- Estado actual de cada projector (identity, chat, session, etc.)
- Última señal procesada
- Contador de errores
- Tiempo desde última actualización
- Retry count y last error

**Indicadores Semánticos**:
- 🟢 **Healthy**: Actualizado en últimos 5min, sin errores
- 🟡 **Warning**: Actualizado hace >5min o errores <5
- 🔴 **Critical**: No actualizado hace >30min o errores >10
- ⚫ **Unknown**: Nunca se ejecutó

### **3. Error Tracker**
**Propósito**: Identificar y analizar errores del Kernel

**Features**:
- Últimos 100 errores con stack trace
- Agrupación por tipo de error
- Frecuencia de errores por projector
- Búsqueda por mensaje de error
- Link a señal original que causó error

**Indicadores Semánticos**:
- 🔥 **Error Crítico**: Bloquea procesamiento
- ⚠️ **Error Advertencia**: No bloquea pero afecta rendimiento
- ℹ️ **Error Info**: Para debugging
- 🔄 **Error Transitorio**: Puede resolverse con retry

### **4. Performance Metrics**
**Propósito**: Medir rendimiento del Kernel

**Features**:
- Tiempo promedio de procesamiento por señal
- Throughput (señales/segundo)
- Latencia por tipo de señal
- Peak hours y patrones de uso
- Memory usage del proceso

**Indicadores Semánticos**:
- 🚀 **Óptimo**: <100ms avg processing
- ⚡ **Bueno**: <500ms avg processing  
- 🐌 **Lento**: >1s avg processing
- 📈 **Trend**: Comparación con período anterior

### **5. Audio/Transcription Flow**
**Propósito**: Monitorear pipeline de audio específicamente

**Features**:
- Estado de cada transcripción (pending → processing → completed)
- Tiempo por etapa del pipeline
- Quality score de transcripciones
- Language detection accuracy
- Failed transcriptions con razón

**Indicadores Semánticos**:
- 🎤 **Audio Recibido**: Input detectado
- ⚙️ **Procesando**: En transcripción
- ✅ **Completado**: Con éxito
- ❌ **Fallido**: Con error específico

### **6. Interactive Testing**
**Propósito**: Probar funcionalidades del Kernel directamente

**Features**:
- Enviar señales de prueba manualmente
- Simular diferentes `factType`
- Testear projectors individualmente
- Forzar re-procesamiento de señales
- Mock de respuestas para testing

**Indicadores Semánticos**:
- 🧪 **Test Mode**: Indica que es una prueba
- 📊 **Result**: Success/Fail con métricas
- 🔄 **Replay**: Re-procesando señal
- 🎯 **Target**: Projector específico

### **7. Live Cognitive Pipeline (Soberanía)**
**Propósito**: Trazabilidad completa del viaje del mensaje en tiempo real.

**Features**:
- Semáforo visual de 7 nodos (Ingreso → Entrega)
- Verificación explícita de Soberanía de Runtime
- Monitor de latencias por etapa
- Exportación de trazas completas a portapapeles (JSON)
- Notificación visual de errores en el flujo

**Indicadores Semánticos**:
- ⚪ **Gris**: Pendiente de procesamiento
- 🟡 **Amarillo**: Procesando actualmente (con animación)
- 🟢 **Verde**: Paso completado exitosamente
- 🔴 **Rojo**: Error crítico en el pipeline

---

## 🔧 **Implementación Paso a Paso**

### **Fase 1: Foundation (MVP)**
**Objetivo**: Datos básicos funcionando

**Paso 1.1**: Setup Backend
- [x] Crear `kernel-console.routes.ts` con sintaxis Elysia CORRECTA
- [x] Middleware `harvanOnly` que verifique `user.accountId`
- [x] Endpoint `/api/kernel/console/signals` (solo lectura)
- [x] Query simple: `SELECT * FROM fluxcore_signals ORDER BY sequence_number DESC LIMIT 10`

**Paso 1.2**: Setup Frontend  
- [x] Componente `KernelConsole.tsx` básico
- [x] Solo tab "Signals" con tabla simple
- [x] Auto-refresh cada 10 segundos
- [x] Loading states básicos

**Paso 1.3**: Integración
- [x] Modificar `MonitoringHub.tsx` para incluir Kernel Console (migrado a Dynamic Container propio)
- [x] Restricción por cuenta en `ActivityBar.tsx`
- [x] API methods en `api.ts` con headers correctos

**Validación Fase 1**:
- ✅ Backend compila sin errores
- ✅ Frontend muestra signals sin errores
- ✅ Solo visible para cuenta Harvan
- ✅ Auto-refresh funciona

### **Fase 2: Signals Enhancements**
**Objetivo**: Signals monitor completo

**Paso 2.1**: Queries Avanzadas
- [x] Filtros por `factType`, `sourceNamespace`
- [x] Búsqueda por `conversationId` u otros datos de payload (`evidenceRaw`)
- [x] Paginación (limit custom, order by seq DESC implementado)
- [ ] Performance optimization (índices)

**Paso 2.2**: UI Mejorada
- [x] Inspector de payload (evidenceRaw) clickeable por row (JSON stringify estructurado)
- [ ] Syntax highlighting avanzado para JSON
- [x] Color coding por tipo de estado
- [x] Filtros UI funcionales (FactType, Source, Limit)
- [x] Export functionality (Copia como JSON, CSV, o Texto Plano - Gracias a tu pull request!)

**Paso 2.3**: Indicadores Semánticos
- [ ] Lógica para clasificar señales
- [ ] Visual indicators (icons, colors)
- [ ] Tooltips con información
- [ ] Badges de estado

**Validación Fase 2**:
- ✅ Filtros funcionan correctamente
- ✅ Performance aceptable (<500ms)
- ✅ UI intuitiva y responsive
- ✅ Indicadores semánticos correctos

### **Fase 3: Projectors & Errors**
**Objetivo**: Monitor salud del sistema

**Paso 3.1**: Projectors Status
- [ ] Query `fluxcore_projector_cursors`
- [ ] Calcular health status basado en timestamps
- [ ] UI con cards por projector
- [ ] Real-time updates

**Paso 3.2**: Error Tracking
- [ ] Query `fluxcore_projector_errors`
- [ ] Agrupación y categorización
- [ ] UI con tabla de errores
- [ ] Link a señales originales

**Paso 3.3**: Health Dashboard
- [ ] Vista consolidada de salud
- [ ] Métricas agregadas
- [ ] Alerts automáticas
- [ ] Trend analysis

**Validación Fase 3**:
- ✅ Health indicators precisos
- ✅ Errors categorizados correctamente
- ✅ Dashboard consolidado útil
- ✅ Alerts funcionan

### **Fase 4: Performance & Audio**
**Objetivo**: Métricas avanzadas

**Paso 4.1**: Performance Metrics
- [ ] Tiempos de procesamiento
- [ ] Throughput calculations
- [ ] Historical trends
- [ ] Charts y visualizaciones

**Paso 4.2**: Audio Flow
- [ ] Tracking de transcripciones
- [ ] Pipeline stages monitoring
- [ ] Quality metrics
- [ ] Failed analysis

**Paso 4.3**: Optimization
- [ ] Caching de queries
- [ ] WebSocket para real-time
- [ ] Lazy loading
- [ ] Compression

**Validación Fase 4**:
- ✅ Métricas precisas y útiles
- ✅ Audio flow completamente trackeable
- ✅ Performance óptima
- ✅ Real-time updates (WebSocket implementado)
- ✅ **Live Cognitive Pipeline completamente operativo**

### **Fase 5: Interactive Testing**
**Objetivo**: Herramienta de testing

**Paso 5.1**: Test Framework
- [ ] Endpoints para enviar señales de prueba
- [ ] Mock responses
- [ ] Test scenarios predefinidos
- [ ] Results analysis

**Paso 5.2**: Debug Tools
- [ ] Force reprocess signals
- [ ] Restart specific projectors
- [ ] Clear caches
- [ ] Manual interventions

**Paso 5.3**: Automation
- [ ] Test suites automáticos
- [ ] Regression testing
- [ ] Performance benchmarks
- [ ] Health checks

**Validación Fase 5**:
- ✅ Testing tools funcionales
- ✅ Debug capabilities completas
- ✅ Automatización útil
- ✅ No impact producción

---

## 🔍 **Investigación Requerida**

### **1. Schema Database Profundo**
**Necesidad**: Conocer exactamente las columnas y tipos

**Investigación**:
```sql
-- Analizar estructura exacta de tablas
\d fluxcore_signals
\d fluxcore_projector_cursors  
\d fluxcore_projector_errors

-- Ver datos de ejemplo
SELECT * FROM fluxcore_signals LIMIT 5;
SELECT * FROM fluxcore_projector_cursors LIMIT 5;
```

**Resultados Esperados**:
- Nombres exactos de columnas
- Tipos de datos correctos
- Relaciones entre tablas
- Índices existentes

### **2. Flujo de Audio Real**
**Necesidad**: Entender cómo funciona la transcripción

**Investigación**:
- Analizar logs de transcripción real
- Identificar `factType` para audio
- Mapear pipeline completo
- Entender estados intermedios

**Resultados Esperados**:
- Secuencia de señales para audio
- Estados posibles de transcripción
- Errores comunes y sus causas
- Tiempos típicos del pipeline

### **3. Performance Baselines**
**Necesidad**: Establecer métricas de referencia

**Investigación**:
- Medir tiempos actuales de procesamiento
- Identificar cuellos de botella
- Analizar patrones de uso
- Establecer thresholds

**Resultados Esperados**:
- Baselines de performance
- Thresholds para alertas
- Patrones de uso típicos
- Optimization opportunities

---

## 🛡️ **Restricciones y Seguridad**

### **Access Control**
- **Solo Harvan**: Account ID `3e94f74e-e6a0-4794-bd66-16081ee3b02d`
- **JWT Required**: Token válido obligatorio
- **Header Verification**: `x-account-id` debe coincidir
- **IP Whitelist** (opcional): Solo desde development

### **Data Protection**
- **No PII**: No mostrar información personal de usuarios
- **Limited Scope**: Solo datos del Kernel, no mensajes de usuarios
- **Read-Only**: Sin capacidad de modificar producción
- **Audit Log**: Log de todas las acciones en la consola

### **Performance Impact**
- **Async Queries**: No bloquear operaciones principales
- **Connection Pooling**: Reusar conexiones DB
- **Caching**: Cache de resultados frecuentes
- **Rate Limiting**: Prevenir abuse

---

## 📊 **Success Metrics**

### **Technical Metrics**
- **Latency**: <500ms para cargar datos
- **Availability**: >99% uptime
- **Accuracy**: 100% de datos correctos
- **Coverage**: Todas las señales importantes

### **Development Metrics**  
- **Bug Detection**: 50% reduction en tiempo de debug
- **Feature Validation**: 100% confidence en nuevos features
- **Performance Impact**: <5% overhead al sistema
- **Developer Satisfaction**: Positive feedback

### **Business Metrics**
- **Development Velocity**: 2x faster debugging
- **Quality Improvement**: 30% reduction en bugs
- **Innovation**: Enable new features complejas
- **Maintenance**: Reduce technical debt

---

## 🚀 **Timeline Estimado**

### **Fase 1 (Foundation)**: 2-3 días
- Día 1: Backend setup y queries básicas
- Día 2: Frontend básico e integración  
- Día 3: Testing y validación

### **Fase 2 (Signals)**: 3-4 días
- Día 1-2: Queries avanzadas y filtros
- Día 3-4: UI mejorada e indicadores

### **Fase 3 (Health)**: 4-5 días
- Día 1-2: Projectors status
- Día 3-4: Error tracking
- Día 5: Dashboard consolidado

### **Fase 4 (Performance)**: 3-4 días
- Día 1-2: Metrics y audio flow
- Día 3-4: Optimización y real-time

### **Fase 5 (Testing)**: 3-4 días
- Día 1-2: Test framework
- Día 3-4: Debug tools y automation

**Total**: 15-20 días (3-4 semanas)

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

*"Esta especificación es nuestra guía para construir una herramienta robusta que realmente nos ayude a desarrollar mejor el Kernel v4.0. No hay prisa - calidad sobre velocidad."*
