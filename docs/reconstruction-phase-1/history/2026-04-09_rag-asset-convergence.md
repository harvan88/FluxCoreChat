# RAG & Asset Convergence: Análisis Crítico y Pathway Arquitectónico

Este documento detalla una evaluación crítica profunda del flujo actual de RAG (Frontend + Backend) en FluxCore, identificando fricciones lógicas en la experiencia de usuario y proponiendo una arquitectura unificadora basada en el paradigma de **Assets como Entidad Central y RAG como Enriquecimiento**.

---

## 1. Análisis Crítico de Frontend (UX/UI y Lógica de Usuario)

### El Problema Actual: Inversión Cronológica
Actualmente, la UI de los Vector Stores permite "soltar" o subir un archivo en la parte superior, mientras que la configuración (Estrategia de Chunking, Modelo de Embedding, Recuperación) está en la parte inferior.
*   **Fricción:** Un usuario sube un PDF y este comienza a procesarse instantáneamente usando la configuración que quedó en la pantalla, que a menudo son "defaults" que el usuario aún no revisó. Cuando el usuario hace scroll hacia abajo y decide cambiar el modelo a "Local", **el PDF ya se indexó con el modelo anterior**.
*   **Decisión Crítica:** Esto asume que la configuración es secundaria, cuando en la vida real de RAG, la configuración dictamina la matemática fundacional de la base de datos.
*   **Estado:** **RESUELTO (Fase 2 completa).** El UI ha sido invertido.

---

## 2. Abstracción Estructural: Actors vs. Accounts

Has dado con el núcleo filosófico del sistema multinivel de FluxCore: **Los Actores hablan, pero las Cuentas pagan (y configuran).**

*   **Riesgo actual:** Si la ingesta de RAG o los permisos dependen íntimamente de qué `Actor` subió el archivo, corremos el riesgo de orfanar datos si el Actor muere o cambia de contexto.
*   **Solución Arquitectónica:** 
    *   **Vector Stores:** Pertenecen estrictamente al `Workspace` o `Account`.
    *   **Assets:** Pertenecen al `Account`.
    *   **Runtimes/Actores:** Cuando un Actor inyecta un documento en el chat, el runtime lo sube a la cuenta (`Account`). Luego, si el runtime necesita "recordarlo", se crea un Vector Store temporal (o se indexa en un Store del Chat) que es procesado a cuenta del Workspace/Account.

---

## 3. El Paradigma Definitivo: "RAG como Enriquecimiento de Assets"

En lugar de que el RAG corra paralelo al sistema de archivos, el RAG debe subordinarse al sistema central de *Assets*.

### El Flujo de Audio Actual (Ejemplo base)
1. Usuario envía audio → **Asset** en la DB.
2. Tarea de Enriquecimiento → Whisper Transcribe.
3. El **Asset** gana un metadato adherido (transcripción).

### El Flujo RAG Propuesto (Path to Production)
1. Usuario envía PDF al chat/Vector Store → **Asset central** en la DB (Permite deduplicación instantánea).
2. Tarea de Enriquecimiento (RAG Pipeline) → Extrae texto y envía a Transformers.js.
3. El **Asset** gana Enriquecimientos Vectoriales: Sus "Chunks" quedan atados a través de un `AssetEnrichment`.

---

## 4. Anticipación de Riesgos y "Camino No Bloqueante"

*   **Fase 1 (Soberanía Matemática):** Completado. Dimensiones dinámicas y soporte Local in-memory.
*   **Fase 2 (UI Swap):** Completado. Configuración Top-down implementada.
*   **Fase 3 (Convergencia Backend - Pospuesta temporalmente):** Modificar la base de datos para enlazar Chunks con Assets. **Riesgo evaluado:** Bloqueante para la integración actual de Runtimes. Se decide posponer hasta que la ejecución de Runtimes sea estable.
*   **Fase 4 (Deprecación):** Eliminar tablas redundantes (futuro).
