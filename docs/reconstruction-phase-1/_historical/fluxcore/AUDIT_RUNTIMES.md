# Auditoría H0.3: Runtimes Existentes

**Fecha:** 2026-02-17  
**Objetivo:** Evaluar cumplimiento del contrato `RuntimeAdapter` canónico y soberanía

---

## 1. CONTRATO CANÓNICO REQUERIDO

### 1.1 Interfaz RuntimeAdapter (Canon v8.2 sección 4.7)

```typescript
interface RuntimeAdapter {
  readonly runtimeId: string;
  handleMessage(input: RuntimeInput): Promise<ExecutionAction[]>;
}

interface RuntimeInput {
  signal: KernelSignal;              // señal certificada que originó el turno
  policyContext: FluxPolicyContext;  // mundo autorizado completo
  conversationHistory: Message[];    // historial previo + mensajes del turno actual
}
```

### 1.2 Invariantes de Soberanía

1. ✅ No acceden a bases de datos durante `handleMessage`
2. ✅ No tienen estado global entre invocaciones
3. ✅ No se invocan entre sí (son alternativas completas)
4. ✅ No ejecutan herramientas directamente (devuelven acciones)
5. ✅ Siempre producen resultado (respuesta, sugerencia, propuesta, o `no_action`)
6. ✅ El modo (`auto`/`suggest`/`off`) es política del `PolicyContext`, no del runtime

---

## 2. FLUXCORE RUNTIME ADAPTER (ASISTENTES LOCAL)

### 2.1 Verificación de Contrato

**Archivo:** `apps/api/src/services/runtimes/fluxcore-runtime.adapter.ts`

#### ⚠️ CUMPLE PARCIALMENTE: Interfaz RuntimeAdapter

**Implementa:**
```typescript
class FluxCoreRuntimeAdapter implements RuntimeAdapter {
  async handleMessage(input: RuntimeHandleInput): Promise<ExecutionResult>
}
```

**PROBLEMA:** El tipo `RuntimeHandleInput` no coincide con `RuntimeInput` canónico.

**Actual:**
```typescript
interface RuntimeHandleInput {
  envelope: MessageEnvelope;
  policyContext: FluxPolicyContext;
}
```

**Requerido:**
```typescript
interface RuntimeInput {
  signal: KernelSignal;
  policyContext: FluxPolicyContext;
  conversationHistory: Message[];
}
```

**Análisis:** El runtime actual recibe `envelope` (mensaje individual) en lugar de `signal` + `conversationHistory`. Esto es una desviación del Canon.

#### ❌ NO CUMPLE: Soberanía - Acceso a DB

**Línea 30:**
```typescript
const config = await aiService.getAccountConfig(targetAccountId);
```

**Línea 125:**
```typescript
const config = await aiService.getAccountConfig(targetAccountId);
```

**PROBLEMA:** El runtime accede a configuración durante `handleMessage`. Según Canon, toda configuración debe venir en `PolicyContext`.

**Requerido:** `policyContext.mode`, `policyContext.smartDelayEnabled` ya resueltos.

#### ❌ NO CUMPLE: Soberanía - Ejecuta Efectos Directamente

**Línea 64-72:**
```typescript
await messageCore.send({
  conversationId: action.payload.conversationId,
  senderAccountId: action.payload.senderAccountId,
  content: action.payload.content,
  type: 'outgoing',
  generatedBy: action.payload.generatedBy,
  targetAccountId: action.payload.targetAccountId,
});
```

**PROBLEMA CRÍTICO:** El runtime ejecuta `messageCore.send()` directamente en callback de SmartDelay. Según Canon, solo `ActionExecutor` puede producir efectos.

**Requerido:** Devolver acciones, no ejecutarlas.

#### ✅ CUMPLE: No se invoca con otros runtimes

No hay llamadas a otros runtimes detectadas.

#### ⚠️ CUMPLE PARCIALMENTE: Herramientas

