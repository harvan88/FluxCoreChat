# FluxCore — Plan de Refactorización (Canon v7.0)

**Objetivo:** Alinear el código con la arquitectura de tres runtimes paralelos, PolicyContext compartido, y separación ontológica ChatCore/FluxCore.

**Fecha:** 2026-02-13
**Estado:** Planificación

---

## Hito 1: Crear la Capa de PolicyContext

**Prioridad:** ⬤ Crítica (cimiento de todo lo demás)

### Problema
Las preferencias de atención (tono, emojis, formalidad) actualmente se construyen dentro del `PromptBuilder` de Asistentes, mezclándose con instrucciones del asistente. Fluxi y OpenAI Assistants no tienen acceso a estas políticas.

### Solución
Crear un servicio `PolicyContextService` que FluxCore ejecuta **antes** de invocar cualquier runtime.

### Tareas

1. **Definir la interfaz `PolicyContext`:**
   ```typescript
   interface PolicyContext {
     // Preferencias de atención
     tone: string;           // "formal", "casual", "amigable"
     formality: string;      // "usted", "tú", "vos"
     useEmojis: boolean;
     language: string;       // "es", "en"
     
     // Reglas de automatización
     automationMode: 'automatic' | 'supervised' | 'disabled';
     responseDelayMs: number;
     
     // Datos del contacto (leídos de ChatCore)
     contactNotes: string[];
     contactPreferences: string[];
     
     // Reglas por contacto (persistidas en config de FluxCore)
     contactRules: string[];
     
     // Perfil del negocio
     businessName: string;
     businessBio?: string;
   }
   ```

2. **Crear `PolicyContextService`:**
   * Ubicación: `extensions/fluxcore/src/services/policy-context.service.ts` (o a nivel de FluxCore orchestrator).
   * Lee de `extension_installations.config` (config de FluxCore).
   * Lee datos de ChatCore vía API expuesta (perfil, notas del contacto).
   * Retorna un `PolicyContext` inmutable para la ejecución.

3. **Agregar campos al `configSchema` de FluxCore:**
   * `tone`, `formality`, `useEmojis`, `language`.
   * Estos campos se renderizan en la UI vía Configuration Slots.
   * ChatCore los muestra pero no los interpreta.

4. **Inyectar `PolicyContext` en todos los runtimes:**
   * Fluxi: `onMessage(params)` → `params.policyContext`.
   * Asistentes Local: `generateSuggestion(event, context, ..., policyContext)`.
   * Asistentes OpenAI: `executeOpenAIAssistantsPath(plan, context, ..., policyContext)`.

### Criterio de Aceptación
- [ ] Los tres runtimes reciben el mismo `PolicyContext`.
- [ ] Ningún runtime busca directamente en la DB datos de políticas de atención.
- [ ] El PromptBuilder de Asistentes ya no resuelve tono/emojis por su cuenta.
- [ ] Los tests pasan con PolicyContext inyectado.

### Archivos afectados
* `apps/api/src/services/extension-host.service.ts` (inyecta PolicyContext antes de invocar runtimes)
* `apps/api/src/services/ai-orchestrator.service.ts` (pasa PolicyContext al scheduling)
* `extensions/fluxcore-asistentes/src/prompt-builder.ts` (recibe PolicyContext en vez de resolverlo)
* `extensions/fluxcore-fluxi/src/index.ts` (recibe PolicyContext)
* NUEVO: `PolicyContext` type + service

---

## Hito 2: Extraer Runtime OpenAI Assistants del Host

**Prioridad:** ⬤ Alta (es prerequisito para tener 3 runtimes limpios)

### Problema
El runtime de OpenAI Assistants vive dentro de `ai.service.ts` (1207 líneas, en el Host), no en `extensions/`. Esto viola el canon: todos los runtimes deben vivir al mismo nivel.

### Solución
Crear `extensions/fluxcore-asistentes-openai/` como extensión propia.

### Tareas

1. **Crear la estructura de la extensión:**
   ```
   extensions/fluxcore-asistentes-openai/
   ├── src/
   │   ├── index.ts          (entry point con onMessage)
   │   └── openai-runner.ts  (lógica de thread/run)
   ├── manifest.json
   └── package.json
   ```

2. **Extraer `executeOpenAIAssistantsPath()` de `ai.service.ts`:**
   * Mover la lógica a `openai-runner.ts`.
   * Hacer que reciba `PolicyContext` + `AssistantComposition` como inputs.
   * Eliminar las 140 líneas de `ai.service.ts` correspondientes.

3. **Mover `openai-sync.service.ts` a la extensión** (o dejarlo como shared utility si otros runtimes lo necesitarán).

4. **Actualizar el `ExtensionHost` y `AIOrchestrator`:**
   * El orquestador ya no llama directamente a `ai.service.executeOpenAIAssistantsPath()`.
   * En su lugar, el ExtensionHost carga la extensión `@fluxcore/asistentes-openai` y le pasa el mensaje.

5. **Actualizar `resolveExecutionPlan`:**
   * El campo `runtime: 'openai' | 'local'` se convierte en `runtimeId: '@fluxcore/asistentes' | '@fluxcore/asistentes-openai' | '@fluxcore/fluxi'`.

