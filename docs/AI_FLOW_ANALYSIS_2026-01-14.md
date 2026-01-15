# Análisis del Flujo de IA - Estado Actual vs Esperado
**Fecha:** 2026-01-14  
**Crítico:** Detectados 2 problemas mayores en el flujo de IA

---

## ⚠️ PROBLEMA 1: DELAY SE APLICA DESPUÉS DE GENERAR SUGERENCIA (INCORRECTO)

### **Flujo actual (INCORRECTO):**

```
Usuario envía mensaje
    ↓
message-core.ts persiste mensaje
    ↓
ws-handler.ts llama aiService.processMessage()
    ↓
ai.service.ts:242 getAccountConfig(recipientAccountId)
    ↓
ai.service.ts:268-278 onConfigChange() - actualiza config genérica
    ↓
ai.service.ts:281 extension.onMessage() - **GENERA SUGERENCIA DE IA AQUÍ**
    ↓
ws-handler.ts:346 recibe suggestion
    ↓
ws-handler.ts:376 LUEGO aplica delay: delayMs = (aiConfig.responseDelay || 30) * 1000
    ↓
setTimeout(() => processSuggestion(), delayMs) - **DELAY DESPUÉS**
```

### **Flujo esperado (CORRECTO):**

```
Usuario envía mensaje
    ↓
message-core.ts persiste mensaje
    ↓
ws-handler.ts detecta modo automático
    ↓
ws-handler.ts obtiene timingConfig del asistente ACTIVO
    ↓
ws-handler.ts PRIMERO aplica delay: delayMs = timingConfig.responseDelaySeconds * 1000
    ↓
setTimeout(() => {
    aiService.processMessage() - **GENERA SUGERENCIA DESPUÉS DEL DELAY**
}, delayMs)
    ↓
Sugerencia se envía inmediatamente después de generarse
```

---

## ⚠️ PROBLEMA 2: LA IA NO USA CONFIGURACIÓN DEL ASISTENTE ACTIVO

### **Estado actual:**

`ai.service.ts:242` obtiene configuración genérica de la extensión:
```typescript
const config = await this.getAccountConfig(recipientAccountId);
```

Esta configuración NO incluye:
- ❌ `timingConfig.responseDelaySeconds` del asistente activo
- ❌ `timingConfig.smartDelay` del asistente activo
- ❌ `modelConfig.temperature`, `topP`, `responseFormat` del asistente activo
- ❌ `instructionIds` - referencias a instrucciones del sistema
- ❌ `vectorStoreIds` - referencias a bases de conocimiento

### **Lo que DEBE hacer:**

```typescript
// 1. Resolver asistente activo
const activeAssistant = await fluxcoreService.resolveActiveAssistant(recipientAccountId);

if (!activeAssistant) {
  // Fallback a config genérica
}

// 2. Obtener composición completa (instructions, vectorStores)
const composition = await fluxcoreService.getAssistantComposition(activeAssistant.id);

// 3. Construir system prompt con instructions
let systemPrompt = '';
for (const instruction of composition.instructions) {
  systemPrompt += instruction.content + '\n\n';
}

// 4. Construir contexto RAG desde vectorStores
let ragContext = '';
for (const vectorStore of composition.vectorStores) {
  // TODO: Implementar búsqueda semántica en el futuro
  // Por ahora solo documentar que existe la referencia
}

// 5. Usar modelConfig del asistente
const config = {
  ...baseConfig,
  temperature: activeAssistant.modelConfig.temperature,
  topP: activeAssistant.modelConfig.topP,
  responseFormat: activeAssistant.modelConfig.responseFormat,
  systemPrompt: systemPrompt,
  ragContext: ragContext, // Para implementación futura
};

// 6. Usar timingConfig para delay
const delaySeconds = activeAssistant.timingConfig.responseDelaySeconds;
const smartDelayEnabled = activeAssistant.timingConfig.smartDelay;
```

---

## 📋 VERIFICACIÓN DEL CÓDIGO ACTUAL

### **ai.service.ts:268-278 - Config que se pasa a la extensión:**
```typescript
await extension.onConfigChange(recipientAccountId, {
  enabled: gated.config.enabled,
  mode: gated.config.mode,
  responseDelay: gated.config.responseDelay,  // ⚠️ NO del asistente
  provider: gated.config.provider,
  model: gated.config.model || 'llama-3.1-8b-instant',  // ⚠️ NO del asistente
  maxTokens: gated.config.maxTokens || 256,  // ⚠️ NO del asistente
  temperature: gated.config.temperature || 0.7,  // ⚠️ NO del asistente
  timeoutMs: 15000,
  providerOrder: gated.config.providerOrder,
});
```

