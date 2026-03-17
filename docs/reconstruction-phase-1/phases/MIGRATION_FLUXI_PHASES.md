# 📋 **Fases Detalladas de Migración: Fluxi/WES**

**Basado en:** MIGRATION_FLUXI_PLAN.md  
**Metodología:** SYSTEM_REFACTORING_METHODOLOGY.md  
**Componente:** @fluxcore/fluxi (Work Execution System)

---

## 🗓️ **Fase 1: Cartografía del Sistema (2 días)**

### **Día 1: Mapeo de Flujos y Componentes**

#### **Mañana (3 horas)**
- [ ] **Diagramar flujo actual completo**
  - Mensaje → MessageDispatch → ExtensionHost → Fluxi.onMessage()
  - Fluxi → workEngineService → DB operations
  - Fluxi → messageCore.send() → Response
  - Stop propagation → MessageDispatch stops

#### **Tarde (3 horas)**
- [ ] **Identificar todos los puntos de intervención**
  - Entry point: `onMessage(params)`
  - Service injection: `setServices(services)`
  - State management: `getActiveWork()`
  - Actions generation: `return { handled, stopPropagation, actions }`

#### **Entregables Día 1**
- ✅ Diagrama de flujo actual
- ✅ Lista de componentes y dependencias
- ✅ Puntos críticos identificados

### **Día 2: Validación y Documentación**

#### **Mañana (3 horas)**
- [ ] **Verificar estado actual de datos**
  - Consultar works existentes en DB
  - Validar work definitions
  - Confirmar runtime registration

#### **Tarde (3 horas)**
- [ ] **Documentar contratos existentes**
  - `ProcessMessageParams` interface
  - `ProcessMessageResult` structure
  - Action types y payloads
  - Error handling

#### **Entregables Día 2**
- ✅ Estado validado
- ✅ Contratos documentados
- ✅ Fase 1 completada

---

## 🗓️ **Fase 2: Planificación Estructurada (1 día)**

### **Mañana (4 horas)**

#### **Definición de Cambios Específicos**
- [ ] **Archivos a modificar**
  ```
  - apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts
  - apps/api/src/services/fluxcore/runtime-gateway.service.ts  
  - apps/api/src/services/fluxcore/action-executor.service.ts
  - extensions/fluxcore-fluxi/src/index.ts
  ```

- [ ] **Nuevos archivos a crear**
  ```
  - apps/api/src/services/fluxcore/runtimes/fluxi-runtime.adapter.ts
  - apps/api/src/services/fluxcore/fluxi-dependency-injection.ts
  ```

#### **Criterio de Éxito**
- [ ] **Funcionalidad preservada**
  - Semantic confirmation funciona
  - Work resumption funciona
  - New work interpretation funciona
  - Stop propagation funciona

### **Tarde (4 horas)**

#### **Análisis de Riesgos**
- [ ] **Identificar puntos de fallo**
  - Dependency injection migration
  - Stop propagation mechanism
  - State management
  - Error handling

- [ ] **Plan de mitigación**
  - Tests unitarios por componente
  - Integration tests
  - Rollback procedure
  - Monitoring strategy

#### **Entregables Fase 2**
- ✅ Cambios específicos definidos
- ✅ Criterios de éxito establecidos
- ✅ Riesgos identificados y mitigados
- ✅ Checklist de validación creado

---

## 🗓️ **Fase 3: Implementación Incremental (4 días)**

### **Día 3: FluxiRuntimeAdapter**

#### **Mañana (4 horas)**
- [ ] **Crear FluxiRuntimeAdapter**
  ```typescript
  // apps/api/src/services/fluxcore/runtimes/fluxi-runtime.adapter.ts
  export class FluxiRuntimeAdapter implements RuntimeAdapter {
      async handleMessage(input: RuntimeHandleInput): Promise<ExecutionResult> {
          // Migrar lógica de onMessage()
      }
  }
  ```

#### **Tarde (4 horas)**
- [ ] **Migrar lógica core**
  - Semantic confirmation logic
  - Work resumption logic
  - New work interpretation logic
  - Terminal handler logic

### **Día 4: Stop Propagation**

#### **Mañana (4 horas)**
- [ ] **Implementar stop propagation en ActionExecutor**
  ```typescript
  // apps/api/src/services/fluxcore/action-executor.service.ts
  if (actions.some(a => a.type.startsWith('wes:'))) {
      return { actions, stopped: true };
  }
  ```

#### **Tarde (4 horas)**
- [ ] **Adaptar CognitiveDispatcher**
  - Detectar acciones de Fluxi
  - Respetar stop propagation
  - Mantener compatibilidad

