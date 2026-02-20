# H0.6: Estrategia de Migración y Plan de Datos

**Fecha:** 2026-02-17  
**Objetivo:** Definir estrategia de coexistencia, activación gradual y métricas de éxito

---

## 1. ESTRATEGIA DE COEXISTENCIA

### 1.1 Feature Flag por Cuenta

**Mecanismo:** Campo `useNewArchitecture: boolean` en `extension_installations.config`

```typescript
interface ExtensionConfig {
  // ... otros campos
  useNewArchitecture?: boolean; // default: false
}
```

**Comportamiento:**

**`useNewArchitecture = false` (DEFAULT):**
- ChatProjector NO encola en `fluxcore_cognition_queue`
- MessageCore emite `core:message_received` (legacy)
- ExtensionHost procesa mensaje
- Runtimes legacy se invocan

**`useNewArchitecture = true`:**
- ChatProjector encola en `fluxcore_cognition_queue`
- CognitionWorker consume cola
- CognitiveDispatcher invoca RuntimeGateway
- Nuevos runtimes se invocan
- ActionExecutor ejecuta acciones

**Invariante crítico:** NUNCA mezclar ambos caminos para la misma cuenta.

### 1.2 Implementación del Feature Flag

**H2.6 - Modificaciones requeridas:**

**1. ChatProjector:**
```typescript
async project(signal: KernelSignal, tx: Transaction) {
  // ... proyección normal
  
  // Solo encolar si nueva arquitectura está activa
  const config = await this.getAccountConfig(accountId);
  if (config.useNewArchitecture) {
    await this.enqueueCognition(signal, tx);
  }
}
```

**2. CognitionWorker:**
```typescript
async processQueue() {
  const entries = await this.fetchReadyEntries();
  
  for (const entry of entries) {
    // Verificar que cuenta sigue usando nueva arquitectura
    const config = await this.getAccountConfig(entry.accountId);
    if (!config.useNewArchitecture) {
      // Marcar como procesado sin ejecutar
      await this.markProcessed(entry.id);
      continue;
    }
    
    // Procesar normalmente
    await this.dispatch(entry);
  }
}
```

**3. UI Admin:**
```typescript
// Componente para activar/desactivar flag
<Toggle
  label="Usar nueva arquitectura FluxCore v8.2"
  checked={config.useNewArchitecture}
  onChange={(value) => updateConfig({ useNewArchitecture: value })}
  disabled={!isAdmin}
/>
```

---

## 2. PLAN DE ACTIVACIÓN GRADUAL

### 2.1 Fase 1: Cuentas Internas (H6.1)

**Objetivo:** Validar funcionamiento básico en entorno controlado.

**Cuentas:**
- 2-3 cuentas de equipo interno
- Cuentas con volumen bajo-medio de mensajes
- Cuentas con asistentes configurados

**Duración:** 24-48 horas

**Criterios de éxito:**
- ✅ Mensajes se procesan correctamente
- ✅ Respuestas de IA se generan
- ✅ No hay errores críticos en logs
- ✅ Invariantes se cumplen (script de validación)

**Rollback:** Si falla, desactivar flag y revertir a legacy.

### 2.2 Fase 2: 10% de Cuentas (H6.4)

**Objetivo:** Validar escalabilidad y estabilidad.

**Selección:**
- 10% de cuentas activas (últimos 7 días)
- Distribución aleatoria
- Excluir cuentas críticas de clientes

**Duración:** 1 semana

**Métricas a monitorear:**
- Latencia P50, P95, P99 de respuestas
- Tasa de error por cuenta
- Throughput de CognitionWorker
- Tamaño de cola de cognición

**Criterios de éxito:**
- ✅ Latencia P95 < 5 segundos (incluyendo turn-window)
- ✅ Tasa de error < 0.5%
- ✅ Cola de cognición no crece indefinidamente
- ✅ Métricas comparables o mejores que legacy

**Rollback:** Si métricas degradan >20%, pausar activación y diagnosticar.

### 2.3 Fase 3: 50% de Cuentas (H6.5)

**Objetivo:** Validar capacidad de carga completa.

