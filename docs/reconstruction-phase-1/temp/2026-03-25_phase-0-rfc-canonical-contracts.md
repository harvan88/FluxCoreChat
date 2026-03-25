# RFC — Fase 0: Contratos canónicos y límites arquitectónicos de FluxCore

**Fecha:** 2026-03-25
**Estado:** draft para revisión y aprobación
**Fase del roadmap:** 0
**Propósito:** congelar los contratos canónicos, límites de ownership y reglas de validación que habilitan la implementación segura de las fases posteriores.

---

## 1. Estado del RFC

Este RFC define las decisiones que deben considerarse **vinculantes** antes de iniciar implementación estructural.

La aprobación de este documento habilita:
- `Fase 1 — Separación de resolvers centrales`
- `Fase 2 — Observabilidad mínima obligatoria`
- `Fase 3+ — migraciones funcionales sobre una base terminológica consistente`

La no aprobación de este documento bloquea:
- cambios estructurales en runtime ownership
- migración de templates
- migración de RAG
- purificación de Fluxi

---

## 2. Objetivo

Eliminar ambigüedad conceptual en la arquitectura cognitiva de FluxCore.

En concreto, esta fase debe dejar resuelto:
- qué es contexto de negocio y qué no lo es
- qué es estrategia de runtime y qué no lo es
- qué es composición técnica de ejecución y qué no lo es
- qué responsabilidades son plataforma-owned
- qué responsabilidades son runtime-owned
- qué significa una capability y cómo se clasifica
- qué reglas impiden avanzar sin validación empírica

---

## 3. Alcance

## Incluye

- definición canónica de objetos centrales
- definición canónica de límites entre capas
- taxonomía oficial de capabilities
- reglas de ownership
- reglas de ejecución de efectos
- reglas de fallos y no-fallback
- regla de separación Kernel vs trazas técnicas
- criterios formales de aceptación de la fase

## No incluye

- implementación de código
- migración de tablas
- refactor de runtimes
- adopción técnica de capabilities en local/OpenAI/Fluxi
- cambios de UI
- instrumentación real de observabilidad

---

## 4. Contexto del problema

La arquitectura actual ya tiene una base correcta, pero mantiene varias mezclas conceptuales:
- `PolicyContext` convive con elementos de composición técnica
- selección de runtime y composición del runtime aparecen repartidas en más de un servicio
- tools/capabilities existen en más de una forma operativa
- runtimes, especialmente `asistentes-local`, absorben responsabilidades de plataforma
- la documentación y el código real no están totalmente alineados en su vocabulario

El riesgo principal es seguir implementando sobre una base que **parece clara en teoría pero no está cerrada operativamente**.

Este RFC existe para evitar eso.

---

## 5. Decisiones vinculantes

## D0.1 — `PolicyContext` es exclusivamente contexto de negocio autorizado

### Decisión

`PolicyContext` representa el perfil de negocio autorizado para una ejecución cognitiva.

### Incluye

- identidad contextual autorizada
- relación con cliente/contacto
- datos biográficos relevantes
- contexto conversacional de negocio
- recursos de negocio autorizados
- restricciones de negocio

### Excluye

- `runtimeId`
- selección de estrategia
- `provider`
- `model`
- configuración técnica de LLM
- wiring técnico de tools
- detalles de ejecución del assistant

### Consecuencia

Ningún servicio que resuelva `PolicyContext` puede devolver simultáneamente composición técnica del runtime como parte del mismo contrato semántico.

---

## D0.2 — `RuntimeSelection` es la decisión estratégica única por cuenta

### Decisión

Cada cuenta tiene una única estrategia activa de runtime.

### Estrategias válidas

- `fluxi`
- `assistants`

### Estado operativo

- `active`
- `inactive`

### Regla

- si la estrategia es `assistants`, luego se resuelve el assistant activo
- si el estado es `inactive`, el sistema no ejecuta automatización cognitiva automática

### Consecuencia

No puede haber competencia entre dos estrategias activas simultáneas para la misma cuenta.

---

## D0.3 — `RuntimeComposition` es una responsabilidad técnica separada

### Decisión

La composición técnica final del runtime debe resolverse en un objeto separado de `PolicyContext` y separado de `RuntimeSelection`.

