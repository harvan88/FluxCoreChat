# 🔍 Auditoría de Aprendizaje: FluxCoreChat ← INHOST

> **Auditoría basada exclusivamente en código fuente**  
> Fecha: 2025-12-08  
> Evaluado contra: TOTEM.md (documento fundacional inmutable)

---

## 📊 Resumen Ejecutivo

FluxCoreChat tiene una arquitectura **más madura** que INHOST en varios aspectos fundamentales. Sin embargo, INHOST tiene implementaciones operativas que FluxCoreChat aún no tiene. Este informe identifica qué código real de INHOST puede adoptarse respetando el TOTEM.

### Tabla de Madurez (Basada en Código)

| Componente | FluxCoreChat | INHOST | Ganador |
|------------|--------------|--------|---------|
| **Tests** | 83/83 ✅ | ~0 ❌ | FluxCoreChat |
| **Schema DB** | Completo ✅ | Parcial ⚠️ | FluxCoreChat |
| **Sistema Extensiones** | Manifests + Host | Ejecución real ✅ | INHOST |
| **Modelo de Contextos** | 4 capas ✅ | 1 capa ❌ | FluxCoreChat |
| **Actor Model** | Implementado ✅ | No existe ❌ | FluxCoreChat |
| **Automation Rules** | Implementado ✅ | No existe ❌ | FluxCoreChat |
| **Ejecución de Extensiones** | Placeholder ⚠️ | Paralelo + Timeout ✅ | INHOST |
| **Persistencia Enrichments** | Schema existe | MessageCore persiste ✅ | INHOST |
| **WebSocket Enrichments** | No implementado ❌ | Broadcast real ✅ | INHOST |
| **Offline-First (IndexedDB)** | Dexie + SyncQueue ✅ | IDB completo ✅ | Empate |
| **Logger Service** | console.log ❌ | Logger robusto ✅ | INHOST |

---

## 🎯 Aprendizajes Validados contra TOTEM

### ✅ APRENDER #1: Ejecución Paralela de Extensiones con Timeout

**Código INHOST:** `ExtensionHost.ts`

```typescript
// inhost-backend: Ejecución paralela con Promise.allSettled
async processMessage(context: ExtensionContext): Promise<ProcessingResult> {
  const results = await Promise.allSettled(
    enabledExtensions.map((extension) =>
      this.executeWithTimeout(extension, context)
    )
  );
  // Agregar resultados, aislar fallos
}

private async executeWithTimeout(extension, context) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('TIMEOUT')), extension.timeout);
  });
  
  const result = await Promise.race([
    extension.process(context),
    timeoutPromise
  ]);
}
```

**Estado FluxCoreChat:** `extension-host.service.ts` ejecuta extensiones pero **NO tiene**:
- Ejecución en paralelo (`Promise.allSettled`)
- Timeouts configurables por extensión
- Aislamiento de fallos (una extensión fallando no afecta otras)
- Estadísticas de procesamiento

**¿Respeta TOTEM?** ✅ SÍ
- TOTEM 9.9: "Las extensiones pueden intervenir en dos espacios"
- TOTEM 9.10: "El ChatCore valida cada acción contra el manifest"
- Mejora la robustez sin modificar el núcleo

**Impacto:**
- Archivo: `apps/api/src/services/extension-host.service.ts`
- Cambio: Agregar ejecución paralela, timeouts, estadísticas
- Riesgo: BAJO - Es mejora interna, no cambia interfaces

---

### ✅ APRENDER #2: Persistencia de Enrichments en MessageCore

**Código INHOST:** `MessageCore.ts`

