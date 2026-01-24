# Reporte de Auditoría Arquitectónica y Forense
**Fecha:** 23 de Enero, 2026
**Autor:** Antigravity (AI Agent)
**Contexto:** Diagnóstico profundo tras incidentes de consistencia de datos en Vector Stores.

---

## 1. Resumen Ejecutivo
El sistema, aunque funcional, ha sufrido una degradación arquitectónica ("Architectural Drift") respecto a la visión original (`TOTEM.md`). La implementación física de la IA (`FluxCore`) se ha fusionado con el núcleo de la plataforma, creando un monolito difícil de mantener y propenso a errores de regresión.

---

## 2. Hallazgos Forenses (El "Por qué" de los errores recientes)

### A. Incidente: Datos Fantasma y Falta de Sincronización
**Síntoma:** La UI mostraba metadatos de Vector Stores que no coincidían con la realidad (conteo de archivos vs lista vacía) y no reflejaba archivos agregados externamente en OpenAI.

**Causa Raíz Técnica:**
1.  **Modelo de Datos Incompleto:** El sistema de sincronización (`syncVectorStoreFiles`) carecía de la lógica `INSERT` para nuevos archivos detectados remotamente. Solo sabía actualizar o borrar.
2.  **Bloqueo por Error Silencioso:** Un error de tipado (`TypeError: value.toUTCString`) al intentar guardar timestamps UNIX de OpenAI en campos `Date` de PostgreSQL abortaba la transacción de actualización de metadatos del Vector Store padre.
3.  **Consecuencia:** La base de datos local quedaba en un estado "zombie" (metadatos desactualizados, archivos faltantes).

**Solución Aplicada (Hotfix):**
- Implementación de lógica `INSERT` en `fluxcore.service.ts`.
- Conversión explícita de timestamps (`timestamp * 1000`) en `openai-sync.service.ts`.

---

## 3. Análisis de Código y Deuda Técnica

### B. El Monolito: `fluxcore.service.ts`
**Ubicación:** `apps/api/src/services/fluxcore.service.ts`
**Tamaño:** ~50KB, ~1500 líneas.

**Problema:** Este archivo viola el Principio de Responsabilidad Única (SRP) al concentrar tres dominios distintos:
1.  **Gestión de Base de Datos (CRUD):** Creación y edición de entidades (`fluxcore_assistants`, `fluxcore_vector_stores`).
2.  **Lógica de Ejecución (Runtime):** Ensamblado complejo del contexto del asistente (`getAssistantComposition`, `generateManagedInstructionContent`).
3.  **Infraestructura Externa (Drivers):** Lógica de espejado y sincronización con OpenAI.

**Riesgo:** Modificar la lógica de almacenamiento puede romper accidentalmente la lógica de "pensamiento" del asistente.

### C. Acoplamiento del Núcleo: `MessageCore.ts`
**Ubicación:** `apps/api/src/core/message-core.ts`

**Problema:** El núcleo de mensajería **no es agnóstico a la IA**, violando el Principio #2 del `TOTEM.md`.
- **Evidencia:** Líneas que contienen lógica explícita para `Smart Delay`, `Auto Reply Queue` y llamadas directas a `extensionHost.generateAIResponse`.
- **Impacto:** El "Core" sabe que existe una IA y orquesta sus tiempos. Esto impide que la IA sea una extensión verdaderamente opcional o reemplazable.

### D. La "Extensión" Híbrida: `ExtensionHost`
**Ubicación:** `apps/api/src/services/extension-host.service.ts`

**Problema:** Aunque carga extensiones dinámicas, tiene privilegios especiales hardcodeados para el servicio de IA nativo (`aiService`).
- **Observación:** Funciona como un proxy directo para la IA de FluxCore en lugar de usar el sistema de eventos genérico para todas las extensiones.

---

## 4. Mapa de Dependencias Críticas (Para Refactorización)

Si se procede a refactorizar, estas son las líneas de corte identificadas:

1.  **Vector Store Domain:**
    - Depende de: `drizzle-orm`, `openai-sync.service`
    - Es dependido por: `fluxcore.routes`, `getAssistantComposition` (Runtime)
    - **Estrategia:** Extraer a `services/fluxcore/vector-store.service.ts`.

2.  **OpenAI Mirroring:**
    - Depende de: `openai` SDK.
    - Es dependido por: `fluxcore.routes` (para sync explícito), `vector-store.service`.
    - **Estrategia:** Aimentar a `services/openai-mirror/`.

3.  **Runtime AI (Cerebro):**
    - Depende de: Todos los repositorios (Assistants, Tools, VS).
    - Es dependido por: `fluxcore.routes` (`/chat` endpoints).
    - **Estrategia:** Extraer `getAssistantComposition` y lógica de prompts a `services/fluxcore/runtime.service.ts`.

---

## 5. Recomendación de Arquitectura Futura

Para alinear con `TOTEM.md`:

1.  **Event Bus:** `MessageCore` debe emitir `message.created` y olvidar.
2.  **Extension Isolation:** La lógica de "esperar 3 segundos y responder" debe vivir 100% dentro de la extensión `@fluxcore/fluxcore`, escuchando el evento.
3.  **Unified Driver Interface:** Los Vector Stores deben usar una interfaz `IVectorStoreDriver` que tenga implementaciones `LocalDriver` y `OpenAIDriver`, ocultando la complejidad de sincronización.

---
*Este reporte sirve como punto de partida seguro para cualquier desarrollador que deba continuar el trabajo si se interrumpe la sesión.*