### Incluye

- `runtimeId`
- `assistantId` cuando aplique
- `provider`
- `model`
- settings técnicos
- configuración de prompt/runtime
- vector stores asociados
- capability bindings técnicos

### Consecuencia

La arquitectura queda dividida en tres dimensiones diferentes:
- negocio autorizado
- estrategia seleccionada
- composición técnica efectiva

---

## D0.4 — Toda capacidad reusable por más de un runtime pertenece a plataforma

### Decisión

Si una capacidad puede ser usada por más de un runtime, su ownership correcto es plataforma.

### Aplica a

- templates
- RAG / knowledge search
- consultas de contexto reusable
- conectores externos
- futuras herramientas cross-runtime

### No aplica a

- estrategia interna de razonamiento del runtime
- lógica específica del proveedor
- protocolo interno del runtime
- semántica de decisión final del runtime

### Consecuencia

Los runtimes no deben ser dueños de implementaciones cross-runtime compartibles.

---

## D0.5 — Las capabilities se clasifican oficialmente en `query` y `command`

### Decisión

Toda capability debe pertenecer a una de estas dos categorías:

- `query`
- `command`

### `query`

Características:
- consulta o lee
- no produce side effects externos
- puede ejecutarse durante inferencia
- retorna datos al runtime

### `command`

Características:
- expresa intención de producir un efecto
- no debe ejecutar directamente el efecto dentro del runtime
- debe convertirse en `ExecutionAction[]` o en una propuesta equivalente mediada por plataforma

### Consecuencia

La clasificación de capabilities deja de depender de si “son de ChatCore” o “son de FluxCore”.

---

## D0.6 — Ningún runtime ejecuta side effects externos directamente

### Decisión

Los runtimes pueden decidir qué hacer, pero no ejecutar directamente los efectos externos o mutaciones observables del sistema.

### Flujo obligatorio

- runtime decide
- runtime devuelve intención declarativa
- plataforma media ejecución
- el sistema certifica/registra el hecho por la vía canónica correspondiente

### Consecuencia

Se prohíbe que una capability de comando haga side effects finales dentro de la lógica propia del runtime.

---

## D0.7 — Templates son una capability de comando de plataforma

### Decisión

Templates se consideran una capability de comando de plataforma, con dominio ChatCore y mediación cognitiva desde FluxCore.

### Capabilities mínimas asociadas

- `list_authorized_templates`
- `propose_send_template`

### Regla

- el runtime puede consultar o proponer
- el runtime no envía templates por sí mismo
- la validación del template ocurre en plataforma
- el efecto final se ejecuta mediante `ActionExecutor` u otra mediación canónica equivalente

### Consecuencia

Templates dejan de ser una tool definida ad hoc por cada runtime.

---

## D0.8 — RAG es una query capability de plataforma

### Decisión

RAG/knowledge retrieval es una query capability reusable de plataforma.

### Capability mínima asociada

- `search_knowledge`

### Regla

- el runtime decide si consultar
- la plataforma decide cómo consultar
- la autorización de stores/scopes vive en plataforma
- no debe existir una implementación privada como fuente principal dentro de un runtime concreto

### Consecuencia

La semántica de `search_knowledge` debe ser uniforme para local, OpenAI y futuros runtimes.

---

## D0.9 — No existe fallback automático entre runtimes

### Decisión

Cuando un runtime falla, el sistema no deriva silenciosamente a otro runtime.

### Regla

- el fallo debe quedar trazable
- el estado debe ser visible para operación o usuario según corresponda
- el sistema no debe ocultar el error degradando a otra estrategia sin consentimiento explícito de diseño

### Consecuencia

Se prioriza transparencia operacional sobre continuidad opaca.

---

## D0.10 — `inactive` es un estado explícito del sistema

### Decisión

Si una cuenta no tiene una estrategia activa operativa, el sistema entra en estado `inactive`.

### Regla

- onboarding debe crear una configuración funcional por defecto
- si el usuario desactiva toda automatización aplicable, el sistema queda explícitamente `inactive`
- `inactive` no es error, es estado operacional legítimo

### Consecuencia

