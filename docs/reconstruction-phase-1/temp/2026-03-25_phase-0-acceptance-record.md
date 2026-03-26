# Registro de aceptación — Fase 0

**Fecha:** 2026-03-25
**Fase:** 0
**Nombre:** Contratos canónicos y límites arquitectónicos
**Estado:** accepted_for_execution_planning
**Documento fuente:** `2026-03-25_phase-0-rfc-canonical-contracts.md`

---

## 1. Decisión

La Fase 0 se considera **suficientemente cerrada** para habilitar la planificación operativa de la Fase 1.

Esto significa:
- se acepta el vocabulario canónico base,
- se acepta la separación semántica entre contexto, estrategia y composición,
- se acepta la taxonomía de capabilities,
- y se acepta la regla de no avanzar a implementación compleja sin validación por fase.

No significa todavía:
- que todas las decisiones de bajo nivel estén implementadas,
- ni que el modelo físico de persistencia ya esté definido.

---

## 2. Resultado aceptado

Quedan aceptadas como base de trabajo las siguientes definiciones:

- `PolicyContext`
- `RuntimeSelection`
- `RuntimeComposition`
- `CapabilityDefinition`
- `CapabilityOffer`
- `ExecutionAction`

Quedan aceptadas como reglas operativas:

- separación negocio vs técnica
- una sola estrategia de runtime activa por cuenta
- no fallback silencioso entre runtimes
- clasificación `query | command`
- templates como command capability de plataforma
- RAG como query capability de plataforma
- side effects finales fuera del runtime
- separación Kernel vs trazas técnicas

---

## 3. Checklist de aceptación

- [x] `PolicyContext` definido como contexto de negocio puro
- [x] `RuntimeSelection` definido como estrategia única por cuenta
- [x] `RuntimeComposition` definido como capa técnica separada
- [x] ownership cross-runtime fijado en plataforma
- [x] taxonomía `query | command` fijada
- [x] regla de no side effects finales en runtime fijada
- [x] templates clasificados como command capability
- [x] RAG clasificado como query capability
- [x] no fallback automático entre runtimes fijado
- [x] `inactive` fijado como estado legítimo
- [x] separación Kernel vs trazas técnicas fijada
- [x] criterio de habilitación de Fase 1 definido

---

## 4. Riesgos residuales aceptados

Se acepta continuar con los siguientes riesgos controlados:

- **`R1`**
  - el shape exacto persistido de `RuntimeSelection` aún no está decidido

- **`R2`**
  - el contrato tipado final de `ExecutionAction` puede requerir refinamiento

- **`R3`**
  - el diseño físico del trace store no está decidido todavía

- **`R4`**
  - los nombres finales de servicios pueden variar, mientras respeten la semántica aceptada

Estos riesgos **no bloquean** la Fase 1, porque Fase 1 trabaja sobre separación de responsabilidades, no sobre cierre final de infraestructura física.

---

## 5. Gate habilitado

### Se habilita

- planificación detallada de la Fase 1
- diseño de pruebas de separación de resolvers
- identificación de archivos y contratos a intervenir

### No se habilita aún

- migración de templates
- migración de RAG
- cambios fuertes en runtimes
- retiro de legacy

---

## 6. Criterio de control

La Fase 1 deberá validar empíricamente que ya no existan fuentes duplicadas de verdad para:
- negocio autorizado
- estrategia de runtime
- composición técnica

Si esa condición no se demuestra, no se pasa a Fase 2.

---

## 7. Estado final

- **Fase 0:** aceptada para planificación de ejecución
- **Próximo paso autorizado:** Fase 1
