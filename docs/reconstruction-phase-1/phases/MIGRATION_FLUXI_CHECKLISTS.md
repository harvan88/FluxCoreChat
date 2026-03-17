# ✅ **Checklists de Validación: Migración Fluxi/WES**

**Basado en:** MIGRATION_FLUXI_PLAN.md + MIGRATION_FLUXI_PHASES.md  
**Propósito:** Validación sistemática de cada fase de la migración

---

## 🎯 **Checklist Maestro de Migración**

### **📋 Pre-Migración (Antes de Empezar)**

#### **Validación de Estado Actual**
- [ ] **Base de datos validada**
  - [ ] `SELECT COUNT(*) FROM fluxcore_works` = 2 (o current count)
  - [ ] `SELECT COUNT(*) FROM fluxcore_work_definitions` = 1 (o current count)
  - [ ] Works existentes en estado no-terminal (DRAFT, ACTIVE)
  - [ ] Work definitions válidas con JSON schema correcto

- [ ] **Runtime Fluxi funcional**
  - [ ] `fluxi-runtime` registrado en RuntimeGateway
  - [ ] Logs muestran `[@fluxcore/fluxi]` activo
  - [ ] ExtensionHost puede llamar a `onMessage()`
  - [ ] Stop propagation funcionando en legacy path

- [ ] **Tests existentes**
  - [ ] Unit tests de Fluxi pasan
  - [ ] Integration tests de WES pasan
  - [ ] Tests de ExtensionHost pasan
  - [ ] Tests de WorkEngineService pasan

#### **Preparación de Entorno**
- [ ] **Backup de datos**
  - [ ] Backup de tablas fluxcore_works
  - [ ] Backup de tablas fluxcore_work_definitions
  - [ ] Backup de tablas relacionadas (slots, events, etc.)
  - [ ] Backup documentado y accesible

- [ ] **Documentación lista**
  - [ ] MIGRATION_FLUXI_PLAN.md aprobado
  - [ ] MIGRATION_FLUXI_PHASES.md revisado
  - [ ] DOCUMENTATION_INDEX.md actualizado
  - [ ] Stakeholders informados del plan

- [ ] **Entorno de preparación**
  - [ ] Branch de migración creado
  - [ ] Environment de pruebas configurado
  - [ ] Herramientas de monitoreo listas
  - [ ] Rollback procedure documentado

---

## 🗂️ **Checklists por Fase**

### **Fase 1: Cartografía del Sistema**

#### **Día 1: Mapeo de Flujos**
- [ ] **Flujo de mensaje completo documentado**
  - [ ] Entry point: `MessageDispatch.receive()`
  - [ ] Legacy path: `extensionHost.processMessage()`
  - [ ] Fluxi entry: `FluxiExtension.onMessage()`
  - [ ] Salida: `messageCore.send()` o actions
  - [ ] Stop propagation: ExtensionHost respetando `stopPropagation: true`

- [ ] **Componentes críticos identificados**
  - [ ] `FluxiExtension` (main class)
  - [ ] `WesInterpreter` (IA interpretation)
  - [ ] `workEngineService` (state management)
  - [ ] `messageCore` (responses)
  - [ ] Dependency injection via `setServices()`

- [ ] **Puntos de intervención mapeados**
  - [ ] Semantic confirmation (line 56-74)
  - [ ] Work resumption (line 77-97)
  - [ ] New work interpretation (line 100-144)
  - [ ] Terminal handler (line 147-155)

#### **Día 2: Validación y Documentación**
- [ ] **Estado de datos validado**
  - [ ] Works existentes accesibles via API
  - [ ] Work definitions load correctamente
  - [ ] Historia de eventos intacta
  - [ ] No data corruption

- [ ] **Contratos documentados**
  - [ ] `ProcessMessageParams` interface mapeado
  - [ ] `ProcessMessageResult` structure definido
  - [ ] Action types catalogados
  - [ ] Error handling entendido

#### **Criterio de Éxito Fase 1**
- [ ] ✅ Diagrama de flujo completo creado
- [ ] ✅ Todos los componentes identificados
- [ ] ✅ Puntos críticos documentados
- [ ] ✅ Estado validado sin sorpresas

---

### **Fase 2: Planificación Estructurada**