Se elimina el comportamiento ambiguo de “no respondió pero tampoco sabemos por qué”.

---

## D0.11 — Kernel y trazas técnicas no son lo mismo

### Decisión

El Kernel se usa para hechos certificados relevantes del sistema. Las trazas internas del pipeline técnico se registran en una capa distinta de observabilidad.

### Kernel

Apto para:
- hechos observados/certificados
- resultados materiales del sistema
- eventos que forman parte de la verdad operacional del dominio

### Trace/Telemetry

Apto para:
- spans técnicos
- tiempos internos
- pasos del pipeline
- diagnósticos de ejecución

### Consecuencia

Se evita convertir el journal soberano en un depósito de debug interno.

---

## 6. Contratos canónicos mínimos

Los siguientes contratos no fijan implementación concreta todavía, pero sí fijan la semántica mínima que las fases posteriores deben respetar.

## 6.1 `PolicyContext`

```ts
interface PolicyContext {
  accountId: string;
  conversationId: string;
  channel?: string;
  subject: {
    contactId?: string;
    relationshipId?: string;
    visitorToken?: string;
  };
  authorizedBusinessProfile?: unknown;
  relationalContext?: unknown;
  businessConstraints?: unknown;
  authorizedResources?: unknown;
}
```

### Restricción semántica

No puede incluir campos de selección o composición técnica de runtime.

---

## 6.2 `RuntimeSelection`

```ts
type RuntimeStrategy = 'fluxi' | 'assistants';
type RuntimeSelectionState = 'active' | 'inactive';

interface RuntimeSelection {
  accountId: string;
  strategy: RuntimeStrategy;
  state: RuntimeSelectionState;
  reason?: string;
  updatedAt: string | Date;
}
```

### Restricción semántica

Debe existir una única selección efectiva por cuenta.

---

## 6.3 `RuntimeComposition`

```ts
interface RuntimeComposition {
  runtimeId: string;
  assistantId?: string;
  provider?: string;
  model?: string;
  runtimeSettings?: Record<string, unknown>;
  vectorStoreIds?: string[];
  capabilityBindings?: string[];
}
```

### Restricción semántica

No reemplaza `PolicyContext` ni `RuntimeSelection`; solo resuelve la composición técnica efectiva.

---

## 6.4 `CapabilityDefinition`

```ts
type CapabilityKind = 'query' | 'command';
type CapabilityDomain = 'chatcore' | 'fluxcore' | 'external';

interface CapabilityDefinition {
  id: string;
  slug: string;
  version: string;
  domain: CapabilityDomain;
  kind: CapabilityKind;
  description: string;
  inputSchema: unknown;
  outputSchema?: unknown;
  usageHints?: string[];
}
```

### Restricción semántica

La definición canónica de una capability no puede depender de un runtime específico.

---

## 6.5 `CapabilityOffer`

```ts
interface CapabilityOffer {
  capabilityId: string;
  slug: string;
  kind: 'query' | 'command';
  available: boolean;
  reasonIfUnavailable?: string;
}
```

### Restricción semántica

La oferta debe resolverse desde plataforma según cuenta, autorización, estrategia, assistant y canal.

---

## 6.6 `ExecutionAction`

```ts
interface ExecutionAction {
  type: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
```

### Restricción semántica

Toda mutación observable o efecto externo iniciado por un runtime debe salir por esta frontera declarativa o una equivalente con la misma semántica de mediación.

---

## 7. Límites canónicos por capa

## 7.1 Plataforma

Puede y debe poseer:
- resolución de contexto autorizado
- selección estratégica por cuenta
- composición técnica de ejecución
- catálogo de capabilities
- autorización y oferta de capabilities
- mediación de efectos
- certificación/gateway hacia Kernel
- observabilidad transversal

No debe poseer:
- estrategia semántica específica de cada runtime
- prompting interno propio de un runtime concreto

---

## 7.2 Runtime

Puede y debe poseer:
- estrategia de interpretación del input
- forma propia de razonar
- forma de usar capabilities ofrecidas
- conversión de decisión en acciones declarativas

No debe poseer:
- implementación canonical de capabilities cross-runtime
- side effects finales fuera de la frontera declarativa
- acceso privilegiado a infraestructura que el resto de runtimes no comparte por contrato