**Línea 104:**
```typescript
const response = await aiService.generateResponse(...)
```

**Análisis:** `aiService.generateResponse()` es un servicio inyectado que llama al LLM. Esto es correcto según Canon v8.2 (servicios síncronos permitidos). Sin embargo, debe verificarse que `aiService` no acceda a DB durante la llamada.

### 2.2 Componentes Reutilizables

**✅ REUTILIZABLE:**
- Lógica de SmartDelay (refactorizar fuera del runtime)
- Integración con `aiService.generateResponse()`
- Manejo de `ExecutionPlan` bloqueado

**⚠️ REFACTORIZAR:**
- Eliminar acceso a `aiService.getAccountConfig()` (usar `PolicyContext`)
- Eliminar ejecución directa de `messageCore.send()` (devolver acciones)
- Cambiar firma a `RuntimeInput` canónico

**❌ ELIMINAR:**
- Callback asíncrono de SmartDelay que ejecuta efectos

### 2.3 Diagnóstico

**Estado:** Requiere refactorización significativa para cumplir Canon.

**Violaciones críticas:**
1. Accede a DB vía `aiService.getAccountConfig()`
2. Ejecuta efectos directamente vía `messageCore.send()`
3. Recibe `envelope` en lugar de `signal` + `conversationHistory`

**Acción requerida:** H3 - Reescribir como `AsistentesLocalRuntime` canónico.

---

## 3. AGENT RUNTIME ADAPTER

### 3.1 Verificación de Contrato

**Archivo:** `apps/api/src/services/runtimes/agent-runtime.adapter.ts`

#### ⚠️ CUMPLE PARCIALMENTE: Interfaz RuntimeAdapter

**Implementa:**
```typescript
class AgentRuntimeAdapter implements RuntimeAdapter {
  async handleMessage(input: RuntimeHandleInput): Promise<ExecutionResult>
}
```

**PROBLEMA:** Mismo que FluxCoreRuntimeAdapter - tipo `RuntimeHandleInput` no canónico.

#### ❌ NO CUMPLE: Soberanía - Acceso a DB

**Línea 26:**
```typescript
const runtimeConfig = await runtimeConfigService.getRuntime(targetAccountId);
```

**Línea 31:**
```typescript
const activeAgents = await flowRegistryService.getActiveAgents(targetAccountId);
```

**Línea 42:**
```typescript
const agent = await flowRegistryService.getAgent(targetAccountId, agentId);
```

**Línea 49:**
```typescript
const accountConfig = await aiService.getAccountConfig(targetAccountId);
```

**PROBLEMA CRÍTICO:** El runtime accede a DB 4 veces durante `handleMessage` para resolver configuración y agente activo.

**Requerido:** Toda esta información debe venir en `PolicyContext`:
- `policyContext.activeAgentId`
- `policyContext.agentFlow`
- `policyContext.providerOrder`

#### ✅ CUMPLE: No ejecuta efectos directamente

El runtime devuelve acciones correctamente (línea 139-177).

#### ✅ CUMPLE: Herramientas mediadas

**Línea 55-104:** Las herramientas (`callLLM`, `searchKnowledge`, `executeTool`) son inyectadas como dependencias. Esto es correcto.

### 3.2 Análisis de Propósito

**Pregunta:** ¿Es AgentRuntime un runtime canónico según v8.2?

**Respuesta:** **NO.** Según Canon sección 4.7, los runtimes son:
- `AsistentesLocal` (cognitivo probabilístico, ejecución interna)
- `AsistentesOpenAI` (cognitivo probabilístico, ejecución remota)
- `Fluxi` (transaccional determinista)

**AgentRuntime** parece ser un runtime experimental basado en flows/grafos. No está especificado en el Canon v8.2.

### 3.3 Diagnóstico

**Estado:** No es runtime canónico. Evaluar si mantener o eliminar.

