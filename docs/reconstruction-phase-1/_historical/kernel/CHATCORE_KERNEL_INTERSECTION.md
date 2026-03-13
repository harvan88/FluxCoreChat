# ChatCore ↔ Kernel: Arquitectura de Intersección

## Resumen Ejecutivo

ChatCore es **soberano** de su propio mundo conversacional. El Kernel es el **certificador de realidad**, no el dueño. FluxCore es **consumidor** de esa realidad certificada.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ARQUITECTURA ACTUAL v1.3                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CHATCORE (Soberano)                                                    │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│  │ 1. Persiste     │───▶│ 2. Certifica    │───▶│ 3. Notifica     │      │
│  │    mensaje      │    │    en Kernel    │    │    a FluxCore   │      │
│  │    (DB propia)  │    │    (journal)    │    │    (cognition)  │      │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘      │
│           │                      │                      │                │
│           ▼                      ▼                      ▼                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      KERNEL (Certificador)                       │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │   │
│  │  │ fluxcore_   │───▶│ Projectors  │───▶│ fluxcore_cognition_ │ │   │
│  │  │ signals     │    │ (consume)   │    │ queue               │ │   │
│  │  │ (journal)   │    │             │    │ (para FluxCore)     │ │   │
│  │  └─────────────┘    └─────────────┘    └─────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                               │                                        │
│                               ▼                                        │
│  FLUXCORE (Consumidor)                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Consume señales certificadas y actúa (IA, Automations, etc)   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Flujo de Datos

### 1. ChatCore → Kernel (Certificación)

**Quién:** `ChatCoreGatewayService`, `ChatCoreWebchatGateway`

**Cuándo:** Después de persistir el mensaje en ChatCore DB, antes de cualquier efecto

**Qué se certifica:**
- `EXTERNAL_INPUT_OBSERVED` - El usuario envió un mensaje
- `CONNECTION_EVENT_OBSERVED` - Vinculación de identidad (visitor → account)
- `EXTERNAL_STATE_OBSERVED` - Cambios de estado (typing, idle, etc)

**Estructura de la señal:**
```typescript
{
  factType: 'EXTERNAL_INPUT_OBSERVED',
  source: { namespace: '@fluxcore/internal', key: accountId },
  subject: { namespace: '@fluxcore/internal', key: accountId },
  evidence: {
    raw: { accountId, content, context, metadata },
    format: 'json',
    provenance: { driverId, externalId, entryPoint },
    claimedOccurredAt: timestamp
  },
  certifiedBy: { adapterId, adapterVersion, signature }
}
```

### 2. Kernel → Projectors (Consumo)

**Quién:** `ChatProjector`, `IdentityProjector`

**Cómo funciona:**
1. `BaseProjector.wakeUp()` lee `fluxcore_signals` ordenado por `sequenceNumber`
2. Procesa en batches de 100 señales
3. Actualiza cursor atómicamente (misma transacción)
4. Si falla: registra error, NO avanza cursor, reintenta en próximo wakeUp

**Orden de procesamiento (CRÍTICO):**
```typescript
const projectors = [
  identityProjector,  // ← PRIMERO: Crea Actor/Address/Link
  chatProjector,      // ← SEGUNDO: Consume identidad, correlaciona mensajes
  sessionProjector,   // ← TERCERO: Gestiona sesiones
];
```

### 3. ChatProjector → ChatCore DB (Correlación)

**CAMBIO CLAVE v1.3:** El projector **SOLO CORRELACIONA**, no crea mensajes.

**Flujo:**
1. Busca mensaje en ChatCore DB que coincida:
   - `senderAccountId` = account de la señal
   - `createdAt` dentro de ventana de tiempo (últimos 10 min)
   - `signalId IS NULL` (no correlacionado aún)
   - `conversationId` si está disponible en evidence

2. Si encuentra: Actualiza `signalId = sequenceNumber`

3. Encola en `fluxcore_cognition_queue` para que FluxCore procese

**Código clave:**
```typescript
// ChatProjector.projectMessage()
const [existingMessage] = await query.limit(1);

if (existingMessage) {
  // Correlacionar con signal
  await client.update(messages)
    .set({ signalId: signal.sequenceNumber })
    .where(eq(messages.id, existingMessage.id));
    
  // Encolar para cognition
  await this.enqueueForCognition(...);
} else {
  // No hay mensaje para correlacionar - esto es NORMAL
  // El mensaje aún no fue persistido por ChatCore
  console.log(`No message found for signal - will retry`);
  return; // NO falla, NO bloquea
}
```

## Problema de "Mensajes Fantasmas" (ANTES v1.2)

### Causa Raíz

```
ANTES (v1.2 y anteriores):
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ ChatCore    │───▶│ Kernel      │───▶│ ChatProjector│
│ certifica   │    │ almacena    │    │ CREA mensaje│
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │ Si falla    │
                                       │ identidad   │
                                       │ → MENSAJE   │
                                       │   FANTASMA  │
                                       └─────────────┘
```

**Problema:** El ChatProjector CREABA mensajes en ChatCore DB. Si fallaba la resolución de identidad (Address/Link no existían aún), el mensaje se perdía o quedaba huérfano.

### Solución v1.3 (ACTUAL)