---

## 7.3 Kernel

Puede y debe poseer:
- certificación de hechos
- journal soberano
- integridad del registro

No debe poseer:
- lógica de negocio
- orquestación del runtime
- trazas internas de debug técnico como función principal

---

## 8. Reglas de validación de la fase

La Fase 0 no requiere implementación, pero sí requiere consistencia técnica verificable.

## Validaciones obligatorias

- **`V0.1 — Consistencia terminológica`**
  - no existe más de una definición activa para `PolicyContext`, `RuntimeSelection` o `RuntimeComposition`

- **`V0.2 — Consistencia de ownership`**
  - ninguna decisión de este RFC asigna la misma responsabilidad a plataforma y runtime al mismo tiempo

- **`V0.3 — Consistencia de capabilities`**
  - templates y RAG quedan inequívocamente clasificados dentro del nuevo modelo

- **`V0.4 — Consistencia de fallos`**
  - queda explícita la prohibición de fallback silencioso

- **`V0.5 — Consistencia de observabilidad`**
  - queda explícita la separación Kernel vs trace/telemetry

---

## 9. Checklist de aceptación de Fase 0

- [ ] `PolicyContext` quedó definido como contexto de negocio puro
- [ ] `RuntimeSelection` quedó definido como estrategia única por cuenta
- [ ] `RuntimeComposition` quedó definido como composición técnica separada
- [ ] se fijó el ownership de capabilities cross-runtime en plataforma
- [ ] se fijó la taxonomía `query | command`
- [ ] se fijó que runtimes no ejecutan side effects finales
- [ ] templates quedaron definidos como command capability
- [ ] RAG quedó definido como query capability
- [ ] se fijó la prohibición de fallback automático entre runtimes
- [ ] se fijó el estado `inactive` como estado operacional válido
- [ ] se fijó la separación entre Kernel y trazas técnicas
- [ ] se definió el criterio de habilitación de la Fase 1

---

## 10. Criterio formal de aprobación

Este RFC se considera aprobado solo si:

- **`Aprobación conceptual`**
  - las definiciones no generan contradicción interna

- **`Aprobación arquitectónica`**
  - las fronteras por capa son utilizables para diseñar la Fase 1 sin reinterpretaciones

- **`Aprobación operativa`**
  - el equipo puede derivar tareas de implementación sin reabrir definiciones base

- **`Aprobación de roadmap`**
  - la Fase 1 puede comenzar sin dudas sobre qué resolver y qué no resolver

---

## 11. Condición de desbloqueo de Fase 1

La Fase 1 puede comenzar únicamente cuando este RFC esté marcado como:
- `reviewed`
- `accepted`

Y cuando la siguiente afirmación sea verdadera:

> No hay ambigüedad técnica relevante sobre la diferencia entre negocio autorizado, estrategia activa por cuenta y composición técnica de runtime.

---

## 12. Riesgos si esta fase no se cierra correctamente

- refactor parcial de servicios sin fuente única de verdad
- nueva duplicación entre `PolicyContext` y runtime config
- migración fallida de templates
- migración fallida de RAG
- persistencia de runtimes híbridos
- observabilidad confusa porque no se sabe qué entidad está fallando realmente

---

## 13. Decisiones explícitamente aplazadas

Este RFC no resuelve todavía:
- esquema de persistencia final de `RuntimeSelection`
- shape exacto de tablas o migraciones
- forma concreta de serializar `CapabilityDefinition`
- decisión entre `ExecutionAction` única o jerarquía tipada de acciones
- implementación de trace store

Estas decisiones se definen en fases posteriores, pero deben respetar las reglas de esta fase.

---

## 14. Resultado esperado de la Fase 0

Al cerrar esta fase, FluxCore debe tener un lenguaje arquitectónico congelado y operativo para que el resto del roadmap sea una secuencia de implementación validable, no una nueva ronda de redefiniciones conceptuales.

---

## 15. Estado final de esta entrega

- **`Documento`**: creado
- **`Estado`**: listo para revisión
- **`Siguiente paso recomendado`**: revisión y marcación explícita de aceptación/rechazo antes de iniciar Fase 1
