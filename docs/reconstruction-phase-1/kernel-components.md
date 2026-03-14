# Kernel — componentes e invariantes de implementación actual

## Objetivo de este documento

Este documento describe las piezas concretas que hoy implementan el Kernel en el código. El foco está puesto en la ingesta soberana, el journal, el mecanismo de activación y la infraestructura de projectores.

## 1. Punto de entrada soberano

### `kernel.ts`

- `apps/api/src/core/kernel.ts`

Responsabilidades observables:

- exponer `ingestSignal(candidate)` como entrada única de señales certificadas
- validar que el `factType` pertenezca al conjunto permitido por la implementación actual
- verificar existencia del adapter en `fluxcore_reality_adapters`
- verificar clase del adapter y evitar `INTERPRETER`
- verificar coincidencia de `driverId`
- verificar firma HMAC del candidato canonizado
- persistir la señal y el outbox del Kernel en la misma transacción
- resolver idempotencia por `provenanceExternalId` y por `signalFingerprint`
- emitir `kernel:wakeup` después del commit

### 🔍 **Gates de Validación - Lecciones Aprendidas (2026-03-13)**

La implementación actual aplica estos gates en orden:

1. **Validación del tipo de hecho** - ✅ `EXTERNAL_STATE_OBSERVED` soportado
2. **Lookup del reality adapter** - ✅ `chatcore-gateway` registrado
3. **Bloqueo de adapters `INTERPRETER`** - ✅ Solo `GATEWAY` permitido
4. **Verificación de `driverId`** - ❌ **CRÍTICO**: Debe usar `this.DRIVER_ID`
5. **Verificación criptográfica de firma** - ✅ HMAC-SHA256 funcionando

**Error común:** `driverId` hardcodeado en lugar de usar `this.DRIVER_ID`
```typescript
// ❌ ERROR COMÚN
provenance: { driverId: 'chatcore/message-state' }

// ✅ CORRECTO
provenance: { driverId: this.DRIVER_ID } // 'chatcore/internal'
```

## 2. Gates de validación antes del journal

La implementación actual en `kernel.ts` aplica, en este orden:

1. validación del tipo de hecho
2. lookup del reality adapter autorizado
3. bloqueo de adapters `INTERPRETER`
4. verificación de `driverId`
5. verificación criptográfica de firma

Esto confirma que el Kernel actual sigue siendo una frontera defensiva, no un simple repositorio de eventos.

## 3. Journal y outbox del Kernel

### Journal principal

- `packages/db/src/schema/fluxcore-signals.ts`

Responsabilidades observables:

- almacenar señales certificadas en orden secuencial
- preservar evidencia, procedencia y metadata de certificación
- servir de fuente de verdad para projectores

### 📊 **Tipos de Señales Soportados (2026-03-13)**

**ChatCore → Kernel:**
- `EXTERNAL_INPUT_OBSERVED` - Mensajes humanos
- `EXTERNAL_STATE_OBSERVED` - Cambios de estado estructural ✅ **NUEVO**

**FluxCore → Kernel:**
- `AI_RESPONSE_GENERATED` - Respuestas cognitivas
- `CONNECTION_EVENT_OBSERVED` - Eventos de conexión

### Outbox del Kernel

- `packages/db/src/schema/fluxcore-outbox.ts`

Responsabilidades observables:

- registrar que una señal nueva debe despertar procesamiento posterior
- desacoplar ingesta del procesamiento de projectores

### 🔧 **Patrones de Implementación - Lecciones Aprendidas**

#### **✅ Logs de Diagnóstico (2026-03-13)**
```typescript
// ✅ Logs fuera de transacción (siempre visibles)
console.log(`[Kernel] 🔍 DEBUG: Starting gates validation...`);
return db.transaction(async (tx) => {
  // Lógica dentro de transacción
});

// ❌ Logs dentro de transacción (no visibles si falla)
return db.transaction(async (tx) => {
  console.log('DEBUG: Starting...'); // No visible si falla antes
});
```

#### **✅ Validación de Parámetros Obligatorios**
```typescript
// ✅ Validar messageId para evitar errores silenciosos
if (!params.messageId) {
  const error = 'certifyStateChange: messageId is required';
  console.error(`❌ ${error}`);
  return { accepted: false, reason: error };
}
```

