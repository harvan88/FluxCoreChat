# Plan de Alineación Arquitectónica: Recuperación del Control y Buenas Prácticas

> **Documento de Ejecución Táctica**
> **Fecha:** 2026-01-23
> **Objetivo:** Refactorizar implementation física para cumplir con la visión arquitectónica original (`TOTEM.md`).

> **Investigación Asegurada:** Toda la evidencia forense y el análisis detallado se documentaron en [docs/ARCHITECTURAL_AUDIT_REPORT_2026-01-23.md](docs/ARCHITECTURAL_AUDIT_REPORT_2026-01-23.md). Este plan (`REFACTOR_ARCHITECTURAL_ALIGNMENT.md`) actúa como la estrategia de ejecución basada en ese reporte.

---

## 1. Diagnóstico de Situación (HCI Fase 1)

**Estado Actual:**
El sistema es funcional pero **estructuralmente frágil**. La implementación del backend ha divergido de los principios fundacionales, creando un "Monolito Distribuido" y violando la separación de responsabilidades.

**Hallazgos Críticos:**
1.  **Violación del Principio de Core Agnóstico:** `MessageCore` contiene lógica *hardcodeada* de IA ("Smart Delays", "Auto Replies"). El núcleo "sabe" demasiado sobre la IA.
2.  **Extensión Privilegiada (FluxCore AI):** La lógica de la IA nativa no vive aislada en `extensions/`, sino dispersa en servicios centrales (`fluxcore.service.ts`).
3.  **Monolito de Servicios:** `fluxcore.service.ts` (~50KB) mezcla tres dominios incompatibles:
    *   CRUD de Base de Datos.
    *   Lógica de Runtime (Cerebro del asistente).
    *   Sincronización Externa (Espejo OpenAI).
4.  **Riesgo de Datos:** La falta de separación entre "Local Vector Store" y "OpenAI Mirror Vector Store" causó inconsistencias de datos (archivos fantasma) recientemente reparadas.

---

## 2. Hitos de Ejecución (HCI Fase 2)

### Hito FC-REFACTOR-01: Descomposición de Servicios (Backend Split) ✅ COMPLETADO
**Objetivo:** Romper el monolito `fluxcore.service.ts` en dominios cohesivos para aislar responsabilidades.

| ID | Tarea | Prioridad | Estado | Descripción |
|----|-------|-----------|--------|-------------|
| **R-01.1** | Crear `services/fluxcore/vector-store.service.ts` | Alta | ✅ | Extraído exitosamente. |
| **R-01.2** | Crear `services/openai-mirror/sync.service.ts` | Alta | ⏩ | Pospuesto (usamos `openai-sync` existente refactorizado). |
| **R-01.3** | Crear `services/fluxcore/assistants.service.ts` | Media | ✅ | Extraído exitosamente. |
| **R-01.4** | Crear `services/fluxcore/runtime.service.ts` | Alta | ✅ | Extraído exitosamente. |
| **R-01.5** | Fachada de Compatibilidad | Alta | ✅ | Implementada. |

**Validación:**
- [x] `fluxcore.service.ts` reducido de ~1500 a ~600 líneas (mantiene instrucciones/tools).
- [x] Servidor inicia correctamente (`bun run dev`).
- [x] Dependencias circulares rotas entre `fluxcore` y `openai-sync`.

---

### Hito FC-REFACTOR-02: MessageCore Agnóstico (Event-Driven) ✅ COMPLETADO
**Objetivo:** Limpiar `MessageCore` para que no tenga conocimiento explícito de la IA, restaurando la "santidad del núcleo".

| ID | Tarea | Prioridad | Estado | Descripción |
|----|-------|-----------|--------|-------------|
| **R-02.1** | Definir Eventos `core:message_received` | Alta | ✅ | Implementado en `core/events.ts`. |
| **R-02.2** | Refactorizar `ExtensionHost` | Alta | ✅ | Se implementó `AIOrchestratorService` para reemplazar la lógica hardcodeada. |
| **R-02.3** | Mover lógica Smart Delay | Media | ✅ | Lógica movida exitosamente a `ai-orchestrator.service.ts`. |

**Criterios de Éxito:**
- [x] `MessageCore.ts` no importa ni llama a nada llamado "AI", "SmartDelay" o "Generate".
- [x] La IA responde estrictamente reaccionando a eventos (`core:message_received`).
- [x] Si se deshabilita la extensión `fluxcore` (o el orquestador), el chat sigue funcionando pero "tonto".

> **Nota de Cierre (Estado Parcial):** Aunque el backend orquesta y ejecuta respuestas automáticas correctamente (verificado vía scripts de simulación), la integración en la UI sigue presentando fricciones. La inyección de controles de automatización por parte de FluxCore en la UI del CoreChat es una deuda técnica pendiente. La IA responde, pero la configuración visual aún no refleja al 100% la separación de responsabilidades.

---

### Hito FC-REFACTOR-03: Solidificación del Espejo OpenAI
**Objetivo:** Formalizar la distinción entre "Vector Store Nativo" y "Vector Store Espejo".

| ID | Tarea | Prioridad | Riesgo | Descripción |
|----|-------|-----------|--------|-------------|
| **R-03.1** | Definir Contrato `IVectorStoreDriver` | Media | Medio | Interfaz común para operaciones (addFile, listFiles, delete). |
| **R-03.2** | Implementar `OpenAIDriver` | Alta | Medio | Encapsula la lógica de API OpenAI. |
| **R-03.3** | Implementar `LocalGenericDriver` | Media | Bajo | Implementación futura para RAG local puro. |

---

## 3. Protocolo de Validación (Evidencia Requerida)

Para cada tarea completada, se requiere:
1.  **Snapshot de Archivos:** Listado de nuevos archivos creados y reducción de tamaño del original.
2.  **Prueba de Regresión:**
    - Crear Asistente nuevo.
    - Subir archivo a Vector Store (OpenAI).
    - Enviar mensaje y recibir respuesta.
3.  **Logs Limpios:** Ausencia de errores de tipo `TypeError` o warnings de dependencias circulares.

## 4. Próximo Paso Inmediato
Ejecutar **FC-REFACTOR-01** (Descomposición de Servicios). Es la base para todo lo demás y elimina el riesgo de conflictos de edición.