```typescript
// inhost-backend: Persiste enrichments después de procesar extensiones
if (result.enrichments.length > 0) {
  // Mapear a formato de BD
  const dbEnrichments: NewMessageEnrichment[] = result.enrichments.map((e) => ({
    messageId: envelope.id,
    extensionId: e.extensionId,
    type: e.type,
    payload: e.payload,
    confidence: e.confidence,
    processingTimeMs: e.processingTimeMs,
  }));

  // Persistir en PostgreSQL
  await this.persistence.saveEnrichments(dbEnrichments);

  // Broadcast via WebSocket
  await this.notifications.broadcastEnrichments({
    messageId: envelope.id,
    enrichments: result.enrichments,
    processingTimeMs: result.totalTimeMs,
  });
}
```

**Estado FluxCoreChat:** 
- Tabla `message_enrichments` existe en schema ✅
- `message.service.ts` NO persiste enrichments ❌
- NO hay broadcast de enrichments al frontend ❌

**¿Respeta TOTEM?** ✅ SÍ
- TOTEM 9.9.2: "enriched_message_space permite generar contenido"
- Glosario: "Enrichment = Metadata agregada por extensiones"

**Impacto:**
- Archivos: `message.service.ts`, `extension-host.service.ts`
- Nuevo: `enrichment.service.ts`
- Cambio: Flujo completo de persistencia y broadcast
- Riesgo: MEDIO - Requiere coordinación mensaje-extensiones-broadcast

---

### ✅ APRENDER #3: Broadcast de Enrichments vía WebSocket

**Código INHOST:** `WebSocketNotification.ts`

```typescript
// inhost-backend: Evento específico para enrichments
async broadcastEnrichments(data: {
  messageId: string;
  enrichments: Enrichment[];
  processingTimeMs: number;
}) {
  this.broadcast('enrichment:batch', data);
}
```

**Estado FluxCoreChat:** TOTEM define eventos WebSocket pero NO incluye `enrichment:batch`.

**¿Respeta TOTEM?** ✅ SÍ (extensión compatible)
- TOTEM 9.6 WebSocket define eventos base
- Agregar evento nuevo es extensión, no modificación

**Propuesta de evento:**
```typescript
// Agregar a eventos WebSocket
'enrichment:batch': { 
  conversationId: string;
  messageId: string;
  enrichments: Array<{
    extensionId: string;
    type: string;
    payload: any;
  }>;
}
```

**Impacto:**
- Archivo: `apps/api/src/websocket/`
- Frontend: Manejar evento `enrichment:batch`
- Riesgo: BAJO - Evento adicional

---

### ✅ APRENDER #4: Health Checks para Extensiones

**Código INHOST:** `ExtensionHost.ts`

```typescript
// inhost-backend: Verificación de salud de extensiones
async healthCheck(): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();

  const checks = Array.from(this.extensions.entries()).map(
    async ([id, extension]) => {
      try {
        const healthy = await Promise.race([
          extension.healthCheck(),
          new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), 1000)
          ),
        ]);
        results.set(id, healthy);
      } catch {
        results.set(id, false);
      }
    }
  );

  await Promise.allSettled(checks);
  return results;
}
```

**Estado FluxCoreChat:** Extensiones tienen método `healthCheck` en interface pero NO se usa.

**¿Respeta TOTEM?** ✅ SÍ
- Mejora operativa, no afecta arquitectura

**Impacto:**
- Archivo: `extension-host.service.ts`
- Nuevo endpoint: `GET /admin/extensions/health`
- Riesgo: BAJO

---

### ✅ APRENDER #5: Estadísticas de Procesamiento

**Código INHOST:** `ExtensionHost.ts`

```typescript
// inhost-backend: Métricas de ejecución
private stats = {
  totalProcessed: 0,
  totalErrors: 0,
  processingTimes: [] as number[],
};

getStats(): ExtensionHostStats {
  const avgTime = this.stats.processingTimes.length > 0
    ? this.stats.processingTimes.reduce((a, b) => a + b, 0) /
      this.stats.processingTimes.length
    : 0;

  return {
    totalExtensions: this.extensions.size,
    activeExtensions: this.extensions.size,
    totalProcessed: this.stats.totalProcessed,
    totalErrors: this.stats.totalErrors,
    averageProcessingTimeMs: Math.round(avgTime),
  };
}
```

