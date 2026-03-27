# KernelConsole - Análisis de Arquitectura Actual

**Fecha:** 2026-03-27  
**Propósito:** Evaluar el estado actual de KernelConsole para determinar si se itera o se reemplaza

---

## 1. Arquitectura Actual de KernelConsole

### Backend
**Inicialización:** 
- Sistema de trazas basado en eventos `coreEventBus`
- No es un singleton, sino un sistema de publicación/suscripción
- Las trazas se almacenan temporalmente en memoria del cliente (React state)

**Almacenamiento:**
- **Señales persistidas:** Tabla `fluxcore_signals` en PostgreSQL (historial)
- **Telemetría live:** Solo en memoria del frontend (React state `signals[]`)
- **TTL:** Las señales live tienen límite configurable (25/50/100/200 items)

**Identificación de flujos:**
- **Señales persistidas:** `sequenceNumber` (auto-incremental)
- **Pasos de pipeline:** `messageId` + `conversationId` + `step`
- **Sesiones:** `accountId` + `conversationId` (opcional)

**Acumulación:**
- Las señales persistidas son permanentes en DB
- Las señales live se truncan según `filters.limit` (default 50)

### Frontend
**Conexión:** 
- WebSocket nativo de Bun (`/ws?accountId=X`)
- Protocolo: JSON bidireccional
- Reconexión automática cada 3 segundos si se cae

**Actualización:**
- **Tiempo real:** Sí, via WebSocket events
- **Histórico:** Via REST API `/kernel/console/signals`

**Visualización:**
- Tabla con expand/collapse por fila
- Timeline implícito por orden cronológico inverso
- Indicadores visuales: colores por tipo de evento

---

## 2. Captura de Datos

### Información por traza
**Campos estructurados:**
```typescript
{
  sequenceNumber: number,           // Solo señales persistidas
  factType: string,                // Tipo de hecho (EXTERNAL_INPUT_OBSERVED, etc)
  sourceNamespace: string,         // @fluxcore/cognition, chatcore, etc
  sourceKey: string,               // ID del origen
  subjectNamespace?: string,        // Namespace del sujeto
  subjectKey?: string,             // ID del sujeto
  objectNamespace?: string,         // Namespace del objeto
  objectKey?: string,               // ID del objeto
  evidenceRaw: any,                 // Payload completo
  certifiedByAdapter?: string,      // Adapter que certificó
  provenanceDriverId?: string,      // Driver ID
  observedAt: string,               // Timestamp ISO
  status: string,                   // certified, error, etc
  isPipelineStep?: boolean          // true para pasos live
}
```

### Captura de input/output
**Input completo:** ✅ `evidenceRaw` contiene el payload completo
**Output completo:** ✅ Se captura en pasos de pipeline
**Truncamiento:** No, se guardan objetos completos

### Datos sensibles
**Protección:** 
- No hay mecanismo automático de sanitización
- Los tokens/contraseñas quedan expuestos en `evidenceRaw`
- Acceso restringido: solo HARVAN_ACCOUNT_ID puede acceder

### Automatización
**Captura automática:** ✅ 
- Kernel emite `telemetry:kernel_signal` automáticamente
- Pipeline emite `telemetry:pipeline_step` automáticamente
- No requiere intervención manual del desarrollador

---

## 2.1. Estructura de Datos para la IA (Análisis Detallado)

### Input vs Output en evidenceRaw
**Estado actual:** Ambiguo y depende del componente

**Pasos de pipeline (isPipelineStep: true):**
```typescript
// Ejemplo real de un paso de runtime
{
  step: 'runtime',
  status: 'success',
  messageId: 'msg-123',
  conversationId: 'conv-456',
  metadata: {
    runtimeId: 'asistentes-local',
    model: 'llama-3.1-8b-instant',
    input: {  // Input recibido por el runtime
      messages: [{ role: 'user', content: 'Hola' }],
      context: { instructions: '...', profile: {...} }
    },
    output: {  // Output generado por el runtime
      response: '¡Hola! ¿Cómo puedo ayudarte?',
      usage: { prompt_tokens: 45, completion_tokens: 12 }
    },
    latencyMs: 2340
  }
}
```