**Selección:**
- 50% de cuentas activas
- Incluir cuentas de clientes (no críticos)

**Duración:** 1 semana

**Métricas adicionales:**
- Uso de CPU/memoria de CognitionWorker
- Latencia de DB en queries de cognition_queue
- Distribución de turn-window (¿cuántos turnos se agregan?)

**Criterios de éxito:**
- ✅ Sistema estable bajo carga
- ✅ No hay degradación de performance
- ✅ Feedback de usuarios positivo o neutral

**Rollback:** Si hay incidentes críticos, reducir a 10% y diagnosticar.

### 2.4 Fase 4: 100% de Cuentas (H6.6)

**Objetivo:** Migración completa.

**Selección:** Todas las cuentas

**Duración:** 2 semanas de monitoreo

**Criterios de éxito:**
- ✅ Sistema legacy no recibe tráfico
- ✅ Todas las métricas dentro de SLOs
- ✅ No hay regresiones reportadas

**Siguiente paso:** H7 - Eliminar código legacy.

---

## 3. MÉTRICAS DE ÉXITO

### 3.1 Métricas Técnicas

**Latencia:**
- P50 de tiempo total (ingesta → respuesta): < 2s
- P95 de tiempo total: < 5s
- P99 de tiempo total: < 10s

**Throughput:**
- Mensajes procesados por segundo: >= legacy
- Turnos procesados por segundo: >= mensajes/3 (asumiendo ráfagas de 3)

**Errores:**
- Tasa de error global: < 0.1%
- Tasa de error por cuenta: < 0.5%
- Errores de proyectores: 0 (deben ser atómicos)

**Cola de Cognición:**
- Tamaño promedio: < 100 entradas
- Tiempo de espera promedio: < turn_window + 1s
- Entradas bloqueadas (sin identidad): < 1%

### 3.2 Métricas de Negocio

**Calidad de Respuestas:**
- Tasa de aprobación de sugerencias: >= legacy
- Tasa de edición de sugerencias: <= legacy
- Feedback de usuarios: neutral o positivo

**Eficiencia:**
- Tokens consumidos por conversación: <= legacy (gracias a turn-window)
- Respuestas redundantes: 0 (turn-window debe eliminarlas)

**Disponibilidad:**
- Uptime: >= 99.9%
- Tiempo de recuperación ante fallas: < 5 minutos

### 3.3 Métricas de Invariantes

**Ejecutar cada hora:**
```sql
-- Invariante 1: No hay mensajes duplicados por signal_id
SELECT signal_id, COUNT(*) 
FROM messages 
WHERE signal_id IS NOT NULL 
GROUP BY signal_id 
HAVING COUNT(*) > 1;
-- Expectativa: 0 filas

-- Invariante 2: Máximo una entrada pendiente por conversation_id
SELECT conversation_id, COUNT(*) 
FROM fluxcore_cognition_queue 
WHERE processed_at IS NULL 
GROUP BY conversation_id 
HAVING COUNT(*) > 1;
-- Expectativa: 0 filas

-- Invariante 3: Cursores no adelantados al Journal
SELECT p.projector_name, p.last_sequence_number, MAX(s.sequence_number) as max_seq
FROM fluxcore_projector_cursors p
CROSS JOIN fluxcore_signals s
GROUP BY p.projector_name, p.last_sequence_number
HAVING p.last_sequence_number > MAX(s.sequence_number);
-- Expectativa: 0 filas

-- Invariante 4: Cola no crece indefinidamente
SELECT COUNT(*) as pending_count,
       MIN(turn_window_expires_at) as oldest_expired
FROM fluxcore_cognition_queue
WHERE processed_at IS NULL AND turn_window_expires_at < now();
-- Expectativa: pending_count < 100, oldest_expired < now() - 1 minute
```

---

## 4. DASHBOARD DE MONITOREO

### 4.1 Métricas en Tiempo Real

**Panel 1: Throughput**
- Mensajes ingresados por minuto (legacy vs nuevo)
- Turnos procesados por minuto
- Acciones ejecutadas por minuto

**Panel 2: Latencia**
- Histograma de latencia total (P50, P95, P99)
- Latencia por componente:
  - Kernel ingestion
  - Proyección (identity + chat)
  - Turn-window wait
  - Runtime invocation
  - Action execution

