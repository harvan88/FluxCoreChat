---
id: "flux-policy-context-service"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/flux-policy-context.service.ts"
---

# 🎛️ Flux Policy Context Service

**Ubicación:** `apps/api/src/services/flux-policy-context.service.ts`  
**Propósito:** Resolver políticas de automatización y configuración de runtime para IA  
**Estado:** ✅ STABLE - Recientemente limpiado de código muerto (authorized_data_scopes)  
**Responsable:** Política de Modos (auto/suggest/off) y configuración cognitiva  

---

## 🎯 **Función Principal**

Resuelve el contexto de política completo para una interacción específica, incluyendo modo de automatización, delays, ventanas de turno y configuración de runtime del asistente.

---

## � **CAMBIO RECIENTE: Resolución de Perfil de Negocio (2026-03-22)**

### **Problema Resuelto:**
- **Doble Fuente de Verdad:** `PolicyContext` usaba `authorizedDataScopes` del asistente
- **Inconsistencia:** Runtime usaba `assistant.accountId` pero PolicyContext usaba `targetAccountId`
- **Solución:** Unificar usando campos `ai_include_*` de la cuenta directamente

### **Nuevo Método `resolveBusinessProfile`:**
```typescript
private async resolveBusinessProfile(accountId: string): Promise<FluxPolicyContext['resolvedBusinessProfile']> {
  const [account] = await db
    .select({
      id: accounts.id,
      username: accounts.username,
      displayName: accounts.displayName,
      profile: accounts.profile,
      privateContext: accounts.privateContext,
      avatarAssetId: accounts.avatarAssetId,
      aiIncludeName: accounts.aiIncludeName,        // 🆕
      aiIncludeBio: accounts.aiIncludeBio,          // 🆕
      aiIncludePrivateContext: accounts.aiIncludePrivateContext, // 🆕
    })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  // 🆕 Lógica directa basada en permisos de cuenta
  if (account.aiIncludeName) {
    profile.displayName = account.displayName || account.username;
  }
  if (account.aiIncludeBio) {
    profile.bio = accountProfile.bio || undefined;
  }
  if (account.aiIncludePrivateContext) {
    profile.privateContext = account.privateContext || undefined;
  }
}
```

### **Cambio en Llamada:**
```typescript
// Antes: dependía de authorizedDataScopes del asistente
await this.resolveBusinessProfile(accountId, assistant.authorizedDataScopes ?? [])

// Ahora: usa permisos directos de la cuenta
await this.resolveBusinessProfile(accountId)
```

---

## � **CAMBIO CRÍTICO: Eliminación de authorized_data_scopes (2026-03-22)**

### **Problema Resuelto:**
- **Código Muerto:** `authorized_data_scopes` existía en DB pero no se usaba en `resolveBusinessProfile()`
- **Doble Fuente de Verdad:** Schema tenía el campo pero el código usaba `ai_include_*` flags
- **Inconsistencia:** Query SQL todavía solicitaba el campo eliminado

### **Acciones Realizadas:**
1. **Database:** `ALTER TABLE fluxcore_assistants DROP COLUMN IF EXISTS authorized_data_scopes;`
2. **Schema:** Eliminado `authorizedDataScopes` de `fluxcore-assistants.ts`
3. **Service:** Removida lectura del campo en query SQL (línea 130)
4. **Types:** Limpiada referencia en `policy-context.ts`

### **Query SQL Actualizada:**
```typescript
const assistantResult = await db.execute(sql`
    SELECT id, name, account_id, runtime, status, model_config, 
           external_id  //  authorized_data_scopes eliminado
    FROM fluxcore_assistants
    WHERE account_id = ${accountId} AND status = 'active'
    LIMIT 1
`) as any;
```

### **Comentario Agregado:**
```typescript
/**
 * Visibilidad controlada por ai_include_* en la tabla accounts.
 * Control granular por asistente (authorized_data_scopes) removido 
 * como simplificación consciente — reimplementar si se requiere 
 * multi-asistente con permisos distintos por asistente.
 */
private async resolveBusinessProfile(accountId: string) {
```

### **Impacto:**
- **CERO:** No hay impacto funcional (el campo no se usaba)
- **Limpieza:** Código más simple y consistente
- **Build:** Compila sin errores
- **Runtime:** Eliminado error de query SQL

---

## � **Flujo de Resolución**

### **1. Obtener Política de Cuenta**
```typescript
const policyResult = await db.execute(sql`
    SELECT account_id, mode, response_delay_ms, turn_window_ms, 
           turn_window_typing_ms, turn_window_max_ms, off_hours_policy
    FROM fluxcore_account_policies
    WHERE account_id = ${accountId}
    LIMIT 1
`);
```