**Opciones:**
1. **Eliminar en H7** (junto con código legacy)
2. **Migrar a Fluxi** si la lógica de flows es valiosa
3. **Mantener como runtime experimental** fuera del Canon

**Recomendación:** Evaluar con usuario en H0.6 (Plan de Migración).

**Acción requerida:** H0.6 - Decidir destino de AgentRuntime.

---

## 4. SERVICIOS INYECTADOS

### 4.1 aiService

**Archivo:** `apps/api/src/services/ai.service.ts`

#### Métodos usados por runtimes:

**`generateResponse()`:**
- Usado por FluxCoreRuntimeAdapter
- ✅ Correcto según Canon v8.2 (servicios síncronos permitidos)
- ⚠️ Verificar que no acceda a DB durante ejecución

**`getAccountConfig()`:**
- Usado por ambos runtimes
- ❌ Violación - debe venir en `PolicyContext`

**`complete()`:**
- Usado por AgentRuntime
- ✅ Correcto - llamada directa a LLM

#### Diagnóstico:

**Reutilizable:**
- `generateResponse()` - integrar en AsistentesLocalRuntime
- `complete()` - cliente LLM reutilizable
- Lógica de `ExecutionPlan` - ya implementada

**Refactorizar:**
- Eliminar llamadas a `getAccountConfig()` desde runtimes
- Mover configuración a `PolicyContext`

### 4.2 smartDelayService

**Archivo:** `apps/api/src/services/smart-delay.service.ts`

**Usado por:** FluxCoreRuntimeAdapter

**Análisis:** SmartDelay es lógica de scheduling, no de runtime. Debe moverse fuera del runtime.

**Opciones:**
1. Mover a `CognitionWorker` (scheduling antes de invocar runtime)
2. Mover a `ActionExecutor` (scheduling después de recibir acciones)
3. Eliminar (usar `responseDelayMs` de `PolicyContext`)

**Recomendación:** Opción 3 - Usar `PolicyContext.responseDelayMs` y eliminar SmartDelay.

**Acción requerida:** H3 - Evaluar si SmartDelay es necesario o simplificar.

---

## 5. PROMPT BUILDER

### 5.1 Verificación

**Archivo:** No encontrado como archivo independiente.

**Análisis:** La lógica de construcción de prompts está embebida en `aiService.generateResponse()`.

**Requerido por Canon sección 4.7.1:**
```typescript
class PromptBuilder {
  build(policyContext: FluxPolicyContext, assistantInstructions: string, history: Message[]): string
}
```

**Estructura requerida:**
1. Sección de `PolicyContext` (tono, formalidad, emojis, notas) - **PRIORIDAD**
2. Sección de asistente (instrucciones de sistema, directivas)
3. Historial formateado

**Acción requerida:** H3 - Crear `PromptBuilder` como servicio independiente.

---

## 6. RUNTIME GATEWAY

### 6.1 Verificación

**Archivo:** `apps/api/src/services/runtime-gateway.service.ts`

**Análisis:** Existe y funciona, pero usa tipos no canónicos (`RuntimeHandleInput` vs `RuntimeInput`).

**Acción requerida:** H2 - Actualizar tipos a canónicos.

---

## RESUMEN EJECUTIVO

### Runtimes Existentes

| Runtime | Cumple Contrato | Cumple Soberanía | Acción |
|---|---|---|---|
| FluxCoreRuntimeAdapter | ⚠️ Parcial | ❌ No | H3 - Reescribir |
| AgentRuntimeAdapter | ⚠️ Parcial | ❌ No | H0.6 - Evaluar destino |

### Violaciones Críticas Detectadas

**FluxCoreRuntimeAdapter:**
1. ❌ Accede a DB vía `getAccountConfig()`
2. ❌ Ejecuta efectos directamente vía `messageCore.send()`
3. ⚠️ Recibe `envelope` en lugar de `signal` + `conversationHistory`

**AgentRuntimeAdapter:**
1. ❌ Accede a DB 4 veces durante `handleMessage`
2. ⚠️ No es runtime canónico según v8.2

