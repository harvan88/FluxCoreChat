# 🗺️ **Fase 1: Cartografía del Sistema - Fluxi/WES**

**Fecha:** 2026-03-16  
**Objetivo:** Entender el territorio actual de Fluxi antes de mover nada  
**Metodología:** SYSTEM_REFACTORING_METHODOLOGY.md - Fase 1

---

## 🎯 **Objetivo de la Fase 1**

Entender el **territorio** actual de Fluxi/WES antes de modificar nada.

### **Estado Actual Confirmado:**
- ❌ Fluxi está caído (no funciona en nueva arquitectura)
- ❌ Runtime `@fluxcore/fluxi` no está registrado
- ❌ System fallback a `asistentes-local`
- ✅ Works históricos en DB (del 2026-02-12)
- ✅ Work definition existente

---

## 🔄 **Día 1: Mapeo de Flujos y Componentes**

### **Mañana (3 horas) - Diagramar Flujo Completo**

#### **📍 Tarea 1: Mapear Flujo de Datos Actual**

##### **Flujo Legacy (Cuando Funcionaba):**
```
1. Usuario envía mensaje
   ↓
2. MessageDispatch.receive()
   ↓
3. FLUX_NEW_ARCHITECTURE=false
   ↓
4. ExtensionHost.processMessage()
   ↓
5. FluxiExtension.onMessage()
   ↓
6. workEngineService (operaciones DB)
   ↓
7. messageCore.send() (respuestas)
   ↓
8. Stop propagation (previene double processing)
```

##### **Flujo Nueva Arquitectura (Actual Roto):**
```
1. Usuario envía mensaje
   ↓
2. MessageDispatch.receive()
   ↓
3. FLUX_NEW_ARCHITECTURE=true
   ↓
4. ChatProjector → CognitionQueue
   ↓
5. CognitionWorker → CognitiveDispatcher
   ↓
6. RuntimeGateway.invoke('@fluxcore/fluxi')
   ↓
7. ❌ Runtime NO ENCONTRADO
   ↓
8. ❌ Fallback a asistentes-local
```

##### **Flujo Deseado (Post-Migración):**
```
1. Usuario envía mensaje
   ↓
2. MessageDispatch.receive()
   ↓
3. FLUX_NEW_ARCHITECTURE=true
   ↓
4. ChatProjector → CognitionQueue
   ↓
5. CognitionWorker → CognitiveDispatcher
   ↓
6. RuntimeGateway.invoke('@fluxcore/fluxi')
   ↓
7. ✅ FluxiRuntimeAdapter.handleMessage()
   ↓
8. ✅ workEngineService + messageCore
   ↓
9. ✅ Stop propagation en ActionExecutor
```

#### **📍 Tarea 2: Identificar Componentes Críticos**

##### **Componentes de Fluxi:**
```typescript
// 1. FluxiExtension (main class)
export class FluxiExtension {
    async onMessage(params): Promise<Result>
    private async getActiveWork()
    private buildAckMessage()
}

// 2. WesInterpreter (IA interpretation)
export class WesInterpreterService {
    async interpret()
    async solveActiveWork()
}

// 3. Dependencies inyectadas
setServices({
    workEngineService,
    messageCore,
    db,
    // ...
})
```

##### **Componentes del Sistema:**
```typescript
// 1. ExtensionHost (legacy path)
extensionHost.processMessage()

// 2. RuntimeGateway (new path)
runtimeGateway.invoke(runtimeId)

// 3. CognitiveDispatcher (new path)
await runtimeGateway.invoke(runtimeId, input)

// 4. ActionExecutor (new path)
await this.executeActions(actions)
```

#### **📍 Tarea 3: Mapear Puntos de Intervención**

##### **Puntos Críticos Identificados:**

1. **Entry Point Actual:** `FluxiExtension.onMessage()`
   ```typescript
   // Línea 43 en extensions/fluxcore-fluxi/src/index.ts
   async onMessage(params: any): Promise<any>
   ```

2. **Dependency Injection:** `setServices()`
   ```typescript
   // Línea 22 - Inyección de servicios críticos
   setServices(services: {...})
   ```