#### **✅ Manejo de Idempotencia**
```typescript
// ✅ Verificar duplicados antes de INSERT
const existing = await tx.query.fluxcoreSignals.findFirst({
  where: (t, { and, eq }) => and(
    eq(t.certifiedByAdapter, candidate.certifiedBy.adapterId),
    eq(t.provenanceExternalId, candidate.evidence.provenance.externalId!)
  ),
});

if (existing) {
  console.log(`📋 DUPLICATE: signal ${existing.sequenceNumber} already exists`);
  return existing.sequenceNumber;
}
```

### Observación relevante sobre columnas

El esquema TS actual de `fluxcore_outbox` expone columnas como `signalId`, `eventType`, `payload`, `status`, `attempts`. El código de `kernel.ts` inserta precisamente en ese outbox luego de persistir el journal. En términos de comportamiento, el outbox del Kernel hoy es una cola de wakeup basada en la señal ya persistida.

## 4. Registro de adapters de realidad

- `packages/db/src/schema/fluxcore-reality-adapters.ts`

Responsabilidades observables:

- registrar adapters autorizados
- asociar cada adapter con un `driverId`
- mantener estado operacional del adapter

Desde `kernel.ts`, el registro de adapters funciona como ACL soberana: si el adapter no existe o no coincide con el driver, la señal no entra al journal.

## 5. Dispatcher de wakeup

### `kernel-dispatcher.ts`

- `apps/api/src/core/kernel-dispatcher.ts`

Responsabilidades observables:

- hacer polling de `fluxcore_outbox`
- emitir `kernel:wakeup`
- activar el loop de projectores sin transportar semántica de negocio

Este componente no interpreta señales. Solo funciona como latido o disparador log-driven.

## 6. Infraestructura base de projectores

### Clase base

- `apps/api/src/core/kernel/base.projector.ts`

Responsabilidades observables:

- leer señales posteriores al cursor del projector
- procesarlas en orden
- ejecutar escritura derivada + avance de cursor en la misma transacción
- registrar errores en `fluxcore_projector_errors`
- evitar avance de cursor cuando una proyección falla

### Runner

- `apps/api/src/core/kernel/projector-runner.ts`

Responsabilidades observables:

- cold start de projectores

- `apps/api/src/core/projections/chat-projector.ts`

Responsabilidades observables:

- procesar señales de chat (`EXTERNAL_INPUT_OBSERVED`, `AI_RESPONSE_GENERATED`)
- **✅ NUEVO:** procesar mutaciones estructurales (`EXTERNAL_STATE_OBSERVED` con `stateChange`)
- convertir señales del Kernel en acciones conversacionales
- delegar entrega a ChatCore vía MessageCore

### 🔄 **Procesamiento de Mutaciones Estructurales (2026-03-13)**

```typescript
// ✅ ChatProjector procesa mutaciones
if (signal.factType === 'EXTERNAL_STATE_OBSERVED') {
  const evidence = signal.evidenceRaw as any;
  
  if (evidence.stateChange === 'message_content_overwritten') {
    console.log(`[ChatProjector] Message ${evidence.messageId} overwritten by ${evidence.overwrittenBy}`);
    // Aquí se pueden actualizar cachés, metadatos, etc.
  }
}
```

## 6. Invariantes de implementación

### Atomicidad de journal + outbox

El Kernel garantiza que una señal está en el journal Y en el outbox o en ninguna de las dos. Esto se logra con una transacción PostgreSQL que inserta en ambas tablas antes de hacer commit.

### Inmutabilidad del journal

Una vez que una señal tiene un `sequence_number`, nunca se modifica ni se elimina. Esto es fundamental para la consistencia de los projectores que usan cursores secuenciales.

### Soberanía de ingesta

El Kernel no acepta señales sin validación criptográfica y autorización de adapter. Esto impide que cualquier componente pueda escribir directamente en el journal sin pasar por los gates de validación.

### 📋 **Lecciones Aprendidas sobre Invariantes (2026-03-13)**

#### **✅ Validación Criptográfica Funciona**
- HMAC-SHA256 con signing secret del adapter
- Canonicalización determinista de candidatos
- Fingerprint único por señal