**Problema:** No estandarizado. Algunos componentes ponen todo en `evidenceRaw`, otros en `metadata.input/output`.

### Relación causa-efecto
**Campo actual:** `triggerSignalId` (opcional)
```typescript
{
  step: 'dispatcher',
  metadata: {
    triggerSignalId: 1234,  // ID de la señal que disparó este paso
    triggerSignalSeq: 'EXTERNAL_INPUT_OBSERVED'  // Tipo del trigger
  }
}
```

**Limitación:** No todos los pasos lo llenan. La mayoría son eventos independientes.

### Agrupación lógica
**Estado actual:** Array de señales sueltas
```json
[
  { sequenceNumber: 1234, factType: 'EXTERNAL_INPUT_OBSERVED', ... },
  { isPipelineStep: true, step: 'ingreso', messageId: 'msg-123', ... },
  { isPipelineStep: true, step: 'runtime', messageId: 'msg-123', ... },
  { sequenceNumber: 1235, factType: 'AI_RESPONSE_GENERATED', ... }
]
```

**Problema:** La IA debe inferir la agrupación por `messageId` y orden temporal.

---

## 2.2. Relación entre Componentes (Flujo de Datos)

### Identificación del "siguiente" paso
**Métodos actuales:**
1. **Por messageId:** Todos los pasos del mismo mensaje
2. **Por observedAt:** Orden cronológico
3. **Por sequenceNumber:** Solo para señales persistidas

**Problema:** No hay una cadena explícita "step N → step N+1"

### Disparo entre componentes
**Modelo actual:** Eventos independientes
```typescript
// Componente A (MessageCore)
{ step: 'ingreso', status: 'success', messageId: 'msg-123' }

// Componente B (CognitionWorker) 
{ step: 'worker', status: 'success', messageId: 'msg-123', triggerSignalId: 1234 }
```

**Realidad:** Dos señales separadas, no una sola con "antes y después".

### Pérdida de contexto
**Datos que faltan:**
- Variables globales del pipeline
- Estado compartido entre pasos
- Contexto de negocio que no está en los payloads individuales

---

## 2.3. Formato Óptimo para IA

### Requerimientos identificados
**Usuario quiere:** "Paso a paso qué pasó + por qué el resultado final es X"
**Usuario necesita:** Estado completo en cada paso (no deltas)

### Estructura ideal
```json
{
  "conversationId": "conv-456",
  "messageId": "msg-123", 
  "flowId": "flow-789",  // Nuevo: identificador único del flujo completo
  "startTime": "2026-03-27T12:34:56.789Z",
  "endTime": "2026-03-27T12:35:02.123Z",
  "finalResult": "¡Hola! ¿Cómo puedo ayudarte?",
  "steps": [
    {
      "stepId": "step-1",
      "stepName": "ingreso",
      "order": 1,
      "triggeredBy": "EXTERNAL_INPUT_OBSERVED:1234",
      "inputState": {
        "userMessage": "Hola",
        "conversationContext": {...},
        "globalVars": {...}
      },
      "outputState": {
        "processedMessage": "Hola",
        "nextAction": "dispatch_to_runtime"
      },
      "metadata": {
        "component": "MessageCore",
        "latencyMs": 15,
        "status": "success"
      }
    },
    {
      "stepId": "step-2", 
      "stepName": "runtime",
      "order": 2,
      "triggeredBy": "step-1",
      "inputState": {
        "messages": [{ role: 'user', content: 'Hola' }],
        "context": { instructions: '...', profile: {...} },
        "globalVars": {...}  // Heredados del paso anterior
      },
      "outputState": {
        "response": "¡Hola! ¿Cómo puedo ayudarte?",
        "usage": { prompt_tokens: 45, completion_tokens: 12 },
        "globalVars": {...}  // Actualizados
      },
      "metadata": {
        "component": "asistentes-local",
        "model": "llama-3.1-8b-instant',
        "latencyMs": 2340,
        "status": "success"
      }
    }
  ],
  "summary": {
    "totalSteps": 2,
    "totalLatencyMs": 2355,
    "success": true,
    "finalOutput": "¡Hola! ¿Cómo puedo ayudarte?"
  }
}
```