**Problema:** Esta config es genérica de la extensión, NO del asistente activo.

### **ws-handler.ts:352-403 - Delay después de generar:**
```typescript
if (evaluation.mode === 'automatic') {
  const aiConfig = await extensionHost.getAIAccountConfig(accountId!);
  
  if (aiConfig.smartDelayEnabled) {
    // SmartDelay
  } else {
    const delayMs = (aiConfig.responseDelay || 30) * 1000;  // ⚠️ NO del asistente
    
    ws.send({ type: 'suggestion:auto_waiting', delayMs });
    
    setTimeout(async () => {
      // Procesar sugerencia YA GENERADA
    }, delayMs);
  }
}
```

**Problema:** El delay se aplica DESPUÉS de generar la sugerencia, debería ser ANTES.

---

## 🔧 SOLUCIONES REQUERIDAS

### **Solución 1: Mover delay ANTES de generar sugerencia**

**Archivo:** `apps/api/src/websocket/ws-handler.ts`

```typescript
// NUEVO FLUJO en handleSuggestionRequest:

// 1. Obtener asistente activo
const activeAssistant = await fluxcoreService.resolveActiveAssistant(accountId!);

if (!activeAssistant) {
  // Fallback o error
}

// 2. Extraer timingConfig
const delaySeconds = activeAssistant.assistant.timingConfig?.responseDelaySeconds || 2;
const smartDelayEnabled = activeAssistant.assistant.timingConfig?.smartDelay || false;

// 3. Aplicar delay ANTES de generar
if (evaluation.mode === 'automatic') {
  if (smartDelayEnabled) {
    smartDelayService.scheduleResponse({
      conversationId: conversationId!,
      accountId: accountId!,
      onProcess: async () => {
        // GENERAR SUGERENCIA AQUÍ (dentro del callback)
        const suggestion = await aiService.processMessage(...);
        await processSuggestion(ws, { suggestion, ... });
      }
    });
  } else {
    const delayMs = delaySeconds * 1000;
    
    ws.send({ type: 'suggestion:auto_waiting', delayMs });
    
    setTimeout(async () => {
      // GENERAR SUGERENCIA AQUÍ (después del delay)
      const suggestion = await aiService.processMessage(...);
      await processSuggestion(ws, { suggestion, ... });
    }, delayMs);
  }
} else {
  // Modo sugerencia: generar inmediatamente
  const suggestion = await aiService.processMessage(...);
  ws.send({ type: 'suggestion:ready', data: suggestion });
}
```

### **Solución 2: Usar config del asistente activo en ai.service**

**Archivo:** `apps/api/src/services/ai.service.ts`

```typescript
async processMessage(...): Promise<AISuggestion | null> {
  // 1. Obtener asistente activo con composición
  const composition = await fluxcoreService.resolveActiveAssistant(recipientAccountId);
  
  if (!composition) {
    // Fallback a config genérica
  }
  
  // 2. Construir system prompt desde instructions
  let systemPrompt = '';
  for (const instruction of composition.instructions) {
    systemPrompt += instruction.content + '\n\n';
  }
  
  // 3. Obtener modelConfig del asistente
  const assistantModelConfig = composition.assistant.modelConfig;
  
  // 4. Construir contexto con RAG (futuro)
  const context = await this.buildContext(recipientAccountId, conversationId);
  
  // 5. Actualizar config de extensión con datos del asistente
  await extension.onConfigChange(recipientAccountId, {
    ...baseConfig,
    model: assistantModelConfig.model || 'llama-3.1-8b-instant',
    temperature: assistantModelConfig.temperature,
    topP: assistantModelConfig.topP,
    responseFormat: assistantModelConfig.responseFormat,
    systemPrompt: systemPrompt,  // NUEVO
  });
  
  // 6. Generar sugerencia
  const suggestion = await extension.onMessage(event, context, recipientAccountId);
  
  return suggestion;
}
```

---

## 📊 ESTADO DEL RAG / VECTOR STORES

### **Implementación actual:**

