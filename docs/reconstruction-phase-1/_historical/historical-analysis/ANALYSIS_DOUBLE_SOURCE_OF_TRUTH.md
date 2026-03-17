# Análisis Crítico: Doble Fuente de Verdad en Runtime

## 🚨 Problema Identificado

El sistema tiene **dos fuentes de verdad** para el contexto del asistente, lo que viola el principio fundamental de Single Source of Truth.

## 📊 Flujo Actual (Problemático)

### 1. **MessageDispatch** - Fuente 1 ❌
```typescript
// message-dispatch.service.ts:94-99
const policyContext = await fluxPolicyContextService.resolve({
    accountId: respondingAccountId, // ✅ CORREGIDO: senderAccountId
    conversationId: envelope.conversationId,
    relationshipId: conversation.relationshipId ?? undefined,
});
```

**Resultado:** `PolicyContext` con `resolvedBusinessProfile` de la cuenta que responde

### 2. **FluxPolicyContextService** - Fuente 2 ✅
```typescript
// flux-policy-context.service.ts:200-214
const runtimeConfig: RuntimeConfig = assistant
    ? {
        runtimeId: this.mapRuntimeId(assistant.runtime),
        accountId,                    // 🎯 MISMO accountId que el asistente
        assistantId: assistant.id,
        instructions: await this.compileInstructions(assistantInstructions),
        // ...
      }
```

**Resultado:** `RuntimeConfig` con `instructions` del asistente correcto

### 3. **PromptBuilder** - Conflación de Fuentes 🧩
```typescript
// prompt-builder.service.ts:36-51
// ── Section 1: Business Identity (PolicyContext) ───────────
sections.push(this.buildIdentitySection(policyContext));

// ── Section 2: PolicyContext Directives ─────────────────────
sections.push(this.buildPolicySection(policyContext));

// ── Section 3: RuntimeConfig Instructions ─────────────────
if (runtimeConfig.instructions) {
    sections.push(`## Instrucciones del Asistente\n\n${runtimeConfig.instructions}`);
}
```

## 🔍 Análisis del Problema

### **Antes de la Corrección:**
- **PolicyContext:** `accountId: 5f96c4c5` (Flux Core) → `resolvedBusinessProfile: {"displayName": "Flux Core"}`
- **RuntimeConfig:** `accountId: 520954df` (Floristería) → `instructions: "Eres un asistente de ventas para una floristería..."`

### **Resultado del Prompt:**
```
## Identidad
Eres el asistente virtual de **Flux Core**.  ❌ Datos incorrectos

## Instrucciones del Asistente  
Eres un asistente de ventas para una floristería...  ✅ Datos correctos
```

### **Después de la Corrección:**
- **PolicyContext:** `accountId: 520954df` (Floristería) → `resolvedBusinessProfile: {"displayName": "Floristería", "privateContext": "..."}`
- **RuntimeConfig:** `accountId: 520954df` (Floristería) → `instructions: "Eres un asistente de ventas para una floristería..."`

## 🎯 Principio Violado: Single Source of Truth

### **Debería ser:**
1. **Una sola resolución de contexto** → **Un solo PolicyContext completo**
2. **RuntimeConfig derivado del PolicyContext** (no fuente separada)
3. **PromptBuilder usa solo PolicyContext** (no mezcla)

## 🏗️ Arquitectura Correcta Propuesta

### **Opción A: PolicyContext como Única Fuente**
```typescript
// 1. Resolver PolicyContext completo para el responder
const policyContext = await fluxPolicyContextService.resolve({
    accountId: respondingAccountId,
    // ...
});

// 2. RuntimeConfig es solo un subset de PolicyContext
const runtimeConfig = {
    runtimeId: policyContext.activeRuntimeId,
    accountId: policyContext.accountId,
    instructions: policyContext.resolvedBusinessProfile.privateContext,
    // ...
};

// 3. PromptBuilder usa solo PolicyContext
const prompt = promptBuilder.build(policyContext);
```

### **Opción B: Eliminar resolvedBusinessProfile de PolicyContext**
```typescript
// 1. PolicyContext solo para políticas y configuración
const policyContext = {
    accountId,
    mode: 'auto',
    responseDelayMs: 3000,
    // SIN resolvedBusinessProfile
};

// 2. RuntimeConfig contiene toda la información del negocio
const runtimeConfig = {
    accountId,
    instructions: await this.getBusinessInstructions(accountId),
    businessProfile: await this.getBusinessProfile(accountId),
    // ...
};
```

## 📋 Decisiones Arquitectónicas

### **Pregunta Clave:**
**¿Qué debería contener PolicyContext vs RuntimeConfig?**

#### **Enfoque Canon (Actual):**
- **PolicyContext:** Configuración de políticas + perfil del negocio
- **RuntimeConfig:** Configuración técnica del runtime + instrucciones

#### **Enfoque Unificado:**
- **PolicyContext:** Solo políticas (modo, delays, reglas)
- **RuntimeConfig:** Todo lo relacionado con el asistente (perfil, instrucciones, configuración)

## 🛠️ Solución Inmediata

Mientras decidimos la arquitectura correcta, **unifiquemos las fuentes**:

```typescript
// Asegurar que ambos usen el mismo accountId
const respondingAccountId = envelope.senderAccountId;

// PolicyContext usa respondingAccountId
const policyContext = await fluxPolicyContextService.resolve({
    accountId: respondingAccountId,
    // ...
});

// RuntimeConfig también usa respondingAccountId (ya lo hace)
const runtimeConfig = await this.resolveRuntimeConfig(
    respondingAccountId, 
    assistantId
);
```

## 🎯 Conclusión

**El problema no es solo técnico, es arquitectónico.** Tenemos una duplicación de responsabilidades que crea:

1. **Inconsistencia potencial** (como vimos)
2. **Complejidad innecesaria**
3. **Dificultad para mantener**
4. **Violación de principios SOLID**

**La solución requiere una decisión arquitectónica clara sobre qué contiene cada componente y eliminar la duplicación.**
