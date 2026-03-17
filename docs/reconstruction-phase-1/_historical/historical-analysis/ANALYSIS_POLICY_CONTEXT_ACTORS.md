# Análisis Crítico: PolicyContext basado en Actores vs Cuentas

## 1. Problema Identificado

El `FluxPolicyContextService` actualmente resuelve el contexto basado en `accountId` (cuentas), pero según tu indicación, **el sistema debe resolver mediante actores** que son quienes realmente hablan e interactúan.

## 2. Flujo Actual (Incorrecto)

### 2.1 MessageDispatch
```typescript
// message-dispatch.service.ts:88-89
const policyContext = await fluxPolicyContextService.resolve({
    accountId: targetAccountId, // ❌ Usando cuenta en lugar de actor
    conversationId: envelope.conversationId,
    relationshipId: conversation.relationshipId ?? undefined,
});
```

### 2.2 CognitiveDispatcher
```typescript
// cognitive-dispatcher.service.ts:78-81
const { policyContext, runtimeConfig } = await fluxPolicyContextService.resolveContext(
    accountId, // ❌ Usando cuenta en lugar de actor
    conversation?.relationshipId || '',
    (conversation as any)?.channel || 'web'
);
```

## 3. Flujo Correcto (Basado en Actores)

El sistema debería:
1. **Recibir el `fromActorId`** del mensaje
2. **Resolver la cuenta asociada al actor**
3. **Determinar el contexto basado en el actor**

## 4. Arquitectura de Actores vs Cuentas

### 4.1 Mensajes con Actores
```typescript
interface MessageEnvelope {
    fromActorId: string;        // 🎭 Quien habla
    senderAccountId: string;    // 💼 Cuenta dueña del actor
    targetAccountId: string;    // 🎯 Cuenta destinataria
    conversationId: string;
}
```

### 4.2 PolicyContext basado en Actor
El `resolveContext` debería recibir:
```typescript
async resolveContext(
    actorId: string,           // 🎭 Actor que responde
    targetActorId?: string,    // 🎯 Actor destinatario (opcional)
    conversationId: string,
    channel: string,
): Promise<FluxPolicyContext>
```

## 5. Impacto en los Logs

### Logs Actuales (Incorrectos)
```
[FluxPolicyContext] 🔍 RESOLVIENDO REALIDAD PARA CUENTA:
📋 ACCOUNT ID: 5f96c4c5-473b-4574-93ce-53f54225dd18  // Flux Core
📋 resolvedBusinessProfile: {"displayName": "Flux Core"} // ❌ Equivocado
```

### Logs Corregidos (Basados en Actores)
```
[FluxPolicyContext] 🔍 RESOLVIENDO REALIDAD PARA ACTOR:
📭 ACTOR ID: 7671016d-b5ac-4c60-a3f4-26657eca13e4  // Actor de Floristería
📋 ACCOUNT ID: 520954df-cd5b-499a-a435-a5c0be4fb4e8  // Floristería
📋 resolvedBusinessProfile: {"displayName": "Floristería", ...} // ✅ Correcto
```

## 6. Cambios Requeridos

### 6.1 FluxPolicyContextService
```typescript
// Nuevo método basado en actores
async resolveContextForActor(
    actorId: string,
    targetActorId: string | null,
    conversationId: string,
    channel: string,
): Promise<FluxPolicyContext> {
    // 1. Resolver cuenta del actor
    const actor = await this.resolveActor(actorId);
    const accountId = actor.accountId;
    
    // 2. Usar lógica existente con accountId correcto
    return this.resolveContext(accountId, conversationId, channel);
}
```

### 6.2 MessageDispatch
```typescript
// Cambiar de targetAccountId a fromActorId del mensaje AI
const policyContext = await fluxPolicyContextService.resolveForActor(
    envelope.fromActorId, // 🎭 Actor que genera la respuesta
    null, // Target actor no necesario para contexto
    envelope.conversationId,
    'web'
);
```

### 6.3 CognitiveDispatcher
```typescript
// Recibir actorId en lugar de accountId
async dispatch(params: {
    turnId: number;
    conversationId: string;
    actorId: string;        // 🎭 Cambiado de accountId
    lastSignalSeq: number | null;
}): Promise<DispatchResult> {
    // Resolver cuenta del actor
    const actor = await this.resolveActor(params.actorId);
    const accountId = actor.accountId;
    
    // Resto de la lógica con accountId correcto
}
```

## 7. Implementación de resolveActor

```typescript
private async resolveActor(actorId: string): Promise<{accountId: string, actorType: string}> {
    const [actor] = await db
        .select()
        .from(actors)
        .where(eq(actors.id, actorId))
        .limit(1);
    
    if (!actor) {
        throw new Error(`Actor not found: ${actorId}`);
    }
    
    return {
        accountId: actor.accountId,
        actorType: actor.type
    };
}
```

## 8. Conclusión

El problema fundamental es que **el PolicyContext se está resolviendo para la cuenta equivocada** porque está usando `targetAccountId` en lugar de resolver la cuenta del `fromActorId` que es quien realmente genera la respuesta.

La transición a un modelo basado en actores:
1. **Corrige el contexto** para que use la cuenta correcta
2. **Alinea con la arquitectura** donde los actores son los que hablan
3. **Resuelve el bug** del `resolvedBusinessProfile` vacío o incorrecto
4. **Mantiene la separación** entre ChatCore (actores) y FluxCore (cognición)

Este cambio es fundamental para que la IA reciba el contexto correcto del negocio y responda adecuadamente.
