# Revisión operativa — `FLUX_NEW_ARCHITECTURE=true` y remanentes legacy

**Fecha:** 2026-03-25
**Estado:** registro técnico vigente
**Propósito:** dejar constancia de qué papel real conserva hoy `FLUX_NEW_ARCHITECTURE` y dónde vive el legacy residual que todavía importa para la reconstrucción.

---

## 1. Conclusión ejecutiva

`FLUX_NEW_ARCHITECTURE=true` **no debe tratarse hoy como fuente operativa de verdad del pipeline cognitivo**.

La revisión actual del código muestra que:

- el arranque operativo principal del Kernel ya no depende de ese flag,
- `cognitionWorker` arranca de forma incondicional en el `server.ts` actual,
- el flag sobrevive principalmente como **remanente documental/configuracional**,
- y la deuda legacy viva más relevante ya no está en ese flag, sino en **bridges y adapters transicionales** todavía conectados.

---

## 2. Hallazgos verificados en código

## 2.1 Arranque operativo actual

En `apps/api/src/server.ts` se verificó que:

- `kernelDispatcher.start()` se ejecuta
- `startProjectors()` se ejecuta
- `bootstrapKernel()` se ejecuta
- `runtimeGateway.register(fluxiRuntime)` se ejecuta
- `cognitionWorker.start()` se ejecuta con el log `CognitionWorker (Always ON)`

### Implicación

El arranque de la nueva arquitectura **ya no está condicionado** por `FLUX_NEW_ARCHITECTURE` en el flujo principal observado.

---

## 2.2 Estado del flag en configuración

Se detectó `apps/api/src/config/features.ts` con:

- `ENABLE_NEW_ARCHITECTURE: process.env.FLUX_NEW_ARCHITECTURE === 'true'`

Pero la búsqueda transversal actual no mostró consumidores operativos activos de esa constante en `apps/api/src`.

### Implicación

`config/features.ts` actúa hoy como **remanente no canónico o no conectado** para este concern.

No debe usarse como prueba de selección real de path.

---

## 2.3 Feature flags canónicos actualmente vivos

La configuración realmente conectada al `server.ts` actual pasa por `apps/api/src/config/feature-flags.ts`.

En esta revisión, ese sistema solo gobierna:

- `accountDeletionQueue`

### Implicación

El mecanismo de feature flags hoy **no presenta a `FLUX_NEW_ARCHITECTURE` como flag operativo canónico** dentro del bootstrap principal revisado.

---

## 2.4 Remanentes legacy reales todavía vivos

### A. `SmartDelayService`

En `apps/api/src/services/smart-delay.service.ts` el propio archivo se declara deprecated y describe que sigue vivo por compatibilidad con `ws-handler.ts`.

Además, la búsqueda confirmó uso activo en:

- `apps/api/src/websocket/ws-handler.ts`
- `apps/api/src/services/runtimes/fluxcore-runtime.adapter.ts`

### Implicación

La deuda residual real sigue presente en comportamiento legacy de auto-reply/debounce y no en el flag como selector maestro.

### B. `FluxCoreRuntimeAdapter`

En `apps/api/src/services/runtimes/fluxcore-runtime.adapter.ts` se observó:

- dependencia directa de `aiService`
- uso de `smartDelayService`
- ejecución y envío manual de efectos vía `messageCore`

### Implicación

Este adapter representa una pieza de compatibilidad importante que aún mezcla decisiones y ejecución fuera del contrato más puro del pipeline nuevo.

### C. `TestingSwitchService`

Existe `apps/api/src/services/fluxcore/testing-switch.service.ts`, pero en la revisión actual no aparecieron consumidores activos dentro de `apps/api/src`.

### Implicación

Parece remanente de experimentación/testing paralelo y no una fuente operativa actual de truth routing.

---

## 3. Riesgo arquitectónico real

El riesgo principal actual no es que `FLUX_NEW_ARCHITECTURE=true` esté activando secretamente un path legacy central.

El riesgo real es otro:

- coexistencia de componentes transicionales con semántica legacy,
- documentación histórica que todavía describe al flag como selector central,
- y posibilidad de confundir `flag presente en .env` con `mecanismo real de control del runtime`.

Eso sí puede degradar la lectura del sistema y generar falsa percepción de múltiples fuentes de verdad.

---

## 4. Regla operativa recomendada

Mientras no se retire el material transicional:

- `FLUX_NEW_ARCHITECTURE` debe tratarse como **señal histórica/configuracional residual**, no como evidencia suficiente del path activo
- el path activo debe inferirse de:
  - bootstrap real del servidor
  - workers efectivamente levantados
  - projectors activos
  - logs operativos del pipeline
  - efectos certificados/entregados

---

## 5. Impacto sobre las fases

## Fase 2

- este hallazgo **no invalida** el trabajo de observabilidad mínima
- sí refuerza que `Live Cognitive Pipeline` no puede convertirse en fuente única de verdad

## Fase 3

- refuerza la necesidad de consolidar ownership platform/runtime
- reduce el riesgo de diseñar capabilities sobre una lectura equivocada del flag

## Fase 9

- el retiro final de legacy debe enfocarse en:
  - adapters transicionales
  - servicios deprecated todavía conectados
  - tool systems paralelos
  - remanentes documentales/configuracionales no usados

---

## 6. Decisión registrada

Se registra que:

- `FLUX_NEW_ARCHITECTURE=true` **no bloquea** el avance de las siguientes fases por sí mismo,
- no debe usarse como fuente de verdad del enrutamiento actual,
- y el legado residual a seguir atacando vive principalmente en compatibilidades operativas aún conectadas, no en el flag aislado.
