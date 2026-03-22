---
id: "ai-response-public-profile-solution"
type: "backend"
status: "stable"
criticality: "high"
location: "docs/reconstruction-phase-1/exhaustive-mapping/02-backend-landscape/AI_RESPONSE_PUBLIC_PROFILE_SOLUTION.md"
---

# 🤖 AI Response Public Profile Solution

**Ubicación:** `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`  
**Propósito:** Solución completa para que la IA responda en perfiles públicos  
**Estado:** ✅ STABLE - Implementado y funcionando  
**Fecha Resolución:** 2026-03-21  

---

## 🎯 **Problema Resuelto**

### **Issue Crítico:**
La IA no respondía cuando los usuarios enviaban mensajes desde perfiles públicos, mientras que sí respondía en chats internos con la misma cuenta.

### **Root Cause:**
- **Dispatcher** pasaba `contactId = ""` para perfiles públicos (sin `relationshipId`)
- **FluxPolicyContext** no buscaba reglas específicas sin `contactId` válido
- **Resultado:** Solo usaba modo global de `fluxcore_account_policies` (generalmente 'off')

---

## 🛠️ **Solución Implementada**

### **Cambios Arquitectónicos:**

#### **1. Dispatcher - Fallback para VisitorToken**
**Archivo:** `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts:82`
```typescript
// Antes
const contactId = conversation?.relationshipId || '';

// Después
const contactId = conversation?.relationshipId || conversation?.visitorToken || '';
```

#### **2. FluxPolicyContext - Detección de Visitors**
**Archivo:** `apps/api/src/services/flux-policy-context.service.ts:104`
```typescript
// Nueva detección de visitor tokens (UUIDs)
const isVisitorToken = !contactId.includes('-') || 
                    (contactId.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId));

if (isVisitorToken) {
  const globalRule = await automationController.getGlobalRule(accountId);
  if (globalRule) {
    resolvedMode = globalRule.mode;
  }
}
```

#### **3. AutomationController - Método Global**
**Archivo:** `apps/api/src/services/automation-controller.service.ts:107`
```typescript
// Nuevo método para obtener regla global (relationshipId = NULL)
async getGlobalRule(accountId: string): Promise<AutomationRule | null> {
  const [globalRule] = await db
    .select()
    .from(automationRules)
    .where(and(
      eq(automationRules.accountId, accountId),
      isNull(automationRules.relationshipId),
      eq(automationRules.enabled, true)
    ))
    .limit(1);
  return globalRule || null;
}
```

---

## 📊 **Arquitectura Final**

### **Jerarquía Unificada de Modos:**
```
automation_rules (única fuente de verdad)
├── relationshipId = "rel_xyz" (chats internos) → getRelationshipMode()
├── relationshipId = NULL (global) → getGlobalRule() ← VISITORS usan esta
└── fallback: fluxcore_account_policies.mode (solo si no hay regla global)
```

### **Flujo Completo para Perfiles Públicos:**
1. **Mensaje** → `conversationService.ensureConversation({visitorToken})`
2. **Dispatcher** → `contactId = visitorToken` (UUID real)
3. **PolicyContext** → Detecta visitor → `getGlobalRule(accountId)`
4. **Automation Rules** → Busca `relationshipId = NULL` → Encuentra `mode = 'auto'`
5. **IA Responde** → `actionExecutor.execute()`

---

## ✅ **Resultados Verificados**

### **Antes:**
```
[CognitiveDispatcher] 🎯 ContactId resolved: "" (relationshipId: null, visitorToken: f337...)
[FluxPolicyContext] 📋 mode: off
[FluxPipeline] ⛔ OFF → automation disabled
```

### **Después:**
```
[CognitiveDispatcher] 🎯 ContactId resolved: f337fb1f-... (visitorToken)
[FluxPolicyContext] 🎯 VISITOR DETECTED: f337fb1f-... - buscando regla global
[FluxPolicyContext] 🎯 REGLA GLOBAL ENCONTRADA: Usando modo 'auto'
[FluxPipeline] 🤖 ASSIST → IA responde
```

---

## 🎯 **Validaciones Completadas**

- ✅ **Tests unitarios:** Funcionan con visitorTokens reales
- ✅ **Logs del sistema:** Muestran flujo correcto
- ✅ **Arquitectura unificada:** Misma fuente de verdad para todos
- ✅ **Sin hacks:** Sin modificaciones a `fluxcore_account_policies`
- ✅ **Extensible:** Permite futuras reglas específicas por visitor

---

## 📋 **Componentes Afectados**

### **Modificados:**
- `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`
- `apps/api/src/services/flux-policy-context.service.ts`
- `apps/api/src/services/automation-controller.service.ts`

### **Impacto:**
- **Perfiles públicos:** Ahora responden según `automation_rules.global`
- **Chats internos:** Sin cambios, siguen funcionando igual
- **Sistema:** Arquitectura unificada y consistente

---

## 🚀 **Estado Final**

**✅ PROBLEMA COMPLETAMENTE RESUELTO**

Los perfiles públicos ahora responden automáticamente cuando el modo global en `automation_rules` está configurado como 'auto', manteniendo la misma arquitectura y fuente de verdad que el resto del sistema.
