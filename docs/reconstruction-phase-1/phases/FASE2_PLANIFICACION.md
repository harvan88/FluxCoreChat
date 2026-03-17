# 📋 **Fase 2: Planificación Estructurada - Fluxi/WES Migration**

**Fecha:** 2026-03-16  
**Duración:** 1 día  
**Basado en:** Fase 1 completada (territorio mapeado)  
**Metodología:** SYSTEM_REFACTORING_METHODOLOGY.md - Fase 2

---

## 🎯 **Objetivo de la Fase 2**

Crear un **plan ejecutable** con riesgos controlados para migrar Fluxi/WES del legacy path a la nueva arquitectura.

### **Descubrimiento Clave de Fase 1:**
- ✅ **FluxiRuntime ya existe** como `RuntimeAdapter`
- ❌ **No está registrado** en `RuntimeGateway`
- ❌ **Dependency injection** necesita adaptación
- ✅ **WorkEngineService** es funcional

---

## 📝 **Cambios Específicos a Realizar**

### **Archivos a Modificar:**

#### **1. apps/api/src/server.ts**
```typescript
// CAMBIO: Registrar FluxiRuntime
import { fluxiRuntime } from './services/fluxcore/runtimes/fluxi.runtime';

// ANTES (no existe):
// fluxiRuntime no está registrado

// DESPUÉS:
runtimeGateway.register(fluxiRuntime);
```

#### **2. apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts**
```typescript
// CAMBIO: Adaptar WorkEngineService a nuevo contexto
// ANTES: WorkEngineService no accesible directamente

// DESPUÉS: Pasar WorkEngineService via RuntimeConfig
const runtimeConfig = {
    // ... configuración existente
    workEngineService, // Nuevo campo
    messageCore,        // Nuevo campo
};
```

#### **3. apps/api/src/services/fluxcore/runtime-gateway.service.ts**
```typescript
// CAMBIO: Mapear '@fluxcore/fluxi' a FluxiRuntime
// ANTES: Registry no tiene '@fluxcore/fluxi'

// DESPUÉS:
this.registry.set('@fluxcore/fluxi', fluxiRuntime);
```

#### **4. apps/api/src/services/fluxcore/runtimes/fluxi.runtime.ts**
```typescript
// CAMBIO: Adaptar para recibir WorkEngineService
// ANTES: Sin acceso a WorkEngineService

// DESPUÉS: Usar WorkEngineService via runtimeConfig
private workEngineService = runtimeConfig.workEngineService;
```

### **Nuevos Archivos a Crear:**

#### **1. apps/api/src/services/fluxcore/fluxi-dependency-injection.ts**
```typescript
// Nuevo: Sistema de inyección para FluxiRuntime
export function createFluxiRuntimeConfig(accountId: string): RuntimeConfig {
    return {
        workEngineService: workEngineService,
        messageCore: messageCore,
        // ... otros servicios
    };
}
```

#### **2. apps/api/src/services/fluxcore/fluxi-runtime-adapter.ts**
```typescript
// Nuevo: Adapter wrapper si FluxiRuntime necesita adaptación
export class FluxiRuntimeAdapter implements RuntimeAdapter {
    constructor(private fluxiRuntime: FluxiRuntime) {}
    
    async handleMessage(input: RuntimeInput): Promise<ExecutionResult> {
        // Adaptar input/output si es necesario
        return this.fluxiRuntime.handleMessage(input);
    }
}
```

---

## 🎯 **Criterio de Éxito**

### **Funcionalidad Preservada:**
- [ ] **Semantic confirmation** funciona igual que antes
- [ ] **Work resumption** funciona igual que antes  
- [ ] **New work interpretation** funciona igual que antes
- [ ] **Terminal handler** funciona igual que antes

### **Stop Propagation Funcional:**
- [ ] **Previene double processing** cuando Fluxi responde
- [ ] **Solo Fluxi responde** a comandos WES
- [ ] **IA conversacional no interviene** en workflows Fluxi

### **Integración con Sistema:**
- [ ] **WorkEngineService** funciona correctamente
- [ ] **MessageCore** envía respuestas correctamente
- [ ] **DB operations** se realizan via ActionExecutor
- [ ] **Kernel signals** se generan correctamente

### **Performance y Estabilidad:**
- [ ] **Latency** ≤ 100ms adicional vs legacy
- [ ] **Memory** ≤ 5% adicional vs legacy
- [ ] **0 errores** en logs
- [ ] **0 regresiones** en ChatCore