#### **✅ Idempotencia por ExternalId**
- `provenanceExternalId` evita duplicados
- `signalFingerprint` evita colisiones
- Retorno de sequence_number existente

#### **⚠️ Logs No Persistentes en Errores**
- Logs dentro de transacción no aparecen si hay rollback
- Poner logs de diagnóstico fuera de la transacción
- Usar console.error para errores críticos

## 7. Interacciones con el mundo exterior

### ChatCore → Kernel

ChatCore certifica realidad a través de `chatcore-gateway.service.ts`:

- `EXTERNAL_INPUT_OBSERVED` para mensajes humanos
- `EXTERNAL_STATE_OBSERVED` para mutaciones estructurales ✅ **NUEVO**

### FluxCore → Kernel

FluxCore certifica decisiones cognitivas a través de `cognition-gateway.service.ts`:

- `AI_RESPONSE_GENERATED` para respuestas de IA
- `CONNECTION_EVENT_OBSERVED` para eventos de conexión

### Kernel → Projectores

El Kernel emite `kernel:wakeup` y los projectores leen del journal usando cursores persistentes.

### 📊 **Estado Actual del Flujo Completo (2026-03-13)**

```
✅ ChatCore → Kernel: Certificación funcionando
✅ Kernel → BD: Persistencia garantizada  
✅ BD → ChatProjector: Procesamiento activo
⏳ ChatProjector → FluxCore: Impacto en respuestas pendiente
```

## 8. Próximos pasos y extensibilidad

### Extensión a nuevos tipos de hechos

Para agregar un nuevo `PhysicalFactType`:

1. Agregar al conjunto `PHYSICAL_FACT_TYPES`
2. Crear constraint en `fluxcore_signals`
3. Registrar adapter correspondiente
4. Implementar procesamiento en projector específico

### Extensión a nuevos adapters

Para agregar un nuevo reality adapter:

1. Implementar firma HMAC con `canonicalize` del Kernel
2. Registrar en `fluxcore_reality_adapters`
3. Usar `driverId` consistente
4. Implementar lógica de certificación específica

### 🎯 **Recomendaciones Basadas en Experiencia (2026-03-13)**

1. **Siempre usar `this.DRIVER_ID`** en lugar de hardcodear
2. **Poner logs de diagnóstico fuera de transacciones**
3. **Validar parámetros obligatorios antes de procesar**
4. **Manejar idempotencia con externalId + fingerprint**
5. **Usar `EXTERNAL_STATE_OBSERVED` para mutaciones estructurales**
6. **No crear nuevos PhysicalFactTypes si existe uno adecuado**

## 9. Flujo operativo real del Kernel

Flujo observable cuando un adapter certifica una observación:

1. el adapter arma `KernelCandidateSignal`
2. llama a `kernel.ingestSignal()`
3. el Kernel valida gates y firma
4. inserta en `fluxcore_signals`
5. inserta wakeup en `fluxcore_outbox`
6. emite `kernel:wakeup`
7. `ProjectorRunner` despierta projectores
8. cada projector avanza desde su cursor y materializa estado derivado

## 10. Fronteras del dominio Kernel

El Kernel sí hace:

- certificación de señales
- journal inmutable y secuencial
- control de adapters autorizados
- wakeup de proyección
- soporte transaccional para replay y reconstrucción

El Kernel no hace:

- persistencia primaria del dominio conversacional
- rendering ni broadcasting a clientes
- selección de runtimes
- construcción de `PolicyContext`
- ejecución directa de acciones de negocio

## 11. Observaciones importantes del código actual

### Conjunto de fact types aceptados por la implementación

En `apps/api/src/core/kernel.ts`, `PHYSICAL_FACT_TYPES` incluye además de las clases físicas más esperables:

- `chatcore.message.received`
- `AI_RESPONSE_GENERATED`

Esto significa que la implementación actual del Kernel acepta hoy un conjunto de hechos más amplio que el modelo mínimo más estricto documentado en otras piezas conceptuales. Para la reconstrucción basada en código, este comportamiento debe considerarse real.

### Separación aún visible entre semántica y soberanía

Aun con esas extensiones, la estructura sigue conservando la separación central:

- los adapters certifican
- el Kernel registra
- los projectores derivan
- otros dominios consumen el estado derivado