#### **Definición de Cambios**
- [ ] **Archivos a modificar listados**
  - [ ] `cognitive-dispatcher.service.ts` - cambios específicos
  - [ ] `runtime-gateway.service.ts` - cambios específicos
  - [ ] `action-executor.service.ts` - cambios específicos
  - [ ] `extensions/fluxcore-fluxi/src/index.ts` - cambios específicos

- [ ] **Nuevos archivos diseñados**
  - [ ] `fluxi-runtime.adapter.ts` - estructura definida
  - [ ] `fluxi-dependency-injection.ts` - diseño listo
  - [ ] Tests para nuevos componentes - plan listos

#### **Análisis de Riesgos**
- [ ] **Riesgos identificados**
  - [ ] Dependency injection migration - impacto entendido
  - [ ] Stop propagation mechanism - solución diseñada
  - [ ] State management continuity - estrategia definida
  - [ ] Performance impact - mitigación planeada

- [ ] **Mitigaciones documentadas**
  - [ ] Tests unitarios por componente
  - [ ] Integration tests end-to-end
  - [ ] Canary deployment strategy
  - [ ] Rollback procedure tested

#### **Criterio de Éxito Fase 2**
- [ ] ✅ Cambios específicos definidos
- [ ] ✅ Criterios de éxito medibles
- [ ] ✅ Riesgos con mitigación
- [ ] ✅ Checklist completo

---

### **Fase 3: Implementación Incremental**

#### **Día 3: FluxiRuntimeAdapter**
- [ ] **FluxiRuntimeAdapter creado**
  - [ ] Clase `FluxiRuntimeAdapter` implementada
  - [ ] `handleMessage()` method migrado
  - [ ] Lógica de semantic confirmation migrada
  - [ ] Lógica de work resumption migrada
  - [ ] Lógica de new work interpretation migrada
  - [ ] Terminal handler migrado

- [ ] **Tests unitarios pasando**
  - [ ] Test semantic confirmation
  - [ ] Test work resumption
  - [ ] Test new work interpretation
  - [ ] Test terminal handler
  - [ ] Test error handling

#### **Día 4: Stop Propagation**
- [ ] **Stop propagation implementado**
  - [ ] `action-executor.service.ts` modificado
  - [ ] Detección de acciones `wes:*` funciona
  - [ ] Early return con `stopped: true` funciona
  - [ ] CognitiveDispatcher respeta stop

- [ ] **Tests de stop propagation**
  - [ ] Test prevención de double processing
  - [ ] Test solo Fluxi responde
  - [ ] Test IA conversacional no interviene
  - [ ] Test actions ejecutadas correctamente

#### **Día 5: Dependency Injection**
- [ ] **Dependency injection migrado**
  - [ ] `fluxi-dependency-injection.ts` creado
  - [ ] `createFluxiServices()` funciona
  - [ ] `setServices()` adaptado a nuevo contexto
  - [ ] Todos los servicios inyectados correctamente

- [ ] **Tests de dependency injection**
  - [ ] Test workEngineService injection
  - [ ] Test messageCore injection
  - [ ] Test otros servicios injection
  - [ ] Test error handling si service missing

#### **Día 6: Runtime Registration**
- [ ] **Runtime registrado**
  - [ ] `server.ts` modificado para registrar Fluxi
  - [ ] RuntimeGateway reconoce Fluxi
  - [ ] Switch legacy/new implementado
  - [ ] Testing paralelo configurado

- [ ] **Testing paralelo**
  - [ ] Legacy path activo
  - [ ] New path activo
  - [ ] Comparador de resultados implementado
  - [ ] Logs side-by-side funcionando

#### **Criterio de Éxito Fase 3**
- [ ] ✅ Todos los componentes migrados
- [ ] ✅ Tests unitarios pasando
- [ ] ✅ Integration tests parciales pasando
- [ ] ✅ No breaking changes

---

### **Fase 4: Validación Sistemática**

#### **Día 7: Testing Funcional**
- [ ] **Semantic Confirmation Test**
  ```
  Scenario: Usuario confirma trabajo propuesto
  Given: Trabajo propuesto existente
  When: Usuario dice "Confirmo turno para el martes"
  Then: Action wes:semantic_commit ejecutada
  And: Work actualizado en DB
  And: Stop propagation activado
  ```