### **2. 🆕 Resolución Jerárquica del Modo**
```typescript
let resolvedMode = policyData.mode;
if (contactId) {
    // 🆕 DETECTAR SI ES VISITOR TOKEN (UUID sin relationshipId)
    const isVisitorToken = !contactId.includes('-') || 
                        (contactId.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId));
    
    if (isVisitorToken) {
        console.log(`[FluxPolicyContext] 🎯 VISITOR DETECTED: ${contactId} - buscando regla global`);
        // 🆕 VISITORS: Solo usar regla global (no pueden tener reglas específicas)
        const globalRule = await automationController.getGlobalRule(accountId);
        if (globalRule) {
            console.log(`[FluxPolicyContext] 🎯 REGLA GLOBAL ENCONTRADA: Usando modo '${globalRule.mode}'`);
            resolvedMode = globalRule.mode;
        }
    } else {
        // Lógica existente para relationships
        const relationshipMode = await automationController.getRelationshipMode(accountId, contactId);
        if (relationshipMode) {
            resolvedMode = relationshipMode;
        }
    }
}
```

### **3. Obtener Asistente Activo**
```typescript
const assistantResult = await db.execute(sql`
    SELECT id, name, account_id, runtime, status, model_config, 
           external_id
    FROM fluxcore_assistants
    WHERE account_id = ${accountId} AND status = 'active'
    LIMIT 1
`);
```

---

## 🎯 **Características Clave**

### **🆕 Detección Inteligente de Visitors**
- **UUID Detection:** Identifica visitorTokens por formato (36 chars, UUID pattern)
- **Global Rule Lookup:** Usa `getGlobalRule()` para visitors
- **Fallback Graceful:** Si no hay regla global, usa modo de cuenta

### **📋 Jerarquía de Modos**
```
automation_rules (única fuente de verdad)
├── relationshipId = "rel_xyz" → getRelationshipMode() (chats internos)
├── relationshipId = NULL → getGlobalRule() (perfiles públicos)
└── fluxcore_account_policies.mode (fallback)
```

### **🔍 Logging Detallado**
```typescript
console.log(`[FluxPolicyContext] 🔍 RESOLVIENDO REALIDAD PARA CUENTA: ${accountId}`);
console.log(`[FluxPolicyContext] 🎯 VISITOR DETECTED: ${contactId}`);
console.log(`[FluxPolicyContext] ✅ REALIDAD DEFINIDA: mode=${resolvedMode}`);
```

---

## 📊 **Interacciones con Otros Servicios**

### **Dependencias:**
- `automationController.getRelationshipMode()` - Reglas específicas de relaciones
- `automationController.getGlobalRule()` - Reglas globales (nuevo)
- `fluxcoreAccountPolicies` - Política de cuenta (fallback)

### **Consumidores:**
- `CognitiveDispatcher` - Resuelve contexto para cada turn
- `RuntimeGateway` - Usa configuración para ejecutar IA

---

## 🔧 **Configuración y Parámetros**

### **Input Requerido:**
```typescript
{
    accountId: string;      // Cuenta que responde
    contactId: string;      // ID de relación o visitor token
    channel: string;        // Canal de comunicación
}
```

### **Output Estructurado:**
```typescript
{
    policyContext: {
        accountId: string;
        contactId: string;
        conversationId: string;
        channel: string;
        mode: 'auto' | 'suggest' | 'off';
        responseDelayMs: number;
        turnWindowMs: number;
        // ... más propiedades
    },
    runtimeConfig: {
        assistantId: string;
        model: string;
        provider: string;
        instructions: string;
        // ... más propiedades
    }
}
```

---

## 🚨 **Consideraciones Críticas**

### **Modificación Reciente (2026-03-21):**
- **Cambio:** Detección de visitor tokens y uso de reglas globales
- **Impacto:** Perfiles públicos ahora responden según `automation_rules.global`
- **Validación:** Logs confirman detección y resolución correcta

### **Modos Soportados:**
- **`auto`:** IA responde automáticamente
- **`suggest`:** IA sugiere respuestas para aprobación
- **`off`:** IA no responde (desactivado)

### **Default Behavior:**
- **Sin política:** Crea `createDefaultPolicy()` con `mode: 'off'`
- **Sin regla global:** Usa modo de cuenta como fallback
- **Sin asistente:** Error explícito con logging

---

## 📋 **Estado Actual**

**✅ STABLE** - Funcionando correctamente con:
- **Chats internos:** Modos específicos por relación
- **Perfiles públicos:** Modo global de `automation_rules`
- **Fallbacks:** Modo de cuenta si no hay reglas
- **Logging:** Trazabilidad completa del proceso

**Última actualización:** 2026-03-22 - Eliminación de authorized_data_scopes (código muerto)
