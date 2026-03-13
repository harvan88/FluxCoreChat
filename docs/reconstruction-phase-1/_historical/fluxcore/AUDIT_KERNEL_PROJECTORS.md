# Auditoría H0.1: Kernel y Proyectores

**Fecha:** 2026-02-17  
**Objetivo:** Verificar cumplimiento del Canon v8.2 en Kernel RFC-0001 y proyectores existentes

---

## 1. KERNEL RFC-0001

### 1.1 Verificación de Implementación

**Archivo:** `apps/api/src/core/kernel.ts`

#### ✅ CUMPLE: Contrato de Ingesta
- Método `ingestSignal()` es el único punto de entrada
- Validación de 5 gates:
  1. Physical fact type (6 tipos permitidos)
  2. Adapter registration
  3. Adapter class (rechaza INTERPRETER)
  4. Driver match
  5. HMAC signature verification
- Transacción atómica: Journal + Outbox en misma tx
- Idempotencia por `(adapter, external_id)` y fingerprint

#### ✅ CUMPLE: Inmutabilidad
- Triggers SQL implementados en `scripts/036_rfc0001_kernel_foundation.sql`:
  - `fluxcore_no_update` - previene UPDATE
  - `fluxcore_no_delete` - previene DELETE
- Función `fluxcore_prevent_mutation()` lanza excepción

#### ✅ CUMPLE: Separación de Responsabilidades
- No contiene `accountId`, `conversationId`, `messageId`
- Solo certifica observaciones físicas
- No interpreta payloads
- No emite eventos de negocio

#### ✅ CUMPLE: Orden Total Global
- `sequence_number BIGSERIAL PRIMARY KEY`
- Incremento monotónico garantizado por Postgres
- `observed_at` usa `clock_timestamp()` (no falsificable)

#### ✅ CUMPLE: Despertar Inevitable
- Cada señal insertada produce entrada en `fluxcore_outbox` en misma tx
- Constraint `UNIQUE(sequence_number)` en outbox

### 1.2 Verificación de Esquema SQL

**Archivo:** `scripts/036_rfc0001_kernel_foundation.sql`

#### ✅ CUMPLE: Tablas del Kernel
- `fluxcore_reality_adapters` - registro de adapters
- `fluxcore_signals` - Journal inmutable
- `fluxcore_outbox` - despertar transaccional
- `fluxcore_projector_cursors` - progreso de proyectores
- `fluxcore_fact_types` - referencia de tipos físicos

#### ✅ CUMPLE: Constraints e Índices
- `signal_fingerprint UNIQUE`
- `CHECK` en `fact_type` (6 valores permitidos)
- `CHECK` en `adapter_class` (SENSOR, GATEWAY, INTERPRETER)
- Índice único `(certified_by_adapter, provenance_external_id)`
- Índices en `source`, `subject`, `sequence_number`

### 1.3 Diagnóstico Agregado

**Estado:** El Kernel está implementado al 100% según RFC-0001 y congelado.

**Logs de diagnóstico:** Ya instrumentados en líneas 86, 194, 215

**Acción requerida:** NINGUNA. El Kernel no requiere cambios para v8.2.

---

## 2. BASE PROJECTOR

### 2.1 Verificación de Contrato

**Archivo:** `apps/api/src/core/kernel/base.projector.ts`

#### ✅ CUMPLE: Patrón Pull
- Lee señales con `WHERE sequence_number > cursor`
- `ORDER BY sequence_number ASC`
- Batch de 100 señales

#### ⚠️ NO CUMPLE: Atomicidad del Cursor
**PROBLEMA CRÍTICO:** El cursor se actualiza **fuera** de la transacción del proyector.

```typescript
// LÍNEA 54-58 - ACTUAL (INCORRECTO)
await this.project(signal);  // Sin tx
cursor = signal.sequenceNumber;
await this.updateCursor(cursor);  // Separado
```

**Requerido por Canon:**
```typescript
await db.transaction(async (tx) => {
  await this.project(signal, tx);
  await this.updateCursor(signal.sequenceNumber, tx);
});
```

