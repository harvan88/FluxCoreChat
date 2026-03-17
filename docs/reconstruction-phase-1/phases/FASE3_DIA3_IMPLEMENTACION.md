# 🔧 **Fase 3: Implementación Incremental - Día 3: FluxiRuntimeAdapter**

**Fecha:** 2026-03-16  
**Estado:** En progreso  
**Metodología:** SYSTEM_REFACTORING_METHODOLOGY.md - Fase 3  
**Principio:** Un cambio a la vez con validación inmediata

---

## 🎯 **Objetivo del Día 3**

Implementar **FluxiRuntimeAdapter** y **registrar FluxiRuntime** en RuntimeGateway.

### **Descubrimiento Importante:**
✅ **FluxiRuntime ya está importado y registrado** en server.ts línea 627  
❌ **Pero hay un problema** - el runtime ID no coincide

---

## 🔍 **Análisis del Problema Actual**

### **Runtime ID Mismatch:**
```typescript
// En fluxi.runtime.ts línea 42
readonly runtimeId = 'fluxi-runtime';

// En DB (account_runtime_config)
active_runtime_id = '@fluxcore/fluxi';

// En runtime-gateway.service.ts
Busca: '@fluxcore/fluxi'
Encuentra: 'fluxi-runtime' ❌
```

### **Solución:**
Opción A: Cambiar runtimeId en FluxiRuntime a '@fluxcore/fluxi'  
Opción B: Mapear '@fluxcore/fluxi' → 'fluxi-runtime' en RuntimeGateway

**Elegimos Opción A** - más simple y directo.

---

## 📝 **Cambio 1: Corregir Runtime ID**

### **Archivo:** `apps/api/src/services/fluxcore/runtimes/fluxi.runtime.ts`

```typescript
// ANTES línea 42:
readonly runtimeId = 'fluxi-runtime';

// DESPUÉS:
readonly runtimeId = '@fluxcore/fluxi';
```

### **Validación Inmediata:**
- [ ] FluxiRuntime runtime ID coincide con DB
- [ ] RuntimeGateway puede encontrar '@fluxcore/fluxi'
- [ ] No hay conflicto con otros runtimes

---

## 📝 **Cambio 2: Adaptar FluxiRuntime para WorkEngineService**

### **Problema:**
FluxiRuntime necesita WorkEngineService pero no puede acceder directamente (Canon invariant: no DB access).

### **Solución:**
Adaptar FluxiRuntime para recibir WorkEngineService via RuntimeConfig.

### **Archivo:** `apps/api/src/services/fluxcore/runtimes/fluxi.runtime.ts`

```typescript
// ANTES: Sin acceso a WorkEngineService

// DESPUÉS: Añadir a RuntimeInput interface
interface RuntimeInput {
    policyContext: FluxPolicyContext;
    runtimeConfig: {
        // ... campos existentes
        workEngineService?: any;  // Nuevo
        messageCore?: any;         // Nuevo
    };
    conversationHistory: ConversationMessage[];
}

// Y usar en handleMessage:
const workEngineService = runtimeConfig.workEngineService;
const messageCore = runtimeConfig.messageCore;
```

---

## 📝 **Cambio 3: Crear Sistema de Dependency Injection**

### **Archivo:** `apps/api/src/services/fluxcore/fluxi-dependency-injection.ts`

```typescript
import { workEngineService } from '../work-engine.service';
import { messageCore } from '../../core/message-core';

export function createFluxiRuntimeConfig(accountId: string): any {
    return {
        // ... configuración existente de CognitiveDispatcher
        workEngineService,
        messageCore,
        // Añadir otros servicios si FluxiRuntime los necesita
    };
}
```

---

## 📝 **Cambio 4: Integrar en CognitiveDispatcher**

### **Archivo:** `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`

```typescript
// ANTES: RuntimeConfig sin WorkEngineService

// DESPUÉS: Añadir servicios al RuntimeConfig
const runtimeConfig = {
    // ... campos existentes (assistant, timingConfig, etc.)
    workEngineService,
    messageCore,
};
```

---

## 🧪 **Testing Unitario**

### **Test 1: Runtime Registration**
```typescript
// Verificar que FluxiRuntime está registrado
const adapter = runtimeGateway.registry.get('@fluxcore/fluxi');
console.assert(adapter !== undefined, 'FluxiRuntime debe estar registrado');
console.assert(adapter.runtimeId === '@fluxcore/fluxi', 'Runtime ID debe coincidir');
```

### **Test 2: Basic Invocation**
```typescript
// Test básico de invocación
const mockInput = {
    policyContext: { mode: 'auto', activeRuntimeId: '@fluxcore/fluxi' },
    runtimeConfig: { workEngineService, messageCore },
    conversationHistory: [{ role: 'user', content: 'test' }]
};

const result = await fluxiRuntime.handleMessage(mockInput);
console.assert(Array.isArray(result), 'Debe retornar array de actions');
```

---

## ✅ **Validación del Cambio**

### **Pre-Cambio:**
- [ ] Backup de `fluxi.runtime.ts`
- [ ] Tests existentes pasan
- [ ] Servicios funcionando

### **Post-Cambio:**
- [ ] Server inicia sin errores
- [ ] FluxiRuntime registrado correctamente
- [ ] Runtime ID coincide con DB
- [ ] Test básico de invocación funciona

---

## 🔄 **Implementación Paso a Paso**

### **Paso 1: Corregir Runtime ID**
```typescript
// Editar línea 42 en fluxi.runtime.ts
readonly runtimeId = '@fluxcore/fluxi';
```

### **Paso 2: Adaptar RuntimeInput**
```typescript
// Añadir workEngineService y messageCore a RuntimeInput interface
```

### **Paso 3: Modificar handleMessage**
```typescript
// Usar servicios inyectados en lugar de acceso directo
```

### **Paso 4: Crear dependency injection**
```typescript
// Crear fluxi-dependency-injection.ts
```

### **Paso 5: Integrar en CognitiveDispatcher**
```typescript
// Pasar servicios via runtimeConfig
```

### **Paso 6: Testing y Validación**
```typescript
// Verificar registro y funcionamiento básico
```

---

## 📊 **Expected Results**

### **Inmediato:**
- ✅ Server inicia sin errores
- ✅ FluxiRuntime registrado como '@fluxcore/fluxi'
- ✅ Runtime ID coincide con DB

### **Funcional:**
- ✅ FluxiRuntime puede ser invocado
- ✅ WorkEngineService accesible via runtimeConfig
- ✅ messageCore accesible via runtimeConfig

### **Validación:**
- ✅ No hay fallback a asistentes-local
- ✅ Logs muestran FluxiRuntime activo
- ✅ Test unitarios pasan

---

## 🎯 **Criterio de Éxito del Día 3**

- [ ] **FluxiRuntime registrado** correctamente
- [ ] **Runtime ID coincide** con valor en DB
- [ ] **Dependency injection** funciona
- [ ] **Test básico** de handleMessage funciona
- [ ] **No errores** en startup
- [ ] **Logs confirman** registro exitoso

---

## 🚀 **Ready for Día 4**

**Estado actual:** Listo para implementar cambios  
**Riesgo:** Bajo (solo cambios de ID e inyección)  
**Validación:** Tests unitarios + logs de startup

---

**🎯 DÍA 3 - Implementación de FluxiRuntimeAdapter lista para ejecutar.**