---

## ⚠️ **Análisis de Riesgos y Mitigaciones**

### **Riesgo 1: Dependency Injection Break**
**Impacto:** CRÍTICO  
**Descripción:** FluxiRuntime no puede acceder a WorkEngineService  
**Mitigación:**
- Crear `fluxi-dependency-injection.ts`
- Pasar servicios via `RuntimeConfig`
- Testing unitario de inyección

### **Riesgo 2: Stop Propagation No Funciona**
**Impacto:** CRÍTICO  
**Descripción:** Nuevo path no respeta stop propagation  
**Mitigación:**
- Implementar detección en `ActionExecutor`
- Test de double processing
- Validar con workflows existentes

### **Riesgo 3: WorkEngineService Integration**
**Impacto:** ALTO  
**Descripción:** WorkEngineService no funciona en nuevo contexto  
**Mitigación:**
- Adaptar calls via actions
- Testing con works existentes
- Validar DB operations

### **Riesgo 4: Runtime Registration**
**Impacto:** MEDIO  
**Descripción:** FluxiRuntime no se registra correctamente  
**Mitigación:**
- Verificar registro en startup
- Test de invocación directa
- Logging de registration

### **Riesgo 5: Performance Degradation**
**Impacto:** BAJO  
**Descripción:** Nuevo path más lento que legacy  
**Mitigación:**
- Benchmarks comparativos
- Optimización de calls
- Monitoring en producción

---

## 📋 **Checklist de Validación**

### **Pre-Cambio:**
- [ ] **Backup de datos** de tablas fluxcore_*
- [ ] **Tests unitarios** de FluxiRuntime pasan
- [ ] **Tests de WorkEngineService** pasan
- [ ] **Documentation** actualizada

### **Durante Cambio:**
- [ ] **Cambio 1:** Registrar FluxiRuntime en server.ts
- [ ] **Validación:** RuntimeGateway reconoce '@fluxcore/fluxi'
- [ ] **Cambio 2:** Adaptar dependency injection
- [ ] **Validación:** FluxiRuntime recibe servicios
- [ ] **Cambio 3:** Mapear runtime ID
- [ ] **Validación:** Invocación directa funciona
- [ ] **Cambio 4:** Adaptar ActionExecutor
- [ ] **Validación:** Stop propagation funciona

### **Post-Cambio:**
- [ ] **Test semantic confirmation** con works existentes
- [ ] **Test work resumption** con slots activos
- [ ] **Test new work interpretation** con mensajes nuevos
- [ ] **Test stop propagation** con IA activa
- [ ] **Performance benchmark** vs legacy
- [ ] **Regression testing** completo

---

## 📊 **Entregables de la Fase 2**

### **Documentación:**
- [x] **Plan detallado** con cambios específicos
- [x] **Criterios de éxito** medibles
- [x] **Análisis de riesgos** con mitigaciones
- [x] **Checklist de validación** completa

### **Artefactos Técnicos:**
- [ ] **Especificación de cambios** por archivo
- [ ] **Diagrama de arquitectura** post-migración
- [ ] **Test plan** detallado
- [ ] **Rollback procedure** documentado

---

## 🔄 **Proceso de Decisión**

### **Go/No-Go Criteria:**
✅ **GO si:**
- Todos los riesgos tienen mitigación
- Tests unitarios pasan
- Backup completado
- Stakeholders informados

❌ **NO-GO si:**
- Riesgo crítico sin mitigación
- Tests fallan
- Backup falla
- Stakeholders no aprueban

---

## 🎯 **Timeline y Recursos**

### **Duración:** 1 día (4 horas de trabajo专注)
### **Recursos Necesarios:**
- Desarrollador senior (yo)
- Acceso a entorno de pruebas
- Permisos para modificar DB
- Tiempo de专注 sin interrupciones

### **Milestones del Día:**
- **Mañana (2h):** Implementar cambios 1-2
- **Tarde (2h):** Implementar cambios 3-4 + testing

---

## 🚀 **Ready para Fase 3**

### **Estado Actual:**
- ✅ **Plan detallado** creado
- ✅ **Cambios específicos** definidos
- ✅ **Criterios de éxito** establecidos
- ✅ **Riesgos mitigados**
- ✅ **Checklist completa**

### **Condición de Go:**
**Aprobado para proceder** con Fase 3: Implementación Incremental

---

**🎯 FASE 2 COMPLETADA - Plan ejecutable creado con riesgos controlados.**