**Estado FluxCoreChat:** NO tiene estadísticas de extensiones.

**¿Respeta TOTEM?** ✅ SÍ
- TOTEM 8: "Métricas de éxito" menciona latencia
- Mejora operativa

**Impacto:**
- Archivo: `extension-host.service.ts`
- Nuevo endpoint: `GET /admin/extensions/stats`
- Riesgo: BAJO

---

### ✅ APRENDER #6: Logger Service Centralizado

**Código INHOST:** `middleware/logger.ts`

```typescript
// inhost-backend: Logger estructurado
import { logger } from './middleware/logger';

logger.info('📥 MessageCore: Receiving message', {
  id: envelope.id,
  type: envelope.type,
  channel: envelope.channel,
});

logger.error('❌ MessageCore: Error', {
  messageId,
  error: error.message,
});
```

**Estado FluxCoreChat:** Usa `console.log` directamente.

**¿Respeta TOTEM?** ✅ SÍ
- Mejora operativa, no afecta arquitectura

**Impacto:**
- Nuevo archivo: `apps/api/src/utils/logger.ts`
- Refactor: Reemplazar console.log en todos los services
- Riesgo: BAJO pero tedioso

---

### ❌ NO APRENDER #1: Schema de DB de INHOST

**Código INHOST:** Schema simplificado sin modelo de contextos.

**FluxCoreChat ya tiene:**
- `extension_contexts` (Context Overlays) ✅
- `relationships.context` estructurado ✅
- `accounts.private_context` ✅
- `automation_rules` ✅
- `actors` ✅

**FluxCoreChat es SUPERIOR** en modelo de datos.

---

### ❌ NO APRENDER #2: Arquitectura de INHOST sin Actor Model

**INHOST NO tiene:**
- `from_actor_id` / `to_actor_id` en mensajes
- Tabla `actors`
- Trazabilidad de quién envía (humano vs IA vs extensión)

**FluxCoreChat ya implementa Actor Model** según TOTEM 9.2.

---

### ❌ NO APRENDER #3: Tests de INHOST (0% coverage)

FluxCoreChat tiene **83 tests** pasando. INHOST tiene ~0%.

**Mantener disciplina de testing de FluxCoreChat.**

---

## 📋 ISSUES/TASKS

### FC-300: Ejecución Paralela de Extensiones con Timeout
**Prioridad:** Alta  
**Archivo:** `apps/api/src/services/extension-host.service.ts`  
**Descripción:**
- Implementar `Promise.allSettled` para ejecución paralela
- Agregar timeout configurable por extensión (`extension.timeout`)
- Aislar fallos: una extensión fallando no afecta a otras
- Agregar estadísticas de procesamiento

**Criterio de Aceptación:**
- [ ] Extensiones se ejecutan en paralelo
- [ ] Timeout de 5s por defecto, configurable en manifest
- [ ] Una extensión con error no bloquea otras
- [ ] Stats disponibles en `extensionHost.getStats()`

**Impacto en Sistema:**
- Mejora performance (paralelo vs secuencial)
- Mejora resiliencia (aislamiento de fallos)
- Sin cambios en interfaces públicas

---

### FC-301: Persistencia Real de Enrichments
**Prioridad:** Alta  
**Archivo:** Nuevo `apps/api/src/services/enrichment.service.ts`  
**Descripción:**
- Crear `EnrichmentService` para CRUD de enrichments
- Integrar con `ExtensionHost.processMessage()` para persistir resultados
- Usar tabla `message_enrichments` existente

**Criterio de Aceptación:**
- [ ] Enrichments se persisten en PostgreSQL después de cada mensaje
- [ ] Cada enrichment incluye: `messageId`, `extensionId`, `type`, `payload`, `confidence`, `processingTimeMs`
- [ ] Tests de integración

**Impacto en Sistema:**
- Tabla `message_enrichments` ya existe, no requiere migración
- Coordinación entre `MessageService` y `ExtensionHost`

