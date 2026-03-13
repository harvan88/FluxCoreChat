# Inventario de documentación legacy y plan de consolidación

## Objetivo de este documento

Dejar inventariado qué documentación histórica sigue existiendo fuera de la carpeta activa, cómo debe interpretarse y cuál debería ser su destino dentro del proceso de limpieza documental.

## Regla principal

La carpeta activa y oficial sigue siendo:

- `docs/reconstruction-phase-1`

Todo lo listado aquí debe considerarse subordinado a esa carpeta.

## Estado actual de la consolidación

La consolidación física principal ya fue ejecutada.

Hoy el estado real es este:

- la documentación activa vive en `docs/reconstruction-phase-1`
- la documentación histórica del antiguo árbol `docs/` fue movida a `docs/reconstruction-phase-1/_historical`
- los markdowns históricos sueltos de la raíz del repositorio fueron movidos a `docs/reconstruction-phase-1/_historical/repo-root-docs`

## 1. Estado deseado

### Activo

Documentos que describen el sistema actual y deben seguir evolucionando:

- `docs/reconstruction-phase-1/README.md`
- `docs/reconstruction-phase-1/canonical-definitions.md`
- `docs/reconstruction-phase-1/documentation-governance.md`
- `docs/reconstruction-phase-1/chatcore-overview.md`
- `docs/reconstruction-phase-1/kernel-overview.md`
- `docs/reconstruction-phase-1/fluxcore-overview.md`
- `docs/reconstruction-phase-1/chatcore-components.md`
- `docs/reconstruction-phase-1/chatcore-assets.md`
- `docs/reconstruction-phase-1/kernel-components.md`
- `docs/reconstruction-phase-1/fluxcore-components.md`
- `docs/reconstruction-phase-1/system-flows.md`

### Histórico

Documentos que pueden conservarse como evidencia o insumo, pero no deben seguir compitiendo con la carpeta activa.

## 2. Subárboles documentales legacy ya identificados

### `docs/chatcore`

Documentos relevantes detectados:

- `Asset Infrastructure - Unified Design.md`
- `CHATCORE_KERNEL_INTEGRATION_v2.0.md`
- `CHATCORE_REDESIGN_v1.3.md`
- `CHAT_LOGIC_ANALYSIS.md`
- `ChatCore - Vision Document.md`
- `ChatCore Asset Pipeline - Estado 2026-02-26.md`
- `Chatcore elimination inventory.md`
- `FLUJO_COMPLETO_ACTUALIZADO.md`
- `Kernel bootstrap y runtime.md`
- `perfil-publico-analisis.md`

Clasificación recomendada:

- **absorción conceptual**
  - `ChatCore - Vision Document.md`
  - `Asset Infrastructure - Unified Design.md`
  - `perfil-publico-analisis.md`
- **histórico técnico**
  - `CHATCORE_KERNEL_INTEGRATION_v2.0.md`
  - `FLUJO_COMPLETO_ACTUALIZADO.md`
  - `ChatCore Asset Pipeline - Estado 2026-02-26.md`
- **auditoría / análisis legacy**
  - `CHAT_LOGIC_ANALYSIS.md`
  - `CHATCORE_REDESIGN_v1.3.md`
  - `Chatcore elimination inventory.md`
  - `Kernel bootstrap y runtime.md`

### `docs/fluxcore`

Documentos relevantes detectados:

- `FLUXCORE_CANON_FINAL_v8.3.md`
- `FLUXCORE_CANON_FINAL_v8.2.md`
- `FLUXCORE_ASISTENTES_CANON.md`
- `FLUXCORE_WES_CANON.md`
- `POLICY_CONTEXT_GUIDE.md`
- `FLUXCORE_SIGNAL_CANON.md`
- `FLUXCORE_KERNEL_FOUNDATION.md`
- `AUDIT_RUNTIMES.md`
- `AUDIT_KERNEL_PROJECTORS.md`
- `ARCHITECTURE_MAP.md`
- `MIGRATION_STRATEGY.md`
- `SYSTEM_ARCHITECTURE_KB.md`

Clasificación recomendada:

- **fuente canónica histórica recuperable**
  - `FLUXCORE_CANON_FINAL_v8.3.md`
  - `FLUXCORE_ASISTENTES_CANON.md`
  - `FLUXCORE_WES_CANON.md`
  - `POLICY_CONTEXT_GUIDE.md`
  - `FLUXCORE_SIGNAL_CANON.md`
  - `FLUXCORE_KERNEL_FOUNDATION.md`
- **histórico de auditoría**
  - `AUDIT_RUNTIMES.md`
  - `AUDIT_KERNEL_PROJECTORS.md`
  - `AUDIT_DATABASE_SCHEMA.md`
  - `AUDIT_FRONTEND.md`
  - `AUDIT_SERVICES_TOOLS.md`
  - `DOC_AUDIT_REPORT.md`
- **planes o evolución**
  - `MIGRATION_STRATEGY.md`
  - `FLUXCORE_V8_IMPLEMENTATION_PLAN.md`
  - `REFACTOR_MILESTONES.md`
  - `PROGRESS_LOG.md`
- **mapas / notas de arquitectura previas**
  - `ARCHITECTURE_MAP.md`
  - `SYSTEM_ARCHITECTURE_KB.md`
  - `EXECUTION_TRACE.md`

