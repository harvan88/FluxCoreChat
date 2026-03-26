# Registro de validación — Fase 1

**Fecha:** 2026-03-25
**Fase:** 1
**Nombre:** Separación de resolvers centrales
**Estado:** validated_for_phase_2_planning
**Documento fuente:** `2026-03-25_phase-1-resolvers-separation-plan.md`

---

## 1. Decisión

La Fase 1 se considera **suficientemente validada** para habilitar la planificación y preparación operativa de la Fase 2.

Esto significa:
- quedó instalada una separación operativa entre `PolicyContext`, `RuntimeSelection` y `RuntimeComposition` en el pipeline cognitivo central,
- el `CognitiveDispatcher` ya consume esas dimensiones en secuencia explícita,
- y la doble resolución central detectada al inicio de la fase dejó de ser el comportamiento dominante del pipeline.

No significa todavía:
- que toda la deuda legacy asociada haya sido retirada,
- que todos los consumidores laterales hayan migrado a contratos finales más puros,
- ni que el repositorio completo esté libre de errores TypeScript ajenos a esta fase.

---

## 2. Resultado validado

Queda validado como resultado de Fase 1 lo siguiente:

- existe una ruta explícita para resolver `PolicyContext` como contexto de negocio,
- existe una ruta explícita para resolver `RuntimeSelection` como decisión estratégica por cuenta,
- existe una ruta explícita para resolver `RuntimeComposition` como composición técnica de ejecución,
- el `CognitiveDispatcher` resuelve primero negocio, luego estrategia y luego composición,
- el `CognitiveDispatcher` ya no re-resuelve la composición técnica por múltiples caminos paralelos dentro del flujo principal,
- y la ruta `inactive` quedó modelada como estado explícito de selección.

Evidencia principal observada:

- `apps/api/src/services/flux-policy-context.service.ts`
  - expone una resolución pura de policy mediante `resolvePolicyContext(...)` y `resolvePolicyOnly(...)`
- `apps/api/src/services/runtime-selection.service.ts`
  - encapsula la estrategia `assistants | fluxi` y el estado `active | inactive`
- `apps/api/src/services/runtime-composition.service.ts`
  - encapsula la composición técnica final del runtime
- `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`
  - consume secuencialmente `resolvePolicyContext(...)`, `runtimeSelectionService.resolve(...)` y `runtimeCompositionService.resolve(...)`

---

## 3. Checklist de validación

- [x] `PolicyContext` tiene API dedicada de resolución en el pipeline principal
- [x] `RuntimeSelection` tiene resolver central dedicado
- [x] `RuntimeComposition` tiene resolver central dedicado
- [x] `CognitiveDispatcher` consume las tres piezas en secuencia explícita
- [x] `CognitiveDispatcher` ya no llama directamente a resoluciones paralelas de runtime como mecanismo principal
- [x] existe tratamiento explícito para `inactive`
- [x] la ruta principal de `assistants` compone runtime técnico desde servicio dedicado
- [x] la ruta principal de `fluxi` compone runtime técnico desde servicio dedicado
- [x] hay trazabilidad suficiente para atribuir decisión de strategy/runtime dentro del dispatcher
- [x] la validación focalizada no detectó errores nuevos en los archivos intervenidos por esta fase

---

## 4. Evidencia técnica registrada

### Inspección estructural

Se verificó que el dispatcher usa la secuencia:

```text
1. resolvePolicyContext
2. runtimeSelectionService.resolve
3. corte por inactive cuando aplica
4. runtimeCompositionService.resolve
5. construcción de RuntimeInput
6. runtimeGateway.invoke
7. actionExecutor.execute
```

### Verificación de no duplicidad central

Se verificó por búsqueda focalizada que `cognitive-dispatcher.service.ts` ya no usa como camino principal:

- `runtimeConfigService.getRuntime(...)`
- `resolveActiveAssistant(...)`
- `resolveExecutionPlan(...)`
- `resolveContext(...)`

### Validación técnica disponible

Se ejecutó validación estática focalizada sobre los archivos intervenidos.

Resultado:
- no quedaron errores nuevos en los archivos modificados de esta fase,
- pero la validación global del repo continúa contaminada por errores previos no relacionados con Fase 1.

---

## 5. Riesgos residuales aceptados

Se acepta continuar con los siguientes riesgos controlados:

- **`R1`**
  - `resolveContext(...)` permanece como wrapper de compatibilidad y todavía devuelve `runtimeConfig` para no romper integraciones legacy

- **`R2`**
  - el cableado final de `RuntimeInput.services` sigue en modo de compatibilidad transicional y no representa todavía la plataforma canónica de capabilities

- **`R3`**
  - la validación TypeScript global del monorepo sigue afectada por errores previos en archivos fuera de esta fase

- **`R4`**
  - la unificación total de consumidores laterales y runtimes aún requiere fases posteriores

Estos riesgos **no bloquean** la preparación de Fase 2, porque la siguiente fase ataca observabilidad mínima del pipeline y no la purificación completa de capabilities ni el retiro total de legacy.

---

## 6. Gate habilitado

### Se habilita

- planificación detallada de la Fase 2
- validación operativa de observabilidad end-to-end del pipeline cognitivo
- endurecimiento mínimo de la pista de telemetría hacia Kernel Console

### No se habilita aún

- apertura de Fase 3
- migración de capabilities cross-runtime
- retiro global de rutas legacy
- purificación completa de runtimes

---

## 7. Criterio de control para la siguiente fase

La Fase 2 deberá demostrar empíricamente que una ejecución cognitiva puede reconstruirse de punta a punta con trazabilidad técnica mínima, incluyendo al menos:

- `messageId` o identificador correlacionable de origen
- `conversationId`
- paso del pipeline
- estado del paso
- `runtimeId` cuando aplique
- error técnico cuando aplique

Si esa condición no se demuestra, no se pasa a Fase 3.

---

## 8. Estado final

- **Fase 1:** validada para planificación de Fase 2
- **Próximo paso autorizado:** preparar y abrir Fase 2