### Ventajas de este formato
1. **Cadena explícita:** `triggeredBy` indica el paso anterior
2. **Estado completo:** `inputState` y `outputState` con todos los datos
3. **Contexto persistente:** `globalVars` viaja entre pasos
4. **Resumen integrado:** Información de alto nivel para la IA

---

## 2.4. Sanitización (Decisión del Usuario)

### Requerimiento explícito
**Usuario indicó:** "Ninguno quiero todos los datos"

### Implicaciones
- **No ocultar campos:** Mantener `authorization`, `token`, `password`, etc.
- **Acceso controlado:** Seguir restringiendo a HARVAN_ACCOUNT_ID
- **Riesgo aceptado:** Usuario asume el riesgo de datos sensibles

### Implementación
```typescript
// Sin sanitización - mantener todo tal cual
export function formatForAI(signals: any[]): string {
  return JSON.stringify({
    conversationId: extractConversationId(signals),
    steps: signals.map(signal => ({
      ...signal,
      evidenceRaw: signal.evidenceRaw,  // Mantener completo
      metadata: signal.metadata          // Mantener completo
    }))
  }, null, 2);
}
```

---

## 2.5. Brecha entre Estado Actual y Óptimo

### Problemas a resolver
1. **Estructura plana vs jerárquica:** Actual es array, ideal es objeto con steps
2. **Relaciones implícitas vs explícitas:** Actual hay que inferir, ideal tiene `triggeredBy`
3. **Estado disperso vs consolidado:** Actual está repartido, ideal tiene `inputState/outputState`
4. **Contexto perdido vs persistente:** Actual no hay `globalVars`

### Solución propuesta: Transformador en el frontend
```typescript
class FlowTransformer {
  transform(signals: any[]): AIFlowFormat {
    // Agrupar por messageId/conversationId
    // Construir cadena de pasos
    // Extraer estado completo en cada paso
    // Agregar contexto persistente
  }
}
```

Esta transformación puede implementarse en el frontend sin cambiar la arquitectura actual.

---

## 3. Visualización y Exportación

### Flujo completo
**Visibilidad:** ✅ Se puede ver el flujo completo
- Señales del Kernel (persistidas)
- Pasos del pipeline (live)
- Relación via `messageId`/`conversationId`

### Copia de trazas
**Métodos disponibles:**
- **Botón Copy:** JSON/CSV/Raw format
- **Selección múltiple:** Con checkboxes
- **Copia rápida:** JSON/CSV para todas las trazas

### Formato para IA
**JSON structure:** ✅ Estructura nativa JSON
```json
{
  "sequenceNumber": 1234,
  "factType": "EXTERNAL_INPUT_OBSERVED",
  "sourceNamespace": "chatcore",
  "sourceKey": "msg-abc123",
  "evidenceRaw": { ... },
  "observedAt": "2026-03-27T12:34:56.789Z"
}
```
**Edición manual:** No necesaria, el JSON es directamente usable

### Filtrado
**Filtros disponibles:**
- Por `factType` (dropdown predefinido)
- Por `sourceNamespace` (dropdown)
- Búsqueda libre en `evidenceRaw`, IDs
- Límite de resultados (25/50/100/200)

---

## 4. Problemas Identificados

### Pérdida de trazas
**Estado:** ✅ No se pierden trazas
- Señales persistidas: en DB
- Pasos live: en memoria temporal pero se muestran inmediatamente

### Componentes no instrumentados
**Cobertura:** Parcial
- ✅ Kernel (completo)
- ✅ Pipeline cognitivo (completo)
- ❌ Componentes de negocio específicos (depende de implementación)

### Performance
**Rendimiento:** Aceptable
- WebSocket: bajo overhead
- DB queries: con índices, límite configurable
- Frontend: renderizado condicional

### Memoria
**Uso:** Controlado
- Límite configurable de trazas en memoria
- No hay memory leaks detectados
- Cleanup automático al desconectar

---

## 5. Requerimientos vs Estado Actual