### `docs/kernel`

Documentos relevantes detectados:

- `CHATCORE_KERNEL_INTERSECTION.md`

Clasificación recomendada:

- **fuente histórica recuperable**
  - `CHATCORE_KERNEL_INTERSECTION.md`

### `docs/archive`

Documentos detectados:

- hitos históricos
- instrucciones de prueba históricas
- auditorías viejas
- planes correctivos y de continuidad

Clasificación recomendada:

- **archivo histórico** completo

## 3. Markdowns sueltos en `docs/`

Se detectó un volumen grande de markdowns sueltos en `docs/`, por ejemplo:

- `ARCHITECTURAL_AUDIT_REPORT_2026-01-23.md`
- `AI_FLOW_ANALYSIS_2026-01-14.md`
- `ANALISIS_RUNTIME_AI_CHAIN.md`
- `CHAT_BACKEND_FRONTEND_MAPPING.md`
- `OPENAI_VECTOR_STORE_REFERENCE.md`
- `VECTOR_STORE_AUDIT_2026-01-23.md`
- `VECTOR_STORE_TRANSFORMATION_PLAN.md`
- `VISITOR_FLOW_FIX_2026-02-22.md`
- múltiples documentos de UI, auditoría, deployment y testing

Clasificación recomendada:

- **auditorías**
- **planes**
- **referencias técnicas**
- **notas de implementación**

No deben seguir viviendo al mismo nivel que la carpeta activa si el objetivo es reducir ruido.

## 4. Markdowns sueltos en la raíz del repositorio

También existen markdowns sueltos en la raíz, por ejemplo:

- `ANALISIS_ARQUITECTURA_FLUXCORE.md`
- `ARQUITECTURA_CORRECTA.md`
- `TOTEM.md`
- `ASSET_MANAGEMENT_PLAN.md`
- `WAR_ROOM_ASSETS.md`
- `ARCHITECTURE_AUDIT.md`
- `DOC_DATABASE.md`
- múltiples protocolos, planes, reportes e informes

Clasificación recomendada:

- **historical-canon-sources** para los pocos que todavía contienen definiciones recuperables
- **historical-audits** para reportes y diagnósticos
- **historical-plans** para planes de ejecución o migración
- **historical-notes** para notas de trabajo o war rooms

## 5. Consolidación física ejecutada

La estructura resultante del árbol documental quedó alineada con este modelo:

```text
docs/
  README.md
  reconstruction-phase-1/
    README.md
    canonical-definitions.md
    documentation-governance.md
    legacy-document-inventory.md
    chatcore-overview.md
    kernel-overview.md
    fluxcore-overview.md
    chatcore-components.md
    chatcore-assets.md
    kernel-components.md
    fluxcore-components.md
    system-flows.md
    _historical/
      canon/
      audits/
      plans/
      notes/
```

Con esta forma:

- la carpeta activa sigue siendo clara
- los históricos quedan dentro del mismo árbol documental
- se reduce el ruido visual del repo
- se evita que documentos viejos sigan compitiendo con la carpeta activa

## 6. Prioridad de absorción restante

La limpieza física principal ya se hizo. Lo que queda pendiente es absorción selectiva de contenido útil desde `_historical` hacia documentos activos cuando todavía aporte valor.

### Primera prioridad

Absorber conceptualmente desde `_historical`:

- `_historical/chatcore/ChatCore - Vision Document.md`
- `_historical/chatcore/Asset Infrastructure - Unified Design.md`
- `_historical/fluxcore/FLUXCORE_CANON_FINAL_v8.3.md`
- `_historical/fluxcore/FLUXCORE_ASISTENTES_CANON.md`
- `_historical/fluxcore/FLUXCORE_WES_CANON.md`
- `_historical/fluxcore/POLICY_CONTEXT_GUIDE.md`
- `_historical/kernel/CHATCORE_KERNEL_INTERSECTION.md`
- `_historical/archive/HITO_COR004_ACTOR_MODEL.md`
- `_historical/repo-root-docs/TOTEM.md`
- `_historical/repo-root-docs/ARQUITECTURA_CORRECTA.md`
- `_historical/repo-root-docs/ANALISIS_ARQUITECTURA_FLUXCORE.md`

### Segunda prioridad

Absorber o resumir auditorías que todavía expliquen decisiones vigentes.

### Tercera prioridad

Reclasificar con más detalle `_historical/root-docs/` y `_historical/repo-root-docs/` si se quiere una taxonomía más fina.

## 7. Qué ya no debe pasar tras esta consolidación

- crear arquitectura nueva fuera de `docs/reconstruction-phase-1`
- usar markdowns históricos como si fueran verdad vigente
- dejar documentos sueltos en raíz compitiendo con la documentación activa
- mezclar canon, auditoría, war room y plan de ejecución en el mismo nivel del árbol

## 8. Decisión vigente

La decisión documental ya quedó aplicada en el árbol del repositorio:

- la conversación arquitectónica vigente continúa en `docs/reconstruction-phase-1`
- la documentación histórica solo se consulta como insumo o evidencia
- la verdad presente del sistema debe escribirse y mantenerse en esta carpeta activa
