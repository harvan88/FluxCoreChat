# WES-190 — Hardening & Operational Excellence

## Goal Description
Asegurar que el Work Execution System (WES) sea robusto, observable y mantenible en producción. Convertir los prototipos funcionales en un sistema de ingeniería de grado empresarial.

## Diagnóstico Actual
- **Funcionalidad:** WES Core (100/150/155/160), Scheduler (165), AI (170) y UI (180) están implementados.
- **Observabilidad:** Existen logs (`logTrace`) dispersos. No hay métricas agregadas (conteo de Works creados, latencia de Interpreter).
- **Resiliencia:** El manejo de errores en `AIOrchestrator` es básico. No hay Circuit Breaker explícito para el Interpreter.
- **Testing:** Faltan tests de integración end-to-end del flujo completo (Mensaje -> Interpreter -> Work -> UI).

## Definición (Qué construir)

### 1. Métricas (Observabilidad)
Integrar con `metrics.service.ts`:
- `wes_works_opened_total`: Counter.
- `wes_interpreter_latency_seconds`: Histogram.
- `wes_proposals_accepted_total`: Counter.
- `wes_semantic_confirmations_total`: Counter.

### 2. Trazabilidad Distribuida
- Asegurar que el `traceId` se propague desde el `MessageEnvelope` hasta los `WorkEvents` y `ExternalEffects`.
- Estandarizar el formato de `searchable_trace_id`.

### 3. Resiliencia
- Implementar **Circuit Breaker** para `WesInterpreterService` (si el LLM falla X veces o tarda mucho, degradar a chat simple sin intentar interpretar).
- Validar idempotencia en `ExternalEffects` con tests de estrés.

### 4. Runbooks & Documentación
- Crear guía de troubleshooting: "¿Qué hacer si el Interpreter no detecta nada?".
- Documentar procedimiento de recuperación ante fallos de integridad (ej. Work en estado inconsistente).

## Plan de Transición

1. **Instrumentación:**
   - [ ] Modificar `InterpreterService` para emitir métricas.
   - [ ] Modificar `WorkEngineService` para emitir métricas de ciclo de vida.

2. **Testing:**
   - [ ] Crear `wes.integration.test.ts`: Simular flujo completo con mocks de LLM.

3. **Circuit Breaker:**
   - [ ] Envolver `interpreter.interpret` con política de fallo rápido.

## Validación
- Dashboard de Grafana (o logs estructurados) mostrando flujo de Works.
- Test de carga simulando 50 usuarios concurrentes creando Works.