- ✅ Schema DB: `fluxcore_vector_stores`, `fluxcore_vector_store_files`
- ✅ API REST: `/api/fluxcore/vector-stores` (CRUD completo)
- ✅ Frontend UI: `VectorStoresView.tsx` (listado, creación, edición)
- ⚠️ **Falta:** Búsqueda semántica real en los archivos
- ⚠️ **Falta:** Integración con el flujo de generación de IA

### **Estado del Vector Store:**

```typescript
// fluxcore_vector_stores table:
{
  id: string,
  accountId: string,
  name: string,
  status: 'processing' | 'ready' | 'error',
  sizeBytes: number,
  fileCount: number,
  expirationPolicy: 'never' | 'days_after_creation' | 'days_after_last_use',
  expiresAt: Date | null,
}

// fluxcore_vector_store_files table:
{
  id: string,
  vectorStoreId: string,
  filename: string,
  sizeBytes: number,
  status: 'pending' | 'processing' | 'ready' | 'error',
}
```

### **Relación Asistente → Vector Store:**

```typescript
// fluxcore_assistant_vector_stores (join table)
{
  assistantId: string,
  vectorStoreId: string,
}
```

### **Lo que falta implementar:**

1. **Embedding de archivos:** Convertir archivos a vectores
2. **Búsqueda semántica:** Encontrar fragmentos relevantes según query
3. **Inyección en contexto:** Agregar fragmentos al system prompt

### **Documentación para trabajo futuro:**

```markdown
# RAG / Vector Store - Roadmap

## Fase 1 (actual): Estructura y Referencias
- ✅ Schema DB completo
- ✅ API CRUD vector stores
- ✅ Frontend UI para gestión
- ✅ Relación asistente → vector stores

## Fase 2 (pendiente): Procesamiento
- [ ] Servicio de embedding (OpenAI embeddings API)
- [ ] Parsers de archivos (PDF, TXT, MD, DOCX)
- [ ] Chunking de contenido (tamaño óptimo ~512 tokens)
- [ ] Almacenamiento de embeddings (PostgreSQL pgvector o Pinecone)

## Fase 3 (pendiente): Búsqueda
- [ ] Similarity search (cosine similarity)
- [ ] Ranking y reranking
- [ ] Filtrado por metadata

## Fase 4 (pendiente): Integración IA
- [ ] Inyectar fragmentos relevantes en system prompt
- [ ] Citar fuentes en respuesta
- [ ] Gestionar límite de tokens del contexto
```

---

## ✅ CAMBIOS DE TERMINOLOGÍA

**Búsqueda global:** `producción` → `activo`

### **Archivos a actualizar:**

1. `apps/web/src/components/fluxcore/views/AssistantsView.tsx`
   - Buscar: "producción", "production"
   - Reemplazar: "activo", "active"

2. `apps/api/src/services/fluxcore.service.ts`
   - Función: `ensureProductionAssistant` → `ensureActiveAssistant`
   - Campo: `isProduction` → `isActive`

3. Schema DB: `packages/db/src/schema/fluxcore-assistants.ts`
   - Campo: `isProduction: boolean()` → `isActive: boolean()`
   - Migración requerida

---

## 🎯 RESUMEN EJECUTIVO

### **Problemas críticos detectados:**

1. ⚠️ **Delay incorrecto:** Se aplica DESPUÉS de generar sugerencia (debe ser ANTES)
2. ⚠️ **Config incorrecta:** No usa asistente activo (debe usar `resolveActiveAssistant`)
3. ⚠️ **Instructions no aplicadas:** No se inyectan en system prompt
4. ⚠️ **Vector Stores no consultados:** Referencias existen pero no se usan
5. ⚠️ **ModelConfig ignorado:** No usa temperature/topP/responseFormat del asistente

### **Impacto:**

- ❌ Los usuarios configuran delays que no se respetan
- ❌ Los usuarios crean instrucciones que la IA ignora
- ❌ Los usuarios ajustan temperatura/topP sin efecto
- ❌ Los vector stores son solo decorativos

### **Prioridad:**

**CRÍTICA** - Estos bugs rompen la funcionalidad principal de FluxCore.

---

## 📝 PRÓXIMOS PASOS

1. Implementar delay ANTES de generar (ws-handler.ts)
2. Usar asistente activo en ai.service.ts
3. Inyectar instructions en system prompt
4. Actualizar terminología producción → activo
5. Documentar RAG para implementación futura
6. Implementar eliminación de entidades con footer
7. Estabilizar íconos responsivos
8. Sincronizar ActivityBar
9. Auto-expandir CollapsibleSection

---

**Fin del análisis**
