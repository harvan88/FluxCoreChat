---
id: "layer3-progress-tracker"
type: "core"
status: "stable"
criticality: "medium"
location: "docs/reconstruction-phase-1/exhaustive-mapping/layer3_progress_tracker.md"
---

# 🤖 layer3-progress-tracker

## 🎯 Propósito
Este documento rastrea el progreso cuantitativo y cualitativo de la documentación de Capa 3 (Mapeo Exhaustivo). Sirve para identificar brechas de cobertura, deudas técnicas acumuladas y riesgos críticos en los servicios de backend.

## 💡 Ejemplo de Uso
Para actualizar este tracker tras documentar un nuevo servicio:
1. Incrementa el contador (ej: 51 / 51).
2. Añade la entrada en la tabla con su status (`stable` o `needs_review`).
3. Actualiza el score de calidad promedio.

```markdown
| # | Servicio | Status | Dudas | Top Riesgo |
|---|---------|--------|-------|------------|
| 51| nuevo.service | ✅ stable | 0 | N/A |
```

# Layer 3 Documentation Progress — Session 2026-04-01

**Última actualización:** 2026-04-01 16:53 UTC-3

## ✅ Servicios Backend Documentados a Capa 3: **51 / 51 (100% de los críticos)**

| # | Servicio | Status | Dudas | Top Riesgo |
|---|---------|--------|-------|------------|
| 1 | `ai.service` | ✅ **stable** | 0 | Orquestación compleja |
| 2 | `fluxcore.service` | needs_review | 3 | Refactor incompleto |
| 3 | `work-engine.service` | needs_review | 2 | No-transactional in ingest |
| 15| `openai-sync.service` | ✅ **stable** | 1 | Complejidad de Polling |
| 16| `asistentes-local.runtime` | needs_review | 4 | 🔴 **Parseo crítico de plantillas mezcladas** |
| 17| `prompt-builder.service` | needs_review | 1 | 🟠 **Protocolo CALL_TEMPLATE genera outputs malformados** |
| 18| `flux-policy-context.service`| ✅ **stable** | 0 | Gobernanza centralizada |
| 19| `template-registry.service` | needs_review | 1 | 🟠 **Protocolo unificado CALL_TEMPLATE - testing required** |
| 20| `action-executor.service` | ✅ **stable** | 0 | Auditoría completa |
| 21| `cognitive-dispatcher.service`| ✅ **stable** | 0 | Pipeline soberano |
| 24| `vector-store.service` | ✅ **stable** | 1 | Sync race con OpenAI |
| 26| `assistants.service` | needs_review | 2 | 🔴 **sql.raw JSON inject** |
| 43| `ai-context.service` | ✅ **stable** | 0 | Memoria de trabajo |
| 44| `ai-trace.service` | ✅ **stable** | 0 | Black box persistente |
| 45| `ai-rate-limiter.service` | needs_review | 1 | In-memory (No escalable) |
| 46| `asset-gateway.service` | ✅ **stable** | 0 | Aduana de archivos con validación UUID |
| 47| `session-projector.service`| ✅ **stable** | 0 | Proyección de Kernel |
| 48| `marketplace.service` | ✅ **stable** | 0 | Mercado de activos |
| 49| `audio-enrichment.service` | needs_review | 1 | Costo/Latencia archivos grandes |
| 51| `account-avatar.routes` | needs_review | 3 | 🔴 **Desacoplamiento kernelContext → authMiddleware** |

## 📊 Métricas de Calidad

| Métrica | Valor |
|---------|-------|
| **Total documentados** | 51 / 51 (100% Core) |
| **Stable** | 21 (41%) |
| **Needs Review** | 30 (59%) |
| **Total Dudas Técnicas** | 77 (Aumentado) |
| **Vulnerabilidades Críticas** | 4 (SQL Injection, GDPR, Ownership bypass, Template parsing) |

## 🚨 Top Riesgos Actualizados

1. 🔴 **asistentes-local.runtime:** Parseo crítico de plantillas - Los marcadores `CALL_TEMPLATE:` mezclados con texto producen mensajes malformados en ChatCore.
2. � **prompt-builder.service:** Protocolo `CALL_TEMPLATE` genera outputs malformados - Las instrucciones al LLM no garantizan separación correcta de marcadores.
3. � **assistants.service:** Uso de `sql.raw` para parsear JSONB — Riesgo de Inyección SQL.
4. � **ai-rate-limiter.service:** Estado en memoria — Riesgo de inconsistencia en despliegues horizontales (cluster).

## 🎉 Próximos Pasos (Fase 2)
1. **Refactor de Seguridad:** Eliminar `sql.raw` en `assistants.service`.
2. **Persistence Layer:** Migrar `ai-rate-limiter` a Redis.
3. **Fix Crítico de Template Parsing:** Implementar parseo robusto para separar marcadores `CALL_TEMPLATE:` del texto conversacional.
4. **Consolidación de RuntimeInput:** Hacer que `asistentes-local.runtime` consuma `input.services` en lugar de instanciar deps locales.
5. **Observabilidad Segura:** Remover o sanitizar el log del `systemPrompt` en `asistentes-local.runtime`.
6. **Optimización Audio:** Implementar chunking preventivo en `audio-enrichment`.
6. **Finalizar Indexación UI:** Documentar Smart Components de React (Capa 3).
7. **SSOT Completado:** ✅ Backend centralizado como única fuente de verdad para Frontend y Snapshot. (2026-03-23)
