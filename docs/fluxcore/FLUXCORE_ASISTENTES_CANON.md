# ASISTENTES — Especificación de los Runtimes Cognitivos

**Documento subordinado a:** `FLUXCORE_CANON.md` (v7.0)

Este documento especifica los dos runtimes cognitivos de FluxCore:
* **Asistentes Local** (`@fluxcore/asistentes`) — ejecución interna.
* **Asistentes OpenAI** (`@fluxcore/asistentes-openai`) — ejecución remota vía OpenAI Assistants API.

Ambos son runtimes paralelos e independientes. No son sub-modos de un mismo runtime.

---

## 1. Misión Compartida

Ambos runtimes existen para resolver interacciones conversacionales donde el usuario necesita información, orientación o acciones que no requieren la formalidad transaccional de un Work.

Cuando un usuario dice "¿Cuáles son los horarios de atención?", eso no es una transacción.
Es una **consulta** que se resuelve con cognición, contexto y herramientas.

---

## 2. El Contrato (Compartido)

Ambos runtimes cumplen el mismo contrato definido por el Canon Maestro (v7.0, sección 4):

**Entrada:** Un mensaje + PolicyContext + contexto conversacional.
**Salida:** Un resultado (respuesta directa, sugerencia para aprobación humana, o señal de no-acción justificada).

Ninguno delega al runtime Fluxi/WES.
Si detectan algo que parece transaccional pero no tienen la capacidad de resolverlo, responden con lo que saben.

---

## 3. Runtime: Asistentes Local (`@fluxcore/asistentes`)

### 3.1 Ubicación
`extensions/fluxcore-asistentes/src/`

### 3.2 Naturaleza
Pipeline completo de LLM ejecutado dentro de FluxCore. FluxCore controla el prompt, las llamadas al modelo, y el loop de herramientas.

### 3.3 Flujo de Ejecución

```
mensaje
  → Fase 1: Resolución del Plan de Ejecución
  → Fase 2: Construcción del Contexto
  → Fase 3: Construcción del Prompt (PromptBuilder)
  → Fase 4: Llamada al LLM (con fallback entre providers)
  → Fase 5: Tool Loop (máximo 2 rounds)
  → Fase 6: Resultado (AISuggestion)
```

### 3.4 Componentes

| Componente | Responsabilidad |
| :--- | :--- |
| `FluxCoreExtension` | Clase principal. Orquesta `onMessage` → `generateSuggestion`. |
| `PromptBuilder` | Construye el system prompt con PolicyContext + instrucciones del asistente. |
| `ToolRegistry` | Ejecuta herramientas decididas por el LLM. |
| `OpenAICompatibleClient` | Cliente HTTP para Groq y OpenAI chat completions. |

### 3.5 Construcción del Prompt

El `PromptBuilder` combina dos fuentes:

1. **PolicyContext** (inyectado por FluxCore):
   * Tono, formalidad, emojis.
   * Notas del contacto.
   * Modo de operación.

2. **Datos del Asistente** (específicos de este runtime):
   * Instrucciones de sistema (entities `instruction` vinculadas al asistente).
   * Directivas de herramientas (search_knowledge, templates).
   * Historial de mensajes formateado.

**Regla:** El PolicyContext no se "mezcla" con instrucciones del asistente.
Son secciones separadas del prompt. El PolicyContext tiene prioridad porque es la voz del negocio.

### 3.6 Fallback entre Providers

El runtime local soporta múltiples providers (Groq, OpenAI). Si el primero falla, intenta con el siguiente. El orden de prioridad lo define el `ExecutionPlan`.

---

## 4. Runtime: Asistentes OpenAI (`@fluxcore/asistentes-openai`)

### 4.1 Ubicación Actual vs Futura

**Actual:** `apps/api/src/services/ai.service.ts` → `executeOpenAIAssistantsPath()` (dentro del Host).
**Futura:** `extensions/fluxcore-asistentes-openai/src/` (extensión propia, paralela a las demás).

### 4.2 Naturaleza