**Consecuencia:** Si `project()` falla después de procesar parcialmente, el cursor no avanza, pero efectos parciales pueden persistir (violación de atomicidad).

#### ✅ CUMPLE: Idempotencia
- `wakeUp()` es idempotente (puede llamarse múltiples veces)
- Lock `isProcessing` previene procesamiento concurrente

#### ✅ CUMPLE: Reconstruibilidad
- Cursor puede resetearse a 0 para replay completo
- Progreso persistente en `fluxcore_projector_cursors`

### 2.2 Diagnóstico

**Estado:** BaseProjector cumple parcialmente. Requiere refactor para atomicidad.

**Acción requerida:** H1 - Refactorizar `BaseProjector.wakeUp()` para transacciones atómicas.

---

## 3. IDENTITY PROJECTOR

### 3.1 Verificación de Pureza

**Archivo:** `apps/api/src/services/fluxcore/identity-projector.service.ts`

#### ✅ CUMPLE: Extiende BaseProjector
- Hereda de `BaseProjector`
- Implementa `project(signal)`

#### ⚠️ CUMPLE PARCIALMENTE: Pureza
**Llamadas a servicios:**
- Línea 52, 65: `actorResolutionService.resolveActor()` / `resolveFromSnapshot()`

**Análisis:** El servicio `actorResolutionService` **escribe en DB** (crea actores, addresses, contexts). Esto es correcto porque son tablas derivadas del proyector de identidad. Sin embargo, debe verificarse que estas escrituras ocurran en la misma transacción que el cursor.

#### ⚠️ NO CUMPLE: Atomicidad
Hereda el problema de `BaseProjector`: las escrituras de `actorResolutionService` y el cursor no están en la misma transacción.

#### ✅ CUMPLE: No genera nuevos hechos
- No llama a `kernel.ingestSignal()`
- No emite señales al Journal

#### ⚠️ EMITE EVENTOS: Línea 77
```typescript
coreEventBus.emit('identity:resolved', {...});
```

**Análisis:** Emitir eventos **post-transacción** es correcto según Canon (sección 4.1). Sin embargo, debe verificarse que el evento se emita **después** del commit, no durante la transacción.

### 3.2 Diagnóstico

**Estado:** IdentityProjector cumple lógica de negocio pero hereda problema de atomicidad.

**Acción requerida:** H1 - Verificar que `actorResolutionService` reciba `tx` y refactorizar para atomicidad.

---

## 4. CHAT PROJECTOR

### 4.1 Verificación de Pureza

**Archivo:** `apps/api/src/core/projections/chat-projector.ts`

#### ✅ CUMPLE: Extiende BaseProjector
- Hereda de `BaseProjector`
- Implementa `project(signal)`

#### ❌ NO CUMPLE: Pureza - Llama a MessageCore
**Línea 104-112:**
```typescript
await messageCore.receive({
  conversationId: conversation.id,
  senderAccountId: accountId,
  content: { text },
  type: 'incoming',
  generatedBy: 'human',
  timestamp: signal.claimedOccurredAt ?? signal.observedAt,
  targetAccountId: accountId
});
```

**PROBLEMA CRÍTICO:** `messageCore.receive()` tiene efectos secundarios:
1. Emite `core:message_received` al EventBus (línea 70 de message-core.ts)
2. Actualiza `lastMessageAt` en conversación
3. Broadcast WebSocket

**Requerido por Canon:** El proyector debe escribir directamente en tabla `messages` con `ON CONFLICT (signal_id) DO NOTHING`, no llamar a `messageCore.receive()`.

#### ❌ NO CUMPLE: Atomicidad
- Hereda problema de `BaseProjector`
- Las escrituras de `messageCore.receive()` no están en transacción con cursor

#### ❌ NO CUMPLE: Idempotencia
- No hay `UNIQUE (signal_id)` en tabla `messages` (verificado en schema)
- Re-ejecución crearía mensajes duplicados

#### ✅ CUMPLE: Dependencia de IdentityProjector
- Línea 33-50: Verifica que identidad esté resuelta
- Lanza error si no está lista (backoff implícito)

#### ❌ NO CUMPLE: Encolado en cognition_queue
- No escribe en `fluxcore_cognition_queue`
- Requerido por Canon v8.2 sección 4.2