### Componentes Reutilizables

**✅ REUTILIZAR:**
- `aiService.generateResponse()` - integración con LLM
- `aiService.complete()` - cliente LLM directo
- Lógica de `ExecutionPlan` - ya implementada
- Manejo de tool calls en AgentRuntime (adaptar)

**⚠️ REFACTORIZAR:**
- SmartDelay → mover fuera de runtime o eliminar
- PromptBuilder → crear como servicio independiente
- RuntimeGateway → actualizar tipos

**❌ ELIMINAR:**
- Accesos a DB desde runtimes
- Ejecución directa de efectos en callbacks

### Estimado Ajustado

**H3 original:** 7-10 días

**H3 ajustado:** **10-14 días**

**Razón:** El runtime actual tiene violaciones significativas de soberanía. No es un simple refactor, requiere reescritura casi completa.

**Desglose:**
- Crear `AsistentesLocalRuntime` desde cero: 3-4 días
- Crear `PromptBuilder` independiente: 2 días
- Integrar con `ExecutionPlan` existente: 1 día
- Tool loop (máximo 2 rounds): 2 días
- Tests de soberanía (mock DB, verificar no se llama): 2-3 días

---

## PLAN DE ACCIÓN H3

### Prioridad CRÍTICA

1. **Crear `AsistentesLocalRuntime` desde cero**
   - Implementar `RuntimeAdapter` canónico
   - Recibir `RuntimeInput` (signal + policyContext + conversationHistory)
   - NO acceder a DB durante `handleMessage`
   - Inyectar servicios síncronos (LLM, RAG)

2. **Crear `PromptBuilder` independiente**
   - Sección 1: PolicyContext (prioridad)
   - Sección 2: Instrucciones del asistente
   - Sección 3: Historial formateado

3. **Eliminar violaciones de soberanía**
   - NO llamar a `getAccountConfig()` (usar `policyContext.mode`)
   - NO ejecutar `messageCore.send()` (devolver acciones)
   - NO acceder a DB (todo vía `policyContext`)

4. **Tests de soberanía**
   - Mock DB y verificar que no se llama
   - Test: runtime no accede a DB durante `handleMessage`
   - Test: runtime devuelve acciones, no ejecuta efectos

### Prioridad MEDIA

5. **Evaluar SmartDelay**
   - ¿Es necesario o usar `policyContext.responseDelayMs`?
   - Si es necesario, mover fuera del runtime

6. **Evaluar AgentRuntime**
   - ¿Mantener, migrar a Fluxi, o eliminar?
   - Documentar decisión en H0.6

---

## RIESGOS IDENTIFICADOS

### RIESGO ALTO

**Reescritura completa de runtime en producción:** El runtime actual está en uso. Reescribirlo puede introducir regresiones.

**Mitigación:**
- Feature flags por cuenta (H2)
- Tests exhaustivos de equivalencia funcional
- Activación gradual (H6)

### RIESGO MEDIO

**SmartDelay puede ser crítico para UX:** Eliminar SmartDelay sin alternativa puede afectar experiencia de usuario.

**Mitigación:**
- Evaluar métricas de uso de SmartDelay
- Si es crítico, implementar en `CognitionWorker` o `ActionExecutor`

---

## CONCLUSIÓN

Los runtimes existentes **NO cumplen** con el Canon v8.2. Requieren reescritura casi completa, no refactorización.

**Componentes reutilizables:**
- Integración con `aiService.generateResponse()`
- Lógica de `ExecutionPlan`
- Manejo de tool calls (adaptar)

**Componentes a eliminar:**
- Accesos a DB desde runtimes
- Ejecución directa de efectos
- SmartDelay embebido en runtime (evaluar)

**Estimado H3 ajustado:** 10-14 días (vs. 7-10 días original).

**Bloqueador:** Ninguno. La reescritura es directa, solo requiere tiempo.