**Panel 3: Errores**
- Tasa de error global
- Errores por componente (proyectores, dispatcher, runtimes, executor)
- Top 5 errores más frecuentes

**Panel 4: Cola de Cognición**
- Tamaño de cola (pending)
- Distribución de turn-window (histograma)
- Entradas bloqueadas por falta de identidad
- Reintentos por error

**Panel 5: Runtimes**
- Distribución de invocaciones por runtime (AsistentesLocal, Fluxi, OpenAI)
- Tasa de éxito por runtime
- Latencia promedio por runtime

**Panel 6: Invariantes**
- Estado de validación de invariantes (✅ / ❌)
- Última ejecución de script de validación
- Alertas activas

### 4.2 Alertas

**Críticas (PagerDuty):**
- Cola de cognición > 500 entradas
- Tasa de error > 1%
- Invariante violado
- Proyector crasheado (no avanza cursor por >5 minutos)

**Warnings (Slack):**
- Cola de cognición > 100 entradas
- Tasa de error > 0.5%
- Latencia P95 > 7 segundos
- Entradas bloqueadas > 5%

---

## 5. PLAN DE ROLLBACK

### 5.1 Rollback Inmediato (< 5 minutos)

**Trigger:** Error crítico, invariante violado, sistema inestable

**Procedimiento:**
1. Desactivar `useNewArchitecture` para todas las cuentas afectadas
2. Reiniciar CognitionWorker (detener procesamiento)
3. Verificar que sistema legacy procesa mensajes
4. Monitorear por 15 minutos

**Consecuencia:** Mensajes encolados en `cognition_queue` quedan pendientes. Se procesarán cuando se reactive.

### 5.2 Rollback Gradual (1 hora)

**Trigger:** Degradación de métricas, feedback negativo de usuarios

**Procedimiento:**
1. Reducir porcentaje de cuentas activas (100% → 50% → 10% → 0%)
2. Monitorear métricas en cada paso
3. Identificar causa raíz
4. Decidir: fix forward o rollback completo

### 5.3 Rollback con Limpieza (1 día)

**Trigger:** Decisión de abortar migración

**Procedimiento:**
1. Desactivar `useNewArchitecture` para todas las cuentas
2. Detener CognitionWorker
3. Limpiar `fluxcore_cognition_queue` (marcar todo como procesado)
4. Opcional: Eliminar tablas de v8.2 si no se reintentará

---

## 6. MANEJO DE DATOS LEGACY

### 6.1 Mensajes sin `signal_id`

**Problema:** Mensajes creados antes de H1 no tienen `signal_id`.

**Estrategia:**
- Constraint `UNIQUE (signal_id) WHERE signal_id IS NOT NULL`
- Mensajes legacy quedan con `signal_id = NULL`
- Son válidos pero no reconstruibles desde Journal

**Query de verificación:**
```sql
SELECT 
  COUNT(*) as total_messages,
  COUNT(signal_id) as with_signal_id,
  COUNT(*) - COUNT(signal_id) as legacy_messages,
  ROUND(100.0 * COUNT(signal_id) / COUNT(*), 2) as coverage_pct
FROM messages;
```

**Expectativa:** Después de H1, `coverage_pct` debe crecer hasta ~100% en semanas.

### 6.2 Reconstrucción desde Journal

**Escenario:** Necesidad de reconstruir estado desde Journal (disaster recovery).

**Procedimiento:**
1. Resetear cursores de proyectores a 0
2. Truncar tablas derivadas (`messages`, `conversations`, etc.)
3. Ejecutar proyectores desde sequence_number=0
4. Verificar que estado final coincide con backup

**Limitación:** Mensajes legacy (sin `signal_id`) no se reconstruyen.

**Mitigación:** Mantener backups de tablas derivadas por 90 días.

### 6.3 Migración de Configuración

**Problema:** Configuración actual puede estar en formatos legacy.

**Estrategia:**
- `FluxPolicyContextService` lee de `extension_installations.config`
- Si campo no existe, usar default sensato
- No migrar datos automáticamente (lazy migration)