### 4.2 Diagnóstico

**Estado:** ChatProjector requiere reescritura completa.

**Problemas identificados:**
1. Llama a `messageCore.receive()` en lugar de escribir directamente
2. No tiene idempotencia por `signal_id`
3. No encola en `fluxcore_cognition_queue`
4. No es atómico (hereda de BaseProjector)
5. Emite eventos durante proyección (debería ser post-tx)

**Acción requerida:** H1 - Reescribir ChatProjector según patrón canónico.

---

## 5. SESSION PROJECTOR

### 5.1 Verificación

**Archivo:** `apps/api/src/services/session-projector.service.ts`

**Análisis:** No revisado en detalle. Verificar si es necesario para v8.2.

**Acción requerida:** H0 - Revisar si SessionProjector es crítico para flujo de mensajes.

---

## RESUMEN EJECUTIVO

### Componentes que CUMPLEN 100%
- ✅ **Kernel RFC-0001** - Congelado, no requiere cambios
- ✅ **Esquema SQL del Kernel** - Inmutabilidad garantizada por triggers

### Componentes que CUMPLEN PARCIALMENTE
- ⚠️ **BaseProjector** - Cumple patrón pull, NO cumple atomicidad
- ⚠️ **IdentityProjector** - Lógica correcta, hereda problema de atomicidad

### Componentes que NO CUMPLEN
- ❌ **ChatProjector** - Requiere reescritura completa
- ❌ **Tabla messages** - Falta `UNIQUE (signal_id)`

---

## PLAN DE ACCIÓN H1

### Prioridad CRÍTICA
1. **Agregar `UNIQUE (signal_id)` a tabla `messages`**
   - Migración SQL
   - Verificar duplicados existentes antes de aplicar

2. **Refactorizar BaseProjector para atomicidad**
   - Cambiar firma de `project(signal)` a `project(signal, tx)`
   - Envolver `project()` + `updateCursor()` en `db.transaction()`
   - Emitir eventos post-transacción

3. **Reescribir ChatProjector**
   - Escribir directamente en `messages` con `ON CONFLICT DO NOTHING`
   - Agregar escritura en `fluxcore_cognition_queue` con upsert
   - Actualizar cursor en misma tx
   - Emitir `message.received` post-tx

4. **Refactorizar IdentityProjector**
   - Pasar `tx` a `actorResolutionService`
   - Verificar atomicidad de escrituras

### Prioridad MEDIA
5. **Crear tabla `fluxcore_cognition_queue`**
   - Migración SQL según Canon sección 4.2
   - Índice en `turn_window_expires_at`

### Estimado Revisado
- H1 original: 5-7 días
- **H1 ajustado: 7-10 días** (por complejidad de ChatProjector)

---

## RIESGOS IDENTIFICADOS

### RIESGO ALTO
**Duplicación de mensajes en producción:** Si hay mensajes sin `signal_id`, la migración `UNIQUE` fallará.

**Mitigación:**
```sql
-- Verificar antes de migrar
SELECT signal_id, COUNT(*) 
FROM messages 
WHERE signal_id IS NOT NULL 
GROUP BY signal_id 
HAVING COUNT(*) > 1;

-- Si hay duplicados, decidir estrategia de limpieza
```

### RIESGO MEDIO
**Proyectores no atómicos en producción:** Si el sistema crashea durante proyección, puede haber estado inconsistente.

**Mitigación:** Implementar atomicidad en H1 antes de activar nuevo flujo.

---

## CONCLUSIÓN

El Kernel RFC-0001 está perfecto y congelado. Los proyectores existentes requieren refactorización significativa para cumplir con el Canon v8.2, especialmente:

1. **Atomicidad:** Cursor debe actualizarse en misma tx que escrituras
2. **Idempotencia:** `messages` necesita `UNIQUE (signal_id)`
3. **Cognition Queue:** ChatProjector debe encolar turnos
4. **Pureza:** ChatProjector no debe llamar a `messageCore.receive()`

**Estimado H1 ajustado: 7-10 días** (vs. 5-7 días original).