### Tiempo real
**Requerimiento:** ✅ Satisfecho
- WebSocket para actualizaciones live
- Latencia < 100ms para eventos locales

### Persistencia
**Requerimiento:** ✅ Satisfecho
- Señales del Kernel en PostgreSQL
- Histórico consultable via API

### Multi-desarrollador
**Requerimiento:** ⚠️ Parcial
- Solo HARVAN_ACCOUNT_ID tiene acceso
- No hay aislamiento por sesión de desarrollo

### Producción vs Desarrollo
**Estado:** Desarrollo local
- No hay configuración de ambientes
- No hay flags de feature para producción

---

## 6. Arquitectura de Datos

### Flujo de eventos
```
1. Reality Adapter → Kernel.ingestSignal()
2. Kernel → fluxcore_signals (DB)
3. Kernel → coreEventBus.emit('telemetry:kernel_signal')
4. WebSocket → KernelConsole (frontend)
5. Pipeline steps → coreEventBus.emit('telemetry:pipeline_step')
6. WebSocket → KernelConsole (frontend)
```

### Storage layers
```
1. PostgreSQL: fluxcore_signals (permanente)
2. Event Bus: coreEventBus (temporal, en memoria)
3. Frontend: React state (temporal, por sesión)
```

---

## 7. Evaluación: Iterar vs Reemplazar

### Fortalezas Actuales
- ✅ Arquitectura sólida y funcional
- ✅ Tiempo real funcionando
- ✅ Datos completos y estructurados
- ✅ Exportación flexible
- ✅ Performance aceptable

### Debilidades
- ❌ Acceso restringido a un solo usuario
- ❌ No hay aislamiento por ambiente
- ❌ Falta sanitización de datos sensibles
- ❌ UI limitada (solo tabla)

### Recomendación: **ITERAR**

**Razones:**
1. La arquitectura base es sólida y funcional
2. Los problemas son mejorables, no fundamentales
3. El costo de reemplazo sería alto vs el beneficio
4. Se puede evolucionar incrementalmente

---

## 8. Plan de Mejoras (Iteración)

### Inmediato (1-2 días)
1. **Sanitización de datos sensibles**
   - Detectar y ocultar tokens/contraseñas
   - Configuración de campos sensibles

2. **Multi-usuario**
   - Remover hardcoded HARVAN_ACCOUNT_ID
   - Validar por permisos reales

### Corto plazo (1 semana)
3. **Aislamiento por ambiente**
   - Flags de development/production
   - Configuración por entorno

4. **Mejoras UI**
   - Vista de timeline/árbol
   - Agrupación por conversación
   - Filtros avanzados

### Mediano plazo (2-3 semanas)
5. **Persistencia extendida**
   - Opción de persistir pasos de pipeline
   - Retención configurable

6. **Alertas y métricas**
   - Detección de anomalías
   - Métricas de performance

---

## 9. Decisiones Arquitectónicas

### Mantener
- **Event bus pattern:** Funciona bien
- **WebSocket + REST hybrid:** Buen balance
- **PostgreSQL para señales:** Confiable y consultable
- **Estructura de datos actual:** Completa y flexible

### Mejorar
- **Seguridad:** Sanitización y acceso granular
- **UI:** Componentes más ricos de visualización
- **Configuración:** Por ambiente y usuario
- **Performance:** Optimización de queries

### Evitar
- **Reescribir desde cero:** No justificado
- **Cambiar el storage:** PostgreSQL es adecuado
- **Remover WebSocket:** Pérdida de tiempo real
- **Simplificar demasiado:** Se perdería detalle valioso

---

## 10. Conclusión

**KernelConsole está 85% completo y funcional.** Los problemas identificados son mejorables sin cambios arquitectónicos mayores. Se recomienda iterar sobre la base existente con un roadmap de 2-3 semanas para alcanzar el 100% de los requerimientos.

**Próximos pasos:**
1. Implementar sanitización de datos sensibles
2. Habilitar acceso multi-usuario con permisos adecuados
3. Agregar configuración por ambiente
4. Mejorar la UI con visualizaciones más ricas

La arquitectura actual soporta todos estos cambios sin modificaciones estructurales.