- [ ] **Work Resumption Test**
  ```
  Scenario: Usuario actualiza trabajo activo
  Given: Trabajo activo existente
  When: Usuario dice "Cambiar hora a las 3pm"
  Then: Action wes:resume_work ejecutada
  And: Slot actualizado en DB
  And: Stop propagation activado
  ```

- [ ] **New Work Interpretation Test**
  ```
  Scenario: Usuario solicita nuevo trabajo
  Given: Work definition disponible
  When: Usuario dice "Quiero turno para mañana"
  Then: Action wes:open_work ejecutada
  And: Nuevo work creado en DB
  And: Respuesta de confirmación enviada
  ```

#### **Día 8: Testing de Integración**
- [ ] **Stop Propagation Test**
  ```
  Scenario: Validar prevención de double processing
  Given: Fluxi activo como runtime
  When: Mensaje que activa Fluxi
  Then: Solo Fluxi responde
  And: IA conversacional no responde
  And: Solo un conjunto de actions ejecutado
  ```

- [ ] **Performance Test**
  ```
  Scenario: Validar performance aceptable
  Given: Carga de mensajes normal
  When: Procesamiento vía nuevo path
  Then: Latency < 100ms adicional
  And: CPU < 10% adicional
  And: Memory < 5% adicional
  ```

- [ ] **Regression Test**
  ```
  Scenario: Validar no regresiones
  Given: Todos los workflows existentes
  When: Ejecutar via nuevo path
  Then: Resultados idénticos a legacy path
  And: ChatCore sigue funcionando
  And: Otras extensiones no afectadas
  ```

#### **Criterio de Éxito Fase 4**
- [ ] ✅ Todos los tests funcionales pasando
- [ ] ✅ Tests de integración pasando
- [ ] ✅ Performance aceptable
- [ ] ✅ 0 regresiones detectadas

---

## 🎯 **Checklist Final de Post-Migración**

### **Validación de Producción**
- [ ] **Legacy path puede eliminarse**
  - [ ] FLUX_NEW_ARCHITECTURE flag puede removerse
  - [ ] ExtensionHost legacy code puede eliminarse
  - [ ] RuntimeGateway legacy path puede eliminarse
  - [ ] No referencias rotas

- [ ] **Monitoreo configurado**
  - [ ] Metrics para Fluxi runtime
  - [ ] Alerts para errores de WES
  - [ ] Dashboards para workflows
  - [ ] Logs estructurados configurados

- [ ] **Documentación actualizada**
  - [ ] Architecture docs actualizadas
  - [ ] API docs actualizadas
  - [ ] Runbooks actualizados
  - [ ] Lecciones aprendidas documentadas

### **Validación de Negocio**
- [ ] **Workflows existentes funcionando**
  - [ ] Turnos existentes completan
  - [ ] Estados correctos en DB
  - [ ] Usuarios no afectados
  - [ ] Reports correctos

- [ ] **Nuevos workflows funcionando**
  - [ ] Nuevos turnos se crean
  - [ ] Interpretación funciona
  - [ ] Confirmaciones automáticas funcionan
  - [ ] Cancelaciones funcionan

### **Criterio de Éxito Final**
- [ ] ✅ **Funcionalidad 100% preservada**
- [ ] ✅ **Performance aceptable**
- [ ] ✅ **0 regresiones**
- [ ] ✅ **Legacy code eliminado**
- [ ] ✅ **Equipo capacitado**
- [ ] ✅ **Documentación completa**

---

## 🚨 **Rollback Checklist (Si es Necesario)**

### **Señales de Rollback**
- [ ] **Critical errors en producción**
- [ ] **Data corruption detectada**
- [ ] **Performance degradation severa**
- [ ] **Funcionalidad crítica rota**

### **Procedimiento de Rollback**
- [ ] **Switch a legacy path**
  - [ ] FLUX_NEW_ARCHITECTURE=false
  - [ ] Restart de servicios
  - [ ] Validar funcionamiento

- [ ] **Investigación de root cause**
  - [ ] Logs analizados
  - [ ] Issues identificados
  - [ ] Fix implementado

- [ ] **Re-migración controlada**
  - [ ] Issues resueltos
  - [ ] Tests adicionales
  - [ ] Migración reintentada

---

**✅ Checklist completo para migración segura y metódica de Fluxi/WES.**