**Ejemplo:**
```typescript
const mode = config.mode || 'suggest'; // default si no existe
const turnWindowMs = config.turnWindowMs || 3000; // default 3s
```

---

## 7. DECISIONES PENDIENTES

### 7.1 AgentRuntime

**Pregunta:** ¿Qué hacer con `AgentRuntimeAdapter`?

**Opciones:**
1. **Eliminar** - No es runtime canónico según v8.2
2. **Migrar a Fluxi** - Si la lógica de flows es valiosa
3. **Mantener como experimental** - Fuera del Canon

**Análisis:**
- AgentRuntime tiene 185 líneas
- Usa `flowRegistryService` y `executeFlow`
- Accede a DB 4 veces durante `handleMessage` (viola soberanía)

**Recomendación:** **Opción 1 - Eliminar en H7**

**Razón:** No hay evidencia de uso en producción. Si se necesita en el futuro, reimplementar como Fluxi Work.

**Decisión final:** Usuario debe confirmar.

### 7.2 SmartDelay

**Pregunta:** ¿Mantener SmartDelay o usar `PolicyContext.responseDelayMs`?

**Opciones:**
1. **Eliminar** - Usar `responseDelayMs` simple
2. **Mover a CognitionWorker** - Scheduling antes de invocar runtime
3. **Mantener en runtime** - Pero refactorizar para no ejecutar efectos

**Análisis:**
- SmartDelay tiene lógica de debounce por conversación
- Actualmente ejecuta `messageCore.send()` directamente (viola soberanía)
- Puede ser valioso para UX (evitar respuestas muy rápidas)

**Recomendación:** **Opción 2 - Mover a CognitionWorker**

**Implementación:**
```typescript
// CognitionWorker
async dispatch(entry: CognitionQueueEntry) {
  const policyContext = await this.resolvePolicyContext(entry);
  
  // Aplicar responseDelayMs antes de invocar runtime
  if (policyContext.responseDelayMs > 0) {
    await sleep(policyContext.responseDelayMs);
  }
  
  // Invocar dispatcher
  await this.cognitiveDispatcher.dispatch(entry, policyContext);
}
```

**Decisión final:** Usuario debe confirmar.

---

## 8. CRONOGRAMA DETALLADO

### Semana 1-2: H0 + H1
- H0: Auditorías (completado)
- H1: Proyectores atómicos + cognition_queue

### Semana 3-4: H2
- Infraestructura de cognición
- Feature flags

### Semana 5-6: H3
- Runtime Asistentes Local

### Semana 7-9: H4
- Runtime Fluxi/WES

### Semana 10: H5
- Runtime Asistentes OpenAI

### Semana 11: H6
- Activación gradual (4 fases)

### Semana 12: H7
- Eliminación de código legacy

### Semana 13-14: H8
- Herramientas y extensibilidad

### Semana 15-16: H9
- Optimizaciones

**Total:** 15-16 semanas (3.5-4 meses)

---

## RESUMEN EJECUTIVO

### Estrategia de Coexistencia
- ✅ Feature flag por cuenta (`useNewArchitecture`)
- ✅ Caminos completamente separados (no mezclar)
- ✅ Rollback inmediato posible

### Plan de Activación
1. Cuentas internas (24-48h)
2. 10% de cuentas (1 semana)
3. 50% de cuentas (1 semana)
4. 100% de cuentas (2 semanas)

### Métricas de Éxito
- Latencia P95 < 5s
- Tasa de error < 0.1%
- Invariantes cumplidos 100%
- Throughput >= legacy

### Decisiones Pendientes
1. **AgentRuntime:** Eliminar (recomendado)
2. **SmartDelay:** Mover a CognitionWorker (recomendado)

### Riesgos Principales
- Mensajes legacy sin `signal_id` (mitigado con constraint parcial)
- Performance de turn-window (mitigado con configuración por canal)
- Rollback puede dejar mensajes pendientes (aceptable, se procesan después)

### Estimado Total
**15-16 semanas** (3.5-4 meses) desde H0 hasta H9 completado.

**Bloqueadores:** Ninguno identificado. Todas las auditorías confirman viabilidad.
