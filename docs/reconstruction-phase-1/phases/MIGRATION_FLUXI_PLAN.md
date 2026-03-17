# 🚀 **Plan de Migración: Fluxi/WES a Nueva Arquitectura**

**Basado en:** SYSTEM_REFACTORING_METHODOLOGY.md  
**Componente:** @fluxcore/fluxi (Work Execution System)  
**Fecha:** 2026-03-16

---

## 🎯 **Objetivo de la Migración**

Mover el runtime `@fluxcore/fluxi` del **legacy path** (ExtensionHost) a la **nueva arquitectura** (CognitionWorker) manteniendo toda la funcionalidad.

### **Estado Actual:**
- ✅ Fluxi funciona con ExtensionHost + stopPropagation
- ✅ 2 trabajos activos en producción
- ✅ Work definitions operativas
- ❌ Depende del legacy path (FLUX_NEW_ARCHITECTURE=false)

### **Estado Deseado:**
- ✅ Fluxi funciona con CognitionWorker
- ✅ Mantiene stop propagation capability
- ✅ Preserva todos los workflows existentes
- ✅ Elimina dependency del legacy path

---

## 🔄 **Metodología de 5 Fases (Aplicada a Fluxi)**

### **Fase 1: Cartografía del Sistema (30% del tiempo)**

#### **Objetivo**
Entender el territorio actual de Fluxi antes de mover nada.

#### **Actividades Específicas**
1. **Mapear Flujo de Datos de Fluxi**
   - Mensaje → ExtensionHost → Fluxi.onMessage()
   - Fluxi → workEngineService → Base de datos
   - Fluxi → messageCore → Respuestas

2. **Identificar Puntos Críticos**
   - `onMessage()` entry point
   - `stopPropagation` mechanism
   - Dependency injection via `setServices()`
   - Integration con `workEngineService`

3. **Verificar Estado Actual**
   - 2 trabajos en DB (estado DRAFT)
   - 1 work definition (`appointment_booking_v1`)
   - Runtime registration: `fluxi-runtime`

4. **Entender Contratos Existentes**
   - `ProcessMessageParams` interface
   - `ProcessMessageResult` con `stopPropagation`
   - Actions: `wes:semantic_commit`, `wes:resume_work`, `wes:open_work`

#### **Entregables**
- ✅ **Diagrama de flujo** actual (ANALYSIS_FLUXI_WES.md)
- ✅ **Lista de componentes** involucrados
- ✅ **Puntos exactos** de intervención identificados

---

### **Fase 2: Planificación Estructurada (20% del tiempo)**

#### **Objetivo**
Crear un plan ejecutable con riesgos controlados.

#### **Cambios Específicos**
1. **Archivos a Modificar**
   - `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`
   - `apps/api/src/services/fluxcore/runtime-gateway.service.ts`
   - `extensions/fluxcore-fluxi/src/index.ts`

2. **Nuevos Componentes**
   - Fluxi Runtime Adapter para CognitionWorker
   - Stop Propagation Mechanism en nueva arquitectura
   - Dependency Injection para CognitionWorker

3. **Criterio de Éxito**
   - Fluxi responde igual que antes
   - Stop propagation funciona
   - Workflows existentes no se rompen
   - No hay regresiones en ChatCore

#### **Riesgos y Mitigaciones**
| Riesgo | Impacto | Mitigación |
|---|---|---|
| Pérdida de stop propagation | CRÍTICO | Implementar mecanismo equivalente |
| Romper workflows existentes | ALTO | Tests exhaustivos antes/después |
| Dependency injection breaks | MEDIO | Adaptar injection mechanism |
| Performance degradation | BAJO | Benchmarks comparativos |

#### **Checklist de Validación**
- [ ] Fluxi detecta semantic matches
- [ ] Fluxi resume active works
- [ ] Fluxi interpreta nuevos mensajes
- [ ] Stop propagation previene double processing
- [ ] Workflows completan exitosamente

---

### **Fase 3: Implementación Incremental (40% del tiempo)**

#### **Principios Clave**
1. **Un Cambio a la Vez**
2. **Backward Compatibility**
3. **Validación Inmediata**

#### **Secuencia de Implementación**

