# Reglas Arquitectónicas para Agentes IA de Desarrollo

## Gestión de Vector Stores en FluxCore

### Documento normativo

Este documento define **reglas obligatorias e invariantes** que **todo agente IA de desarrollo** debe respetar al trabajar sobre FluxCore.
Su incumplimiento introduce **inconsistencias, estados fantasma y deuda estructural grave**.

---

## 1. Separación de mundos (principio fundamental)

FluxCore opera **dos mundos distintos y no equivalentes**:

* **vs.openai**
  Vector Store gestionado por OpenAI.
  Es un **servicio externo con estado propio**.

* **vs.fluxcore**
  Vector Store local de FluxCore.
  Es un **sistema experimental, controlado y autónomo**.

👉 **Estos mundos NO deben mezclarse, sincronizarse automáticamente ni inferirse uno del otro.**

---

## 2. Fuente de verdad

### Regla 2.1 — vs.openai

* **vs.openai es la única fuente de verdad** para:

  * existencia de vector stores remotos
  * existencia de archivos
  * asociaciones archivo ↔ vector store
  * estado real (status, file_counts, expiraciones)

FluxCore **no decide**, **no infiere** y **no corrige** el estado de vs.openai.

---

### Regla 2.2 — vs.fluxcore

* **vs.fluxcore es completamente independiente**
* No replica ni refleja automáticamente vs.openai
* Puede tener:

  * chunking propio
  * embeddings propios
  * reglas propias
  * modelos propios

👉 **No existe obligación de paridad funcional entre ambos sistemas.**

---

## 3. Persistencia local en FluxCore

### Regla 3.1 — Naturaleza de la base de datos local

La base de datos de FluxCore **NO es una fuente de verdad** para vs.openai.

Es únicamente un:

> **registro referencial, auditable y derivado**

---

### Regla 3.2 — Existencia de archivos

Un archivo asociado a vs.openai:

* **solo existe** si:

  * tiene openai_file_id 
  * OpenAI lo reconoce como existente

Si OpenAI no lo reconoce:

* FluxCore **debe considerarlo inexistente**
* aunque exista una fila local

---

### Regla 3.3 — Estados locales

FluxCore **no puede inventar estados**.

Estados locales permitidos:

* attached 
* processing 
* deleting 
* error 

Todos deben:

* derivar de OpenAI
* o representar una transición en curso

Estados prohibidos:

* assumed 
* optimistic 
* local_only 
* cualquier estado que no pueda validarse contra OpenAI

---

## 4. Mutaciones (crear, adjuntar, borrar)

### Regla 4.1 — Mutaciones en vs.openai

Toda mutación sobre vs.openai:

* creación de vector store
* adjuntar archivos
* eliminar archivos
* eliminar vector stores

👉 **DEBE ejecutarse primero en OpenAI**

FluxCore:

* espera confirmación
* luego refleja el resultado

---

### Regla 4.2 — Prohibiciones explícitas

FluxCore **NUNCA** debe:

* borrar solo en la base local
* marcar como eliminado sin confirmación de OpenAI
* crear asociaciones locales sin openai_file_id 
* "limpiar" estados por su cuenta

---

## 5. Sincronización y consistencia

### Regla 5.1 — Resolución de conflictos

Ante cualquier discrepancia entre:

* estado local
* estado de vs.openai

👉 **vs.openai gana siempre**

FluxCore:

* se corrige
* actualiza su espejo
* no intenta reconciliación bidireccional

---

### Regla 5.2 — Conteos y estado

* file_counts 
* status 
* progreso de batches

👉 **Deben leerse desde OpenAI**, no inferirse desde filas locales.

---

## 6. Búsqueda semántica

### Regla 6.1 — Búsqueda en vs.openai

La búsqueda directa (vectorStores.search) en vs.openai:

* **NO reemplaza** al Assistant de OpenAI
* **NO duplica lógica**
* **NO altera estado**

Su propósito es:

* QA
* debugging
* testing de embeddings
* habilitar modelos no-OpenAI sobre vs.openai

---

### Regla 6.2 — Independencia de vs.fluxcore

vs.fluxcore puede:

* tener su propio motor de búsqueda
* usar otros modelos
* aplicar chunking avanzado
* operar offline

👉 **No depende funcionalmente de vs.openai.**

---

## 7. UI y experiencia de usuario

### Regla 7.1 — UI local

La UI de FluxCore:

* **DEBE respetar el tema y estilo visual local**
* **NO debe asumir comportamientos implícitos de OpenAI**

La UI:

* expone capacidades
* muestra estado reflejado
* pero no oculta la naturaleza externa de vs.openai

---

### Regla 7.2 — Transparencia

La UI debe dejar claro:

* qué pertenece a vs.openai
* qué pertenece a vs.fluxcore
* qué operaciones son remotas
* qué operaciones son locales

Evitar:

* ambigüedad
* "magia"
* acciones silenciosas

---

## 8. Principio final (regla de oro)


vs.openai:

* motor externo
* fuente de verdad

vs.fluxcore:

* laboratorio controlado
* autonomía total

---

## 9. Uso obligatorio

Todo agente IA que:

* diseñe features
* modifique flujos
* escriba servicios
* diseñe UI
* proponga refactors

👉 **DEBE validar sus decisiones contra este documento.**

Si una decisión lo contradice:

* la decisión es inválida
* aunque "funcione"