### **Día 5: Dependency Injection**

#### **Mañana (4 horas)**
- [ ] **Crear sistema de inyección para CognitionWorker**
  ```typescript
  // apps/api/src/services/fluxcore/fluxi-dependency-injection.ts
  export function createFluxiServices(): FluxiServices {
      return {
          workEngineService,
          messageCore,
          // ... otros servicios
      };
  }
  ```

#### **Tarde (4 horas)**
- [ ] **Migrar setServices()**
  - Adaptar a nuevo contexto
  - Mantener compatibilidad
  - Testing unitario

### **Día 6: Runtime Registration**

#### **Mañana (4 horas)**
- [ ] **Registrar Fluxi como runtime**
  ```typescript
  // apps/api/src/server.ts
  runtimeGateway.register(new FluxiRuntimeAdapter());
  ```

#### **Tarde (4 horas)**
- [ ] **Testing paralelo**
  - Mantener legacy path activo
  - Añadir switch de selección
  - Comparar resultados

#### **Entregables Fase 3**
- ✅ FluxiRuntimeAdapter implementado
- ✅ Stop propagation funcionando
- ✅ Dependency injection migrado
- ✅ Runtime registrado
- ✅ Testing paralelo operativo

---

## 🗓️ **Fase 4: Validación Sistemática (2 días)**

### **Día 7: Testing de Funcionalidad**

#### **Mañana (4 horas)**
- [ ] **Test Semantic Confirmation**
  ```
  Input: "Confirmo turno para el martes"
  Expected: wes:semantic_commit action
  Validation: Work actualizado en DB
  ```

#### **Tarde (4 horas)**
- [ ] **Test Work Resumption**
  ```
  Input: "Cambiar hora a las 3pm"  
  Expected: wes:resume_work action
  Validation: Slot actualizado
  ```

### **Día 8: Testing de Integración**

#### **Mañana (4 horas)**
- [ ] **Test New Work Interpretation**
  ```
  Input: "Quiero turno para mañana"
  Expected: wes:open_work action
  Validation: Nuevo work creado
  ```

#### **Tarde (4 horas)**
- [ ] **Test Stop Propagation**
  ```
  Input: Cualquier comando Fluxi
  Expected: Solo Fluxi responde
  Validation: IA no interviene
  ```

#### **Entregables Fase 4**
- ✅ Todos los tests funcionales pasando
- ✅ Tests de integración pasando
- ✅ Stop propagation verificado
- ✅ Performance validado

---

## 🎯 **Checklists Detallados**

### **Checklist de Pre-Migración**
```markdown
- [ ] Backup completo de fluxcore_works
- [ ] Backup de fluxcore_work_definitions  
- [ ] Tests unitarios existentes pasando
- [ ] Documentación actualizada
- [ ] Stakeholders informados
- [ ] Environment de pruebas listo
- [ ] Rollback procedure documentado
```

### **Checklist de Implementación**
```markdown
- [ ] FluxiRuntimeAdapter creado
- [ ] Lógica migrada sin cambios
- [ ] Stop propagation implementado
- [ ] Dependency injection funcionando
- [ ] Runtime registrado exitosamente
- [ ] Tests unitarios nuevos pasando
- [ ] Integration tests creados
```

### **Checklist de Validación**
```markdown
- [ ] Semantic confirmation funciona
- [ ] Work resumption funciona
- [ ] New work interpretation funciona
- [ ] Terminal handler funciona
- [ ] Stop propagation previene double processing
- [ ] Workflows existentes completan
- [ ] No hay regresiones en ChatCore
- [ ] Performance aceptable
- [ ] Logs claros y útiles
```

### **Checklist de Post-Migración**
```markdown
- [ ] Legacy path puede eliminarse
- [ ] Documentación actualizada
- [ ] Monitoreo configurado
- [ ] Equipo entrenado
- [ ] Lecciones aprendidas documentadas
```

---

## 📊 **Métricas de Éxito**

### **Métricas Funcionales**
- ✅ 100% de workflows existentes funcionan
- ✅ 100% de nuevos workflows se crean
- ✅ 0% de double processing
- ✅ < 100ms latency adicional

### **Métricas Técnicas**
- ✅ 0 errores en logs
- ✅ 0 regresiones en tests
- ✅ < 10% overhead de performance
- ✅ 100% coverage de nuevos componentes

---

## 🔄 **Siguiente Paso**

**Comenzar Fase 1: Cartografía del Sistema**
- Validar diagrama de flujo actual
- Confirmar todos los componentes identificados
- Verificar estado de datos en producción

**Listos para proceder con la migración metódica de Fluxi/WES.**