3. **State Management:** `getActiveWork()`
   ```typescript
   // Línea 158 - Consulta works activos en DB
   private async getActiveWork()
   ```

4. **Actions Generation:** Return values
   ```typescript
   // Líneas 71, 93, 136, 151 - Acciones WES
   return {
       handled: true,
       stopPropagation: true,
       actions: [{ type: 'wes:...' }]
   }
   ```

5. **Runtime Registration (Faltante):**
   ```typescript
   // Necesario en server.ts
   runtimeGateway.register(new FluxiRuntimeAdapter());
   ```

### **Tarde (3 horas) - Validación y Documentación**

#### **📍 Tarea 4: Verificar Estado Actual**

##### **Validación de Datos:**
```sql
-- Works existentes
SELECT COUNT(*) FROM fluxcore_works; -- Result: 2

-- Work definitions
SELECT COUNT(*) FROM fluxcore_work_definitions; -- Result: 1

-- Runtime activo en DB
SELECT active_runtime_id FROM account_runtime_config; -- @fluxcore/fluxi

-- Work definitions por cuenta
SELECT COUNT(*) FROM fluxcore_work_definitions 
WHERE account_id = '520954df-cd5b-499a-a435-a5c0be4fb4e8'; -- 0
```

##### **Validación de Componentes:**
```bash
# Runtime registration
grep -r "fluxi" apps/api/src/services/runtime-gateway.service.ts
# Result: No encontrado - Fluxi no registrado

# ExtensionHost usage
grep -r "fluxi" apps/api/src/services/extension-host.service.ts
# Result: Encontrado - Solo en legacy path
```

#### **📍 Tarea 5: Documentar Contratos**

##### **Interfaces Actuales:**
```typescript
// ProcessMessageParams (legacy)
interface ProcessMessageParams {
    accountId: string;
    relationshipId: string;
    conversationId: string;
    message: {...};
    policyContext?: any;
    automationMode?: string;
    activeRuntimeId?: string;
}

// ProcessMessageResult (legacy)
interface ProcessMessageResult {
    extensionId: string;
    success: boolean;
    handled?: boolean;
    stopPropagation?: boolean;
    actions?: any[];
}

// RuntimeHandleInput (new)
interface RuntimeHandleInput {
    envelope: MessageEnvelope;
    policyContext: FluxPolicyContext;
}

// ExecutionResult (new)
interface ExecutionResult {
    actions: ExecutionAction[];
}
```

---

## 📋 **Entregables Día 1**

### **✅ Completados:**
- [ ] Diagrama de flujo completo (legacy vs actual vs deseado)
- [ ] Lista de componentes críticos identificados
- [ ] Puntos de intervención mapeados
- [ ] Estado actual validado (DB + componentes)
- [ ] Contratos existentes documentados

### **📊 Estado Actual Confirmado:**
- **Fluxi caído:** Confirmado
- **Root cause:** No registrado como RuntimeAdapter
- **Impacto:** Sistema de turnos inoperativo
- **Solución:** Migración a RuntimeAdapter pattern

---

## 🎯 **Próximos Pasos (Día 2)**

### **Mañana (Día 2):**
- [ ] Validación cruzada de flujos
- [ ] Identificación de dependencias ocultas
- [ ] Documentación de puntos de fallo

### **Tarde (Día 2):**
- [ ] Verificación de estado de datos
- [ ] Documentación de contratos existentes
- [ ] Preparación para Fase 2

---

## 🔄 **Validación de Entendimiento**

### **✅ Confirmado:**
1. **Flujo legacy:** ExtensionHost → Fluxi.onMessage()
2. **Flujo actual:** RuntimeGateway.invoke() → FALLA
3. **Flujo deseado:** FluxiRuntimeAdapter.handleMessage()
4. **Root cause:** Fluxi no está registrado como runtime
5. **Impacto:** Sistema de turnos completamente roto

### **✅ Listo para Fase 2:**
- Tenemos el territorio completamente mapeado
- Identificamos todos los componentes críticos
- Conocemos exactamente qué hay que cambiar
- Validamos el estado actual

---

**🎯 Fase 1 Día 1 completado exitosamente. Territorio mapeado y entendido.**
