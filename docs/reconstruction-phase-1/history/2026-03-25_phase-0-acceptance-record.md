# Registro de aceptaci√≥n ‚Äî Fase 0

**Fecha:** 2026-03-25
**Fase:** 0
**Nombre:** Contratos can√≥nicos y l√≠mites arquitect√≥nicos
**Estado:** accepted_for_execution_planning
**Documento fuente:** `2026-03-25_phase-0-rfc-canonical-contracts.md`

---

## 1. Decisi√≥n

La Fase 0 se considera **suficientemente cerrada** para habilitar la planificaci√≥n operativa de la Fase 1.

Esto significa:
- se acepta el vocabulario can√≥nico base,
- se acepta la separaci√≥n sem√°ntica entre contexto, estrategia y composici√≥n,
- se acepta la taxonom√≠a de capabilities,
- y se acepta la regla de no avanzar a implementaci√≥n compleja sin validaci√≥n por fase.

No significa todav√≠a:
- que todas las decisiones de bajo nivel est√©n implementadas,
- ni que el modelo f√≠sico de persistencia ya est√© definido.

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

- separaci√≥n negocio vs t√©cnica
- una sola estrategia de runtime activa por cuenta
- no fallback silencioso entre runtimes
- clasificaci√≥n `query | command`
- templates como command capability de plataforma
- RAG como query capability de plataforma
- side effects finales fuera del runtime
- separaci√≥n Kernel vs trazas t√©cnicas

---

## 3. Checklist de aceptaci√≥n

- [x] `PolicyContext` definido como contexto de negocio puro
- [x] `RuntimeSelection` definido como estrategia √∫nica por cuenta
- [x] `RuntimeComposition` definido como capa t√©cnica separada
- [x] ownership cross-runtime fijado en plataforma
- [x] taxonom√≠a `query | command` fijada
- [x] regla de no side effects finales en runtime fijada
- [x] templates clasificados como command capability
- [x] RAG clasificado como query capability
- [x] no fallback autom√°tico entre runtimes fijado
- [x] `inactive` fijado como estado leg√≠timo
- [x] separaci√≥n Kernel vs trazas t√©cnicas fijada
- [x] criterio de habilitaci√≥n de Fase 1 definido

---

## 4. Riesgos residuales aceptados

Se acepta continuar con los siguientes riesgos controlados:

- **`R1`**
  - el shape exacto persistido de `RuntimeSelection` a√∫n no est√° decidido

- **`R2`**
  - el contrato tipado final de `ExecutionAction` puede requerir refinamiento

- **`R3`**
  - el dise√±o f√≠sico del trace store no est√° decidido todav√≠a

- **`R4`**
  - los nombres finales de servicios pueden variar, mientras respeten la sem√°ntica aceptada

Estos riesgos **no bloquean** la Fase 1, porque Fase 1 trabaja sobre separaci√≥n de responsabilidades, no sobre cierre final de infraestructura f√≠sica.

---

## 5. Gate habilitado

### Se habilita

- planificaci√≥n detallada de la Fase 1
- dise√±o de pruebas de separaci√≥n de resolvers
- identificaci√≥n de archivos y contratos a intervenir

### No se habilita a√∫n

- migraci√≥n de templates
- migraci√≥n de RAG
- cambios fuertes en runtimes
- retiro de legacy

---

## 6. Criterio de control

La Fase 1 deber√° validar emp√≠ricamente que ya no existan fuentes duplicadas de verdad para:
- negocio autorizado
- estrategia de runtime
- composici√≥n t√©cnica

Si esa condici√≥n no se demuestra, no se pasa a Fase 2.

---

## 7. Estado final

- **Fase 0:** aceptada para planificaci√≥n de ejecuci√≥n
- **Pr√≥ximo paso autorizado:** Fase 1

---

## ?? Gobernanza de DocumentaciÛn Exhaustiva (Canon ß7.0)

Seg˙n el est·ndar establecido en **00-STANDARD.md**, es **obligatorio** mantener la documentaciÛn tÈcnica sincronizada con la implementaciÛn real exclusivamente en `docs/reconstruction-phase-1/exhaustive-mapping/`. 

- **SoberanÌa de CÛdigo:** Ning˙n cambio en el Kernel o Runtimes se considera "Terminado" (Done) sin su correspondiente actualizaciÛn en el Landscape del Backend o UI bajo los esquemas de Tiers definidos.
- **ProhibiciÛn de Basura:** Todo documento fuera de la carpeta oficial (incluyendo este archivo temporal) se considera transitorio y debe ser purgado o consolidado una vez validada la fase.
- **ActualizaciÛn Continua:** La documentaciÛn es un componente vivo del sistema y el monitor de calidad (`DocumentationQualityPanel`) es el ˙nico juez de la cobertura real.

---
## ?? Gobernanza de DocumentaciÛn Exhaustiva (Canon ß7.0)

Seg˙n el est·ndar establecido en **00-STANDARD.md**, es **obligatorio** mantener la documentaciÛn tÈcnica sincronizada con la implementaciÛn real exclusivamente en docs/reconstruction-phase-1/exhaustive-mapping/.

- **SoberanÌa de CÛdigo:** Ning˙n cambio en el Kernel o Runtimes se considera "Terminado" (Done) sin su correspondiente actualizaciÛn en el Landscape del Backend o UI bajo los esquemas de Tiers definidos.
- **ProhibiciÛn de Basura:** Todo documento fuera de la carpeta oficial (incluyendo este archivo temporal) se considera transitorio y debe ser purgado o consolidado una vez validada la fase.
- **ActualizaciÛn Continua:** La documentaciÛn es un componente vivo del sistema y el monitor de calidad (DocumentationQualityPanel) es el ˙nico juez de la cobertura real.
---
