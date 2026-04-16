---
id: "asistentes-local-runtime"
type: "core"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-04-08", confidence: 100, notes: "Revalidado contra el archivo real implementando Intent Router" }
  connections: { status: "complete", completed_date: "2026-04-08", confidence: 100, notes: "RuntimeGateway, PromptBuilder, LLMClient, y enrutador LLM integrado" }
  subsystem: { status: "complete", completed_date: "2026-04-08", confidence: 100, notes: "Runtime cognitivo con enrutador de intenciones pre-flight y compatibilidad legacy" }
  operations: { status: "complete", completed_date: "2026-04-08", confidence: 100, notes: "Guard clauses, intent routing pre-flight, prompt composition, tool loop y follow-up post-plantilla" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 asistentes-local.runtime

## 🎯 Propósito
`AsistentesLocalRuntime` implementa el runtime cognitivo local de FluxCore para modelos compatibles con chat completions. Recibe un `RuntimeInput` ya resuelto, compone el prompt soberano con `promptBuilder`, ofrece solo las capacidades permitidas (`search_knowledge`, `send_template`), ejecuta un loop de function calling de hasta 2 rondas y devuelve únicamente `ExecutionAction[]` declarativas para que otro componente medie los efectos.

## 🏗️ Arquitectura

### Flujo principal de `handleMessage()`
1. **Guards iniciales**
   - Si `policyContext.mode === 'off'`, retorna `no_action`.
   - Si no hay historial o el último mensaje no es `user`, retorna `no_action` para evitar loops.

2. **Detección Determinista Pre-Flight (Intent Router)**
   - Si existen plantillas autorizadas con `instructions`, convoca a `evaluateTemplateIntents()`.
   - Efectúa una llamada LLM veloz (`maxTokens: 50, temperature: 0`) para verificar exclusividad de match entre el mensaje de usuario y el propósito de las plantillas.
   - **Caso Match:** Bypass del bucle "vendedor". Evalúa residual con `generateTemplateAwareFollowUp`. Retorna el pool `ExecutionAction[]` final y finaliza el turno.
   - **Caso No Match (`NONE`):** Prosigue con la resolución general (asistente) y las fases posteriores.

3. **Resolución local de parámetros del modelo**
   - Provider por defecto: `groq`.
   - Modelo por defecto: `llama-3.1-8b-instant`.
   - `maxTokens` por defecto: `1024`.
   - `temperature` por defecto: `0.7`.

3. **Construcción del prompt soberano**
   - Llama `promptBuilder.build({ policyContext, authorizedContext, runtimeConfig, conversationHistory })`.
   - El prompt resultante mezcla identidad de negocio, directivas de atención, instrucciones autorizadas del asistente y recursos autorizados del negocio.

4. **Oferta de herramientas autorizadas**
   - Usa `capabilityLocalRuntimeToolsService.listTools(...)`.
   - Filtra explícitamente por `ASISTENTES_LOCAL_TOOL_NAMES = ['search_knowledge', 'send_template']`.

5. **Preparación de dependencias de ejecución**
   - Construye `capabilityExecutionDeps` con `createCapabilityDeps({ enableTemplateSend: false })`.
   - Esto obliga a que `send_template` quede como acción declarativa encolada, no como efecto inmediato.

6. **Loop LLM + tools**
   - Inicializa `currentMessages` con el `systemPrompt` y el historial filtrado.
   - Ejecuta `llmClient.complete(...)` dentro de un loop `for (round = 0; round <= MAX_TOOL_ROUNDS; round++)`.
   - Si el modelo devuelve `toolCalls`, las agrega como mensaje `assistant`, ejecuta cada tool y agrega la respuesta como mensaje `tool`.

7. **Cierre del turno cognitivo**
   - Si la respuesta final es texto puro, devuelve `send_message`.
   - Si hay plantillas detectadas (vía tool o regex fallback) devuelve `send_template` y, si corresponde, un `send_message` de seguimiento.
   - Si el modelo no produce salida utilizable, devuelve `no_action`.

### Compatibilidad legacy de plantillas y Follow Up Híbrido
El archivo mantiene un subsistema local para invocar plantillas robustamente o rescatarlas si el LLM las emite en modo de fallback (`CALL_TEMPLATE:` en texto libre):

- `extractJsonObject()` parsea un payload JSON opcional después del marcador.
- `parseTemplateResponse()` identifica markers de las plantillas (vía Regex compatible con `_` o espacio), valida autorización, deduplica acciones y calcula el texto residual.
- `evaluateTemplateIntents()` clasifica estrictamente la intención (Fase 1 pre-flight).
- `buildTemplateFollowUpContext()` reconstruye el contenido exacto de las plantillas autorizadas desde `authorizedContext.businessProfile.templates`.
- `generateTemplateAwareFollowUp()` hace una segunda llamada LLM para redactar un seguimiento breve cuando hubo plantillas y todavía quedó texto residual útil, anulando texto donde la plantilla no tenga contenido renderizable.
- `sanitizeFollowUpText()` bloquea salidas técnicas o inseguras (`NO_FOLLOW_UP`, JSON puro, fenced blocks, markers técnicos).

### Integración con el resto del sistema
- **Registro e invocación:** `runtimeGateway.register(asistentesLocalRuntime)` ocurre en `apps/api/src/server.ts` y en el bootstrap legado de `apps/api/src/index.ts`.
- **Ejecución efectiva:** el `RuntimeGateway` es quien llama `handleMessage(input)` y consume sus `ExecutionAction[]`.
- **Oferta/ejecución de capabilities:** el runtime delega en `capabilityLocalRuntimeToolsService` la traducción entre tool calls del LLM y capacidades autorizadas de plataforma.

## 🧱 Dependencias
- **Depende de:**
  - `apps/api/src/services/fluxcore/prompt-builder.service.ts`
  - `apps/api/src/services/fluxcore/llm-client.service.ts`
  - `apps/api/src/services/capability-local-runtime-tools.service.ts`
  - `apps/api/src/services/capability-deps-factory.service.ts`
- **Lo usa:**
  - `apps/api/src/services/fluxcore/runtime-gateway.service.ts`
  - Registro en `apps/api/src/server.ts`
  - Registro legado en `apps/api/src/index.ts`

## 🔒 Invariantes observados en el código
- No ejecuta directamente efectos externos: retorna acciones declarativas como `send_message`, `send_template` o `no_action`.
- Limita el surface de tools locales a dos nombres explícitos.
- Deduplica acciones de plantilla por `templateId + variables`.
- Evita follow-ups inseguros cuando detecta JSON, fenced blocks o marcadores técnicos.
- Implementa prevención de loops si el último mensaje no proviene del usuario.

## ⚠️ Dudas técnicas y advertencias
1. **Drift del contrato `RuntimeInput`:** `RuntimeInput` expone `services`, pero este runtime no usa `input.services`; construye dependencias internas con `createCapabilityDeps(...)`. La consolidación de plataforma no está cerrada en este archivo.
2. **Acceso transitivo a infraestructura durante `handleMessage()`:** aunque el runtime no importa `db` directamente, los deps creados localmente terminan delegando en `retrievalService` y `aiTemplateService`, por lo que la garantía “todo llega resuelto” queda debilitada en la práctica.
3. **Exposición de prompt sensible en logs:** imprime el `systemPrompt` completo con `console.log`, incluyendo identidad de negocio, instrucciones y recursos autorizados del negocio.

## 💡 Ejemplo de Uso
```typescript
import { asistentesLocalRuntime } from './services/fluxcore/runtimes/asistentes-local.runtime';

const actions = await asistentesLocalRuntime.handleMessage(input);
```