```
AHORA (v1.3):
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ ChatCore    │───▶│ ChatCore    │───▶│ ChatCore    │
│ PERSISTE    │    │ CERTIFICA   │    │ Gateway     │
│ mensaje     │    │ en Kernel   │    │ notifica    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────┐
│ ChatProjector SOLO CORRELACIONA (no crea)            │
│ - Busca mensaje existente por sender + timestamp    │
│ - Si encuentra: actualiza signalId                  │
│ - Si NO encuentra: espera (retry en próxima señal)  │
└─────────────────────────────────────────────────────┘
```

**ChatCore es soberano:** El mensaje existe porque ChatCore lo persiste. El Kernel solo certifica que "esto ocurrió". El projector solo dice "este mensaje ya certificado es el que ChatCore persistió".

## Problema Actual: Bloqueo de Projector

### Síntoma

El `ChatProjector` **falla fatalmente** cuando no encuentra identidad:

```typescript
// chat-projector.ts:243-251
if (!address) {
  console.error(`❌ Identity (Address) not yet resolved...`);
  throw new Error(`...`); // ← ESTO DETIENE TODO
}

if (!link) {
  console.error(`❌ Identity (Link) not found...`);
  throw new Error(`...`); // ← ESTO DETIENE TODO
}
```

### Consecuencia

1. `throw new Error` → `BaseProjector` atrapa error
2. Registra en `fluxcore_projector_errors`
3. **NO avanza cursor**
4. **DETIENE el loop** de procesamiento
5. Próximo `wakeUp()` reintenta la **misma señal**
6. Si sigue fallando → **bloqueo permanente**

### Por qué ocurre

Los projectors se inician en paralelo:
```typescript
// projector-runner.ts (implícito)
projectors.forEach(p => p.wakeUp()); // Sin await, paralelo
```

ChatProjector puede procesar una señal ANTES de que IdentityProjector haya creado el Address/Link.

## Arquitectura Ideal Propuesta

### Opción 1: Orden Secuencial (Simple)

```typescript
// projector-runner.ts - Secuencial explícito
async function runProjectorsSequential() {
  // 1. IdentityProjector PRIMERO
  await identityProjector.wakeUp();
  
  // 2. ChatProjector DESPUÉS
  await chatProjector.wakeUp();
  
  // 3. Otros projectors...
  await sessionProjector.wakeUp();
}
```

**Pros:** Garantiza que identidad existe antes de que ChatProjector consuma.
**Contras:** Más lento, IdentityProjector podría tardar mucho.

### Opción 2: Resilencia (Recomendada)

```typescript
// chat-projector.ts - No fallar, reintentar graceful
if (!address || !link) {
  console.log(`Identity not ready for signal #${seq}, deferring...`);
  // NO throw error
  // NO bloquear
  // El cursor avanza, esta señal se "salta"
  // (se puede crear mecanismo de retry posterior)
  return;
}
```

**Pros:** No bloquea el pipeline, tolerante a race conditions.
**Contras:** Señal puede procesarse parcialmente, necesita mecanismo de retry.

### Opción 3: Híbrida (Óptima)

Combinar ambas:
1. **Orden secuencial** para reducir race conditions
2. **Resilencia** como seguridad adicional
3. **Retry mechanism** para señales "deferred"

```typescript
// Pseudocódigo
class ChatProjector {
  private deferredSignals: number[] = [];
  
  async project(signal) {
    if (!identityReady) {
      this.deferredSignals.push(signal.sequenceNumber);
      return; // Skip gracefully
    }
    // Procesar normalmente
  }
  
  async wakeUp() {
    // Reintentar deferred primero
    for (const seq of this.deferredSignals) {
      await this.retrySignal(seq);
    }
    // Procesar nuevas
    await super.wakeUp();
  }
}
```

## Resumen de Fuentes de Verdad

| Componente | Fuente de Verdad | Responsabilidad |
|------------|-------------------|-----------------|
| **ChatCore** | `messages`, `conversations`, `relationships` | Persistencia de mensajes, gestión de conversaciones |
| **Kernel** | `fluxcore_signals` (journal) | Certificación de eventos, orden cronológico inmutable |
| **Identity** | `fluxcore_actors`, `fluxcore_addresses`, `fluxcore_actor_address_links` | Resolución de identidad (driver → actor) |
| **FluxCore** | `fluxcore_cognition_queue` | Consumo de señales para IA/Automations |

## Decisiones de Diseño

### Decisión 1: ChatCore Primero

ChatCore **SIEMPRE** persiste antes de certificar.

```typescript
// messages.routes.ts
const message = await messageService.createMessage({...}); // 1. Persiste
await chatCoreGateway.certifyIngress({...});                  // 2. Certifica
```

### Decisión 2: Proyección es Correlación

El projector **NUNCA** crea mensajes en ChatCore DB. Solo correlaciona señales con mensajes existentes.

### Decisión 3: Tolerancia a Fallos

Si el projector no encuentra mensaje para correlacionar, **NO es error**. Es "not yet available". Retry implícito en próximo wakeUp.

## Próximos Pasos Recomendados

1. **Implementar resilencia** en ChatProjector (Opción 2)
2. **Verificar orden de inicio** de projectors (¿secuencial implícito?)
3. **Añadir métricas** de señales deferred vs procesadas
4. **Crear dashboard** de salud del Kernel (señales pendientes, errores de projector)
5. **Refactor FluxCore ↔ Kernel** (desacoplar, FluxCore como consumidor puro)