---

### FC-302: Broadcast de Enrichments vía WebSocket
**Prioridad:** Alta  
**Archivo:** `apps/api/src/websocket/`  
**Descripción:**
- Agregar evento `enrichment:batch` al WebSocket
- Emitir después de procesar extensiones
- Frontend debe escuchar y actualizar UI

**Criterio de Aceptación:**
- [ ] Evento `enrichment:batch` definido
- [ ] Se emite después de persistir enrichments
- [ ] Frontend recibe y procesa evento

**Propuesta de payload:**
```typescript
{
  type: 'enrichment:batch',
  data: {
    conversationId: string;
    messageId: string;
    enrichments: Array<{
      id: string;
      extensionId: string;
      type: string;
      payload: any;
      confidence: number;
    }>;
    processingTimeMs: number;
  }
}
```

**Impacto en Sistema:**
- Nuevo evento WebSocket (no rompe compatibilidad)
- Frontend requiere handler nuevo

---

### FC-303: Health Checks de Extensiones
**Prioridad:** Media  
**Archivo:** `apps/api/src/services/extension-host.service.ts`  
**Descripción:**
- Implementar `healthCheck()` en ExtensionHost
- Agregar endpoint `GET /admin/extensions/health`
- Timeout de 1s para health checks

**Criterio de Aceptación:**
- [ ] `extensionHost.healthCheck()` retorna `Map<extensionId, boolean>`
- [ ] Endpoint disponible para admins
- [ ] Health check con timeout propio

**Impacto en Sistema:**
- Mejora observabilidad
- Útil para dashboards de admin

---

### FC-304: Estadísticas de ExtensionHost
**Prioridad:** Media  
**Archivo:** `apps/api/src/services/extension-host.service.ts`  
**Descripción:**
- Agregar tracking de estadísticas
- `totalProcessed`, `totalErrors`, `averageProcessingTimeMs`
- Endpoint `GET /admin/extensions/stats`

**Criterio de Aceptación:**
- [ ] Stats se actualizan en cada `processMessage()`
- [ ] Promedio de últimos 100 tiempos de procesamiento
- [ ] Endpoint disponible

**Impacto en Sistema:**
- Mejora observabilidad
- Datos para optimización

---

### FC-305: Logger Service Centralizado
**Prioridad:** Media  
**Archivo:** Nuevo `apps/api/src/utils/logger.ts`  
**Descripción:**
- Crear logger service estructurado
- Reemplazar `console.log` en todos los services
- Soporte para niveles: `debug`, `info`, `warn`, `error`
- Metadata estructurada

**Criterio de Aceptación:**
- [ ] Logger service creado
- [ ] Todos los services usan `logger.info()`, `logger.error()`, etc.
- [ ] Output incluye timestamp y contexto

**Impacto en Sistema:**
- Mejor debugging
- Preparación para logging centralizado (futuro)

---

### FC-306: Enrichments en Frontend (Store + UI)
**Prioridad:** Media  
**Archivo:** `apps/web/src/store/`, `apps/web/src/components/`  
**Descripción:**
- Agregar store de enrichments en Zustand
- Manejar evento `enrichment:batch` en WebSocket handler
- Mostrar enrichments en UI de mensajes

**Criterio de Aceptación:**
- [ ] Store: `enrichmentsStore` con Map<messageId, Enrichment[]>
- [ ] Handler WebSocket para `enrichment:batch`
- [ ] Componente `EnrichmentBadge` para mostrar info

**Impacto en Sistema:**
- Nueva slice en store
- Nuevos componentes UI

---

### FC-307: Enrichments en IndexedDB
**Prioridad:** Baja  
**Archivo:** `apps/web/src/db/`  
**Descripción:**
- Agregar tabla `enrichments` a Dexie schema
- Sincronizar con backend

**Criterio de Aceptación:**
- [ ] Tabla `enrichments` en IndexedDB
- [ ] Índices: `messageId`, `extensionId`
- [ ] Sync bidireccional

