# Reconstrucción de documentación — Fase 1

## Propósito

Esta carpeta contiene la reconstrucción activa de la arquitectura del sistema basada en el código actual y el esquema de base de datos del repositorio. Comenzó con una fase estructural y ahora incluye también documentación por componentes y por flujos transversales.

Desde este punto, esta carpeta debe considerarse la **fuente activa de verdad** para la documentación arquitectónica del sistema.

## Fuente de verdad usada en esta fase

La documentación de esta carpeta fue reconstruida a partir de:
 - el código actual en `apps/api`, `apps/web` y `packages/db`
 - el esquema actual en `packages/db/src/schema`
 - las relaciones observables entre rutas, servicios, workers, projectores y tablas

La documentación anterior en `docs/` debe considerarse material histórico u orientativo, no una fuente canónica.

## Alcance de esta fase

La carpeta contiene actualmente dos niveles de documentación:

### Capa 0 — definiciones y gobernanza documental
- `canonical-definitions.md`
- `documentation-governance.md`
- `legacy-document-inventory.md`

### Nivel 1 — visión estructural
- `chatcore-overview.md`
- `kernel-overview.md`
- `fluxcore-overview.md`

### Nivel 2 — componentes reales y flujos
- `chatcore-components.md`
- `chatcore-assets.md`
- `kernel-components.md`
- `fluxcore-components.md`
- `system-flows.md`

Los documentos de visión estructural responden a cuatro preguntas:
- cuál es el rol del dominio dentro del sistema
- cuáles son sus responsabilidades principales
- qué componentes reales lo implementan en el código
- cómo interactúa con los otros dominios

Los documentos de componentes y flujos bajan un nivel adicional:
- identifican piezas concretas del código
- describen el flujo operativo entre esas piezas
- separan responsabilidades entre ChatCore, Kernel y FluxCore
- dejan trazado el recorrido end-to-end de los casos principales

La capa de definiciones y gobernanza cumple dos funciones transversales:
- recuperar definiciones canónicas históricas que sí resisten validación contra el código actual
- fijar que esta carpeta es la única base activa para seguir escribiendo arquitectura

El inventario de legacy agrega una tercera función operativa:
- clasificar qué markdowns históricos deben absorberse, relegarse a histórico o moverse físicamente fuera del camino activo

## Límites de esta fase

Esta reconstrucción todavía no documenta en profundidad:
- el detalle interno de cada servicio o componente
- todos los endpoints y contratos de payload
- todas las tablas secundarias del dominio
- todos los caminos legacy o compatibilidad histórica

## Criterio de organización

La separación usada aquí es funcional:
- **ChatCore**: mundo conversacional, persistencia de mensajes, conversaciones, participantes, transporte HTTP/WS y entrega al cliente
- **Kernel**: certificación soberana de señales, journal inmutable y activación de projectores
- **FluxCore**: interpretación cognitiva, policy context, runtimes, decisión y ejecución mediada de acciones

## Orden sugerido de lectura

1. `canonical-definitions.md`
2. `documentation-governance.md`
3. `legacy-document-inventory.md`
4. `chatcore-overview.md`
5. `kernel-overview.md`
6. `fluxcore-overview.md`
7. `chatcore-components.md`
8. `chatcore-assets.md`
9. `kernel-components.md`
10. `fluxcore-components.md`
11. `system-flows.md`

## Próximo paso sugerido

La siguiente etapa razonable sería profundizar cada documento de componentes en subdocumentos más finos, por ejemplo:
1. ChatCore: rutas, `message-core`, `conversation.service`, `conversation-participant.service`, `ws-handler`
2. Kernel: `kernel.ts`, reality adapters, outbox, `base.projector`, `projector-runner`, projectores concretos
3. FluxCore: `flux-policy-context`, `chat-projector`, `cognition-worker`, `cognitive-dispatcher`, `action-executor`, `runtime-gateway`, asistentes