El assistant fue creado en la plataforma de OpenAI. FluxCore actúa como puente: envía el historial, inyecta instrucciones y PolicyContext como override, y recibe la respuesta del run completado.

### 4.3 Flujo de Ejecución

```
mensaje
  → Fase 1: Resolución del Plan de Ejecución (externalId presente)
  → Fase 2: Construcción del historial como thread de OpenAI
  → Fase 3: Inyección de PolicyContext e instrucciones como override
  → Fase 4: runAssistantWithMessages() → thread + run
  → Fase 5: Espera de respuesta (polling del run)
  → Fase 6: Resultado (AISuggestion)
```

### 4.4 Componentes

| Componente | Responsabilidad |
| :--- | :--- |
| `executeOpenAIAssistantsPath()` | Orquesta la llamada al Assistants API. |
| `openai-sync.service.ts` | Ejecuta la llamada HTTP al Assistants API. |

### 4.5 Diferencias con Asistentes Local

| Aspecto | Local | OpenAI |
| :--- | :--- | :--- |
| **Quién ejecuta el LLM** | FluxCore (vía API de completions) | OpenAI (vía Assistants API) |
| **Quién gestiona tools** | `ToolRegistry` de FluxCore | OpenAI (file_search, code_interpreter) |
| **Quién gestiona vector stores** | FluxCore (RAG propio) | OpenAI (vector stores remotos) |
| **Control del prompt** | Total (PromptBuilder) | Parcial (override de instructions) |
| **Requiere créditos** | Solo si usa provider OpenAI | Siempre (OpenAI Assistants) |

---

## 5. Herramientas Disponibles

Las herramientas son mediadas por FluxCore (Canon v7.0, sección 6).

### 5.1 Para Asistentes Local

| Tool | Función |
| :--- | :--- |
| `search_knowledge` | Buscar en vector stores (RAG). |
| `list_available_templates` | Listar plantillas autorizadas. |
| `send_template` | Enviar una plantilla al canal. |

Inyectadas vía `RuntimeServices` (patrón de Dependency Injection).

### 5.2 Para Asistentes OpenAI

Las tools las gestiona OpenAI directamente (file_search, code_interpreter, function calling).
FluxCore no media esas herramientas.

---

## 6. Modos de Operación

Ambos runtimes operan bajo los mismos modos, definidos **fuera del runtime** (PolicyContext):

| Modo | Comportamiento |
| :--- | :--- |
| `auto` | Genera y envía automáticamente (con delay). |
| `suggest` | Genera como sugerencia. El humano aprueba/edita/rechaza. |
| `off` | No se ejecuta. |

---

## 7. Trazabilidad

Ambos runtimes generan trazas que registran:
* Contexto completo que recibieron (incluido PolicyContext).
* Prompt construido (system + messages).
* Intentos de llamada al LLM/API.
* Tools invocadas y resultados.
* Resultado final (contenido, tokens, provider).

Las trazas se persisten en memoria y opcionalmente en DB vía `aiTraceService`.

---

## 8. Invariantes

1. Ningún runtime cognitivo llama al runtime Fluxi/WES.
2. Ningún runtime ejecuta herramientas directamente — siempre vía capacidades mediadas por FluxCore.
3. El sub-tipo de runtime (local vs OpenAI) se determina por la configuración del asistente activo.
4. Si el plan de ejecución está bloqueado, no se invoca al LLM.
5. Las instrucciones de sistema son datos del asistente, no políticas. Las políticas las reciben del PolicyContext.
6. El modo (auto/suggest/off) es una política del PolicyContext, no una decisión del runtime.
7. Asistentes Local y Asistentes OpenAI nunca se invocan entre sí ni como fallback.

---

## 9. Qué NO son estos runtimes

* No son motores transaccionales. No gestionan Works.
* No son dueños de las herramientas. Las usan vía FluxCore.
* No son dueños de las instrucciones. Las reciben del asistente configurado.
* No son dueños de las políticas de atención. Las reciben del PolicyContext.
* No son capas que "complementan" a Fluxi. Son **alternativas completas**.
* No deciden si ejecutarse o no. Eso lo decide FluxCore (el orquestador).