**Impacto en Sistema:**
- Migración de schema Dexie (version bump)
- Offline support para enrichments

---

## 📈 Actualización EXECUTION_PLAN

### Nuevo Hito 11: Madurez Operativa de Extensiones

**Objetivo:** Sistema de extensiones robusto con ejecución paralela, persistencia real y broadcast.

**Duración:** 1 semana

| ID | Descripción | Prioridad | Dependencias |
|----|-------------|-----------|--------------|
| FC-300 | Ejecución paralela + timeout | Alta | - |
| FC-301 | Persistencia de enrichments | Alta | FC-300 |
| FC-302 | Broadcast enrichments WS | Alta | FC-301 |
| FC-303 | Health checks extensiones | Media | FC-300 |
| FC-304 | Estadísticas ExtensionHost | Media | FC-300 |
| FC-305 | Logger service | Media | - |

### Nuevo Hito 12: Frontend de Enrichments

**Objetivo:** Frontend muestra enrichments en tiempo real.

**Duración:** 0.5 semana

| ID | Descripción | Prioridad | Dependencias |
|----|-------------|-----------|--------------|
| FC-306 | Store + UI enrichments | Media | FC-302 |
| FC-307 | IndexedDB enrichments | Baja | FC-306 |

---

## 🚨 Análisis de Riesgos

### Bajo Riesgo
- **FC-300** (Paralelo): Cambio interno, no afecta interfaces
- **FC-303** (Health): Endpoint nuevo, no afecta existentes
- **FC-304** (Stats): Endpoint nuevo, no afecta existentes
- **FC-305** (Logger): Refactor interno

### Medio Riesgo
- **FC-301** (Persistencia): Requiere coordinación MessageService ↔ ExtensionHost
- **FC-302** (WS Broadcast): Frontend debe implementar handler
- **FC-306** (Frontend Store): Nueva slice, posibles race conditions

### Mitigaciones
1. **FC-301**: Implementar transacciones para mensaje + enrichments
2. **FC-302**: Agregar handler que ignore evento si no está implementado
3. **FC-306**: Usar selectors memoizados para evitar re-renders

---

## 🔄 Incompatibilidades Detectadas

### Ninguna Incompatibilidad con TOTEM

Todos los aprendizajes son **compatibles** con el TOTEM:
- No modifican el núcleo (MessageCore)
- No cambian el modelo de 4 capas de contexto
- No afectan Actor Model
- Son mejoras operativas, no arquitectónicas

### Posible Incompatibilidad: Enrichments vs Context Overlays

**TOTEM define:**
- `message_enrichments`: Metadata por mensaje
- `extension_contexts`: Context Overlays por account/relationship/conversation

**Son conceptos diferentes:**
- `message_enrichments` = datos por mensaje individual (sentiment, keywords)
- `extension_contexts` = datos persistentes de contexto (summaries, preferences)

**Conclusión:** NO hay incompatibilidad, son complementarios.

---

## ✅ Conclusión

FluxCoreChat puede adoptar las siguientes mejoras de INHOST:

1. **Ejecución paralela de extensiones** - Mejora performance
2. **Persistencia real de enrichments** - Completa el flujo
3. **Broadcast de enrichments** - Habilita UI en tiempo real
4. **Health checks y estadísticas** - Mejora observabilidad
5. **Logger service** - Mejora debugging

**No adoptar:**
- Schema de DB de INHOST (FluxCoreChat es superior)
- Ausencia de Actor Model (FluxCoreChat lo tiene)
- Ausencia de tests (FluxCoreChat tiene 83 tests)

**El sistema resultante será más robusto** manteniendo total compatibilidad con el TOTEM.

---

**Próximos pasos:**
1. Implementar FC-300 (paralelo) como base
2. Encadenar FC-301 y FC-302 (persistencia y broadcast)
3. Agregar FC-306 en frontend
4. Métricas y logging al final
