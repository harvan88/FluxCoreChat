# WES Operations & Troubleshooting Guide

## Visión General
Este documento detalla los procedimientos operativos para mantener, monitorear y solucionar problemas en el Work Execution System (WES) de FluxCore.

## 1. Monitoreo y Observabilidad

### Dashboard de Métricas
El sistema emite métricas clave bajo el prefijo `wes.*`. Se recomienda configurar alertas para anomalías en estos indicadores.

| Métrica | Tipo | Descripción | Alerta Recomendada |
| :--- | :--- | :--- | :--- |
| `wes.work.opened` | Counter | Cantidad de nuevos trabajos iniciados. | Caída abrupta a 0. |
| `wes.work.completed` | Counter | Cantidad de trabajos finalizados exitosamente. | Relación baja vs opened. |
| `wes.work.failed` | Counter | Cantidad de trabajos fallidos. | > 5% del total. |
| `wes.interpreter.requests` | Counter | Total de mensajes analizados por IA. | - |
| `wes.interpreter.matches` | Counter | Total de intenciones detectadas. | - |
| `wes.interpreter.errors` | Counter | Errores en el proceso de interpretación (LLM, Parsing). | > 1% del total. |
| `wes.interpreter.skipped` | Counter | Solicitudes omitidas por Circuit Breaker. | > 0 (Indica problema grave). |
| `wes.interpreter.latency` | Histogram | Latencia del análisis de intención. | p95 > 2s. |

### Trazabilidad (Tracing)
Cada transacción WES está vinculada por un `traceId` único que fluye a través de todos los eventos.
- **Origen:** Generalmente el `messageId` del usuario o un ID generado por el Scheduler.
- **Propagación:**
  1. `AIOrchestrator` genera/recibe `traceId`.
  2. `WorkEngineService.proposeWork` lo persiste en `DecisionEvent` y `ProposedWork`.
  3. `WorkEvents` heredan el traceId.
  4. `ExternalEffects` usan el traceId para logs de herramientas.

**Para investigar un problema:**
1. Buscar el `conversationId`.
2. Encontrar el `workId` asociado.
3. Consultar `fluxcore_work_events` filtrando por `work_id` para ver la secuencia causal completa.

## 2. Circuit Breaker (Resiliencia)
El servicio `WesInterpreterService` está protegido por un Circuit Breaker (`wes-interpreter`).
- **Estado 'Closed':** Operación normal.
- **Estado 'Open':** El sistema ha detectado fallas consecutivas en el proveedor de LLM. **Se salta la interpretación** y se degrada a chat conversacional estándar.
- **Recuperación:** Automática tras `cooldownMs` (default 60s).

**Diagnóstico:**
Si los usuarios reportan que "el bot responde pero no inicia trámites", verificar si el Circuit Breaker está abierto debido a latencia o errores de la API de IA.

## 3. Troubleshooting

### Escenario A: El Interpreter no detecta nada
**Síntoma:** El usuario dice "Quiero agendar turno" y el bot responde texto genérico sin iniciar el Work.
**Posibles Causas:**
1. **Circuit Breaker Abierto:** Verificar métrica `wes.interpreter.skipped`.
2. **Definición Inactiva:** Verificar que `WorkDefinition` exista y no esté obsoleta.
3. **Falta de Evidencia:** El usuario no mencionó el `bindingAttribute` requerido explícitamente.
4. **Alucinación Negativa:** El modelo decidió no proponer nada (ver logs con `logTrace` en `AIOrchestrator`).

### Escenario B: Trabajos "Stuck" en estado CREATED
**Síntoma:** El Work se abrió pero no avanza de estado.
**Solución:**
1. Verificar si el FSM tiene transiciones automáticas fallidas.
2. Verificar si hay un `SemanticContext` pendiente (`pending`) que el usuario no ha confirmado.
3. Si es un error de sistema, se puede forzar transición administrativa (futuro feature admin).

### Escenario C: Confirmaciones Expiradas
**Síntoma:** El usuario confirma "Sí" pero el bot dice que no entiende o ignora.
**Causa:** El `SemanticContext` expiró (TTL por defecto 24h).
**Verificación:** Consultar tabla `fluxcore_semantic_contexts` donde `status = 'expired'`.

## 4. Mantenimiento (Scheduler)
El `WesSchedulerService` corre cada minuto para:
1. Marcar Works como `EXPIRED` si su TTL venció.
2. Invalidar contextos semánticos viejos.

Si el scheduler se detiene (caída de servidor), al reiniciar recuperará el trabajo pendiente en la siguiente ejecución.