### Criterio de Aceptación
- [ ] `ai.service.ts` no contiene código de OpenAI Assistants.
- [ ] La extensión tiene su propio manifest y se carga vía ExtensionHost.
- [ ] Los tests de OpenAI Assistants pasan como antes.
- [ ] La UI sigue funcionando sin cambios visibles para el usuario.

### Archivos afectados
* `apps/api/src/services/ai.service.ts` (se le quitan ~140 líneas)
* `apps/api/src/services/ai-execution-plan.service.ts` (runtimeId en vez de runtime)
* `apps/api/src/services/ai-orchestrator.service.ts` (deja de llamar a ai.service para OpenAI)
* `apps/api/src/services/extension-host.service.ts` (registra la nueva extensión)
* NUEVO: `extensions/fluxcore-asistentes-openai/`
* MOVER: `apps/api/src/services/openai-sync.service.ts` → extensión

---

## Hito 3: Descomponer el Monolito de Asistentes

**Prioridad:** ⬤ Media-Alta (mejora mantenibilidad, no cambia funcionalidad)

### Problema
`extensions/fluxcore-asistentes/src/index.ts` tiene 1548 líneas y 15+ responsabilidades.

### Solución
Partir en módulos con responsabilidad única.

### Tareas

| Módulo destino | Contenido a extraer | Líneas aprox. |
| :--- | :--- | :--- |
| `types.ts` | Interfaces (AISuggestion, MessageEvent, ContextData, etc.) | 1-210 |
| `runtime-services.ts` | RuntimeServices interface + DI setup | 206-246 |
| `message-handler.ts` | Hook `onMessage` (routing, debounce) | 441-515 |
| `generator.ts` | `generateSuggestion` (core del runtime) | 517-968 |
| `tracing.ts` | Lógica de trazas y telemetría | 970-1129 |
| `suggestion-manager.ts` | approve/reject/edit/getPending | 1131-1200 |
| `llm-client-manager.ts` | Provider fallback, client caching | 1200-1548 |
| `index.ts` | Re-export + clase `FluxCoreExtension` minimal | ~100 líneas |

### Criterio de Aceptación
- [ ] `index.ts` tiene < 200 líneas.
- [ ] Cada módulo se puede testear independientemente.
- [ ] No hay cambios de comportamiento (refactor puro).
- [ ] La extensión se carga y funciona como antes.

---

## Hito 4: Eliminar Residuos WES-170 de Asistentes

**Prioridad:** ⬤ Media (limpieza canónica)

### Problema
El runtime de Asistentes tiene código que detecta `propose_work` como tool call del LLM y lo convierte en `proposedWork` en la sugerencia. Esto es un residuo de antes de que Fluxi fuera un runtime propio. Viola el canon: Asistentes no debe proponer Works.

### Tareas

1. **Eliminar `propose_work` tool de Asistentes:**
   * Quitar de `ToolRegistry` (si existiera).
   * Quitar la detección en `generateSuggestion` (líneas 912-924 de index.ts).

2. **Eliminar `proposedWork` de `AISuggestion`:**
   * Quitar el campo del tipo.
   * Quitar la lógica en `ai-orchestrator.service.ts` que detecta `suggestion.proposedWork` (líneas 342-370).

3. **Garantizar que el campo `wes` del PromptBuilder se elimine de Asistentes:**
   * Las `WorkDefinitions` no deben inyectarse en el prompt de Asistentes.
   * Ese contexto solo se inyecta en Fluxi.

### Criterio de Aceptación
- [ ] `AISuggestion` no tiene campo `proposedWork`.
- [ ] El PromptBuilder no inyecta secciones WES.
- [ ] Los tests pasan sin la tool `propose_work`.
- [ ] Fluxi sigue funcionando independientemente.

### Archivos afectados
* `extensions/fluxcore-asistentes/src/index.ts` (quitar detección propose_work)
* `extensions/fluxcore-asistentes/src/prompt-builder.ts` (quitar sección WES del prompt)
* `apps/api/src/services/ai.service.ts` (quitar wesContext de generateResponse para runtime local)
* `apps/api/src/services/ai-orchestrator.service.ts` (quitar lógica proposedWork)

---

## Orden de Ejecución

```
Hito 1 (PolicyContext)
  │
  ├──→ Hito 2 (Extraer OpenAI) ──→ Hito 3 (Descomponer Monolito)
  │
  └──→ Hito 4 (Limpiar WES-170)
```

Hito 1 es el cimiento.
Hitos 2 y 4 son independientes entre sí pero ambos dependen de Hito 1.
Hito 3 se beneficia de que Hito 2 ya haya limpiado la capa de OpenAI.

---

## Impacto en el Usuario Final

**Cero.** Ninguno de estos hitos cambia la funcionalidad visible. Son refactorizaciones internas que alinean el código con la arquitectura canónica.

La única excepción potencial es el Hito 1: si la UI de configuración necesita campos nuevos (tono, emojis), eso requiere un componente de UI. Pero es aditivo, no destructivo.