**Paso 1: Crear FluxiRuntimeAdapter**
```typescript
// Nuevo archivo: apps/api/src/services/fluxcore/runtimes/fluxi-runtime.adapter.ts
export class FluxiRuntimeAdapter implements RuntimeAdapter {
    async handleMessage(input: RuntimeHandleInput): Promise<ExecutionResult> {
        // Migrar lógica de onMessage() aquí
    }
}
```

**Paso 2: Implementar Stop Propagation en ActionExecutor**
```typescript
// Modificar: apps/api/src/services/fluxcore/action-executor.service.ts
if (result.stopPropagation) {
    // Implementar mecanismo de detención
    return { actions: [], stopped: true };
}
```

**Paso 3: Adaptar Dependency Injection**
```typescript
// Migrar setServices() a CognitionWorker context
```

**Paso 4: Registrar Runtime**
```typescript
// Modificar: apps/api/src/server.ts
runtimeGateway.register(new FluxiRuntimeAdapter());
```

**Paso 5: Testing Paralelo**
- Mantener legacy path activo
- Añadir switch para elegir path
- Comparar resultados side-by-side

---

### **Fase 4: Validación Sistemática (10% del tiempo)**

#### **Test del Flujo Completo**
1. **Semantic Confirmation**
   - Input: "Confirmo turno para el martes"
   - Expected: `wes:semantic_commit` action
   - Validation: Work actualizado en DB

2. **Work Resumption**
   - Input: "Cambiar hora a las 3pm"
   - Expected: `wes:resume_work` action
   - Validation: Slot actualizado

3. **New Work Interpretation**
   - Input: "Quiero turno para mañana"
   - Expected: `wes:open_work` action
   - Validation: Nuevo work creado

4. **Stop Propagation**
   - Input: Cualquier comando de Fluxi
   - Expected: Solo Fluxi responde
   - Validation: IA conversacional no interviene

#### **Validación de Criterios**
- ✅ Workflows existentes funcionan
- ✅ Nuevos workflows se crean
- ✅ Stop propagation funciona
- ✅ No hay double processing
- ✅ Performance aceptable

---

## 🚨 **Decisiones Arquitectónicas**

### **1. Stop Propagation en Nueva Arquitectura**
**Solución:** Implementar en `ActionExecutor` con early return
```typescript
if (actions.some(a => a.type.startsWith('wes:'))) {
    // Fluxi handled it, stop further processing
    return { actions, stopped: true };
}
```

### **2. Dependency Injection**
**Solución:** Mover de ExtensionHost a CognitionWorker
```typescript
// En CognitiveDispatcher
const fluxiServices = {
    workEngineService,
    messageCore,
    // ... otros servicios
};
```

### **3. Runtime Registration**
**Solución:** Adaptar como RuntimeAdapter
```typescript
// Fluxi se convierte en runtime más
runtimeGateway.register(fluxiRuntimeAdapter);
```

---

## 📋 **Checklist de Migración**

### **Pre-Migración**
- [ ] Backup de datos de fluxcore_works
- [ ] Tests actuales pasando
- [ ] Documentación actualizada
- [ ] Stakeholders notificados

### **Durante Migración**
- [ ] Cada paso validado individualmente
- [ ] No romper funcionalidad existente
- [ ] Logs claros del progreso
- [ ] Performance monitoreada

### **Post-Migración**
- [ ] Todos los tests pasan
- [ ] Workflows existentes funcionan
- [ ] Stop propagation verificado
- [ ] Legacy path puede eliminarse

---

## 🎯 **Criterio de Éxito Final**

**La migración es exitosa cuando:**
1. ✅ Fluxi funciona igual que antes
2. ✅ Stop propagation previene double processing
3. ✅ Todos los workflows existentes completan
4. ✅ No hay regresiones en ChatCore
5. ✅ Legacy path puede eliminarse safely

---

## 📊 **Timeline Estimado**

| Fase | Duración | Entregables |
|---|---|---|
| Fase 1: Cartografía | 2 días | Flujo mapeado |
| Fase 2: Planificación | 1 día | Plan detallado |
| Fase 3: Implementación | 4 días | Código migrado |
| Fase 4: Validación | 2 días | Tests pasando |
| **Total** | **9 días** | **Fluxi migrado** |

---

## 🔄 **Siguiente Paso**

Comenzar con **Fase 1: Cartografía del Sistema** validando que tenemos todos los componentes y flujos identificados correctamente.
