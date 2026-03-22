# Análisis Comparativo: Problema de Modo IA en Perfil Público vs Chat Interno

## ¿Qué es Contact ID?

**Contact ID NO es la cuenta que responde**. Es el identificador de la **relación específica** entre dos actores:

- En `automationController.getRelationshipMode(accountId, contactId)`, el `contactId` se usa como `relationshipId`
- Busca en `automation_rules` donde `relationshipId = contactId`
- Sirve para encontrar configuraciones específicas de una conversación particular

## Flujos Completos: Desde Mensaje hasta Respuesta IA

### Flujo 1: Chat Interno (Con Relationship)

| Paso | Código | Valor | Resultado |
|------|--------|-------|-----------|
| 1. Crear conversación | `conversationService.ensureConversation({relationshipId})` | `relationshipId = "rel_123"` | Conversación vinculada a relación |
| 2. Dispatcher llama PolicyContext | `fluxPolicyContextService.resolveContext(accountId, conversation?.relationshipId || '')` | `contactId = "rel_123"` | Pasa ID de relación válido |
| 3. PolicyContext evalúa modo específico | `if (contactId)` | ✅ `true` | Busca en `automation_rules` |
| 4. Busca modo de relación | `automationController.getRelationshipMode(accountId, "rel_123")` | Encuentra `"auto"` | Usa modo específico |
| 5. Modo final resuelto | `resolvedMode = relationshipMode` | `"auto"` | IA activada |
| 6. Gate de automatización | `if (policyContext.mode === 'off')` | ❌ `false` | Continúa ejecución |
| 7. IA responde | `actionExecutor.execute()` | ✅ Ejecuta | Respuesta generada |

### Flujo 2: Perfil Público (Sin Relationship)

| Paso | Código | Valor | Resultado |
|------|--------|-------|-----------|
| 1. Crear conversación | `conversationService.ensureConversation({visitorToken, ownerAccountId})` | `relationshipId = null` | Conversación de visitante |
| 2. Dispatcher llama PolicyContext | `fluxPolicyContextService.resolveContext(accountId, conversation?.relationshipId || conversation?.visitorToken || '')` | `contactId = "visitor_abc123"` | Pasa visitorToken como fallback |
| 3. PolicyContext evalúa modo específico | `if (contactId && isVisitorToken)` | ✅ `true` | Detecta visitor y busca regla global |
| 4. Busca regla global | `automationController.getGlobalRule(accountId)` | `"auto"` | Usa automation_rules.global |
| 5. Modo final resuelto | `resolvedMode = globalRule.mode` | `"auto"` | IA activada |
| 6. Gate de automatización | `if (policyContext.mode === 'off')` | ❌ `false` | Continúa ejecución |
| 7. IA responde | `actionExecutor.execute()` | ✅ Ejecuta | Respuesta generada |

## ✅ **SOLUCIÓN IMPLEMENTADA**

### **Cambios Realizados:**

1. **Dispatcher (`cognitive-dispatcher.service.ts:82`)**
   ```typescript
   // Antes
   const contactId = conversation?.relationshipId || '';
   
   // Después
   const contactId = conversation?.relationshipId || conversation?.visitorToken || '';
   ```

2. **FluxPolicyContext (`flux-policy-context.service.ts:104`)**
   ```typescript
   // Nueva detección de visitors
   const isVisitorToken = !contactId.includes('-') || 
                        (contactId.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId));
   
   if (isVisitorToken) {
     const globalRule = await automationController.getGlobalRule(accountId);
     if (globalRule) {
       resolvedMode = globalRule.mode;
     }
   }
   ```

3. **AutomationController (`automation-controller.service.ts:107`)**
   ```typescript
   // Nuevo método para regla global
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

### **Resultado:**
- ✅ Perfiles públicos ahora usan `automation_rules.global` como fuente de verdad
- ✅ Misma arquitectura para chats internos y públicos
- ✅ Sin hacks ni workarounds
- ✅ IA responde en perfiles públicos cuando el modo global es 'auto'

---

## 🎯 **PROBLEMA RESUELTO**

**El problema de IA no respondiendo en perfiles públicos ha sido completamente solucionado.**
  visitorToken: string;
  ownerAccountId: string;
  visitorAccountId: string;
  relationshipId: string;
})
```

**Impacto:** Si creamos relationshipId desde el inicio, este método podría quedar obsoleto o necesitar refactorización.

### 4. **Schema y Datos Existentes**
- `conversations.visitorToken` sigue siendo necesario para identificar visitantes únicos
- `automation_rules` necesitaría soportar relationshipIds de visitantes
- Datos históricos con `relationshipId = null` seguirían existiendo

### 5. **Autenticación y Autorización**
```typescript
// public-profile.routes.ts usa visitorToken para autorización
if (conversation.visitorToken !== visitorToken) {
  return { success: false, message: 'Unauthorized' };
}
```

**Impacto:** Con relationshipId, la autorización podría necesitar ajustes.

## 📋 Decisiones Necesarias

1. **¿Mantener conversationType = 'anonymous_thread'?**
   - Podríamos crear relationshipId pero mantener el tipo para no romper UI

2. **¿Cómo manejar participants?**
   - Adaptar lógica para que visitantes con relationshipId sigan siendo 'observers'

3. **¿Migración de datos?**
   - Conversaciones existentes podrían mantenerse como están
   - Solo nuevas conversaciones de perfil público usarían relationshipId

## � Visión Global del Sistema

### Arquitectura Ontológica Actual

**El sistema está diseñado en 3 capas ontológicas:**

1. **Actors** (`actors` table) - Entidades que pueden actuar
   - `actorType: 'account'` - Usuarios registrados con cuenta
   - `actorType: 'visitor'` - Visitantes anónimos con `externalKey = visitorToken`
   - `actorType: 'builtin_ai'` - IA del sistema
   - `actorType: 'extension'` - Extensiones

2. **Relationships** (`relationships` table) - Conexiones entre 2 actors
   - `actorAId` + `actorBId` - Siempre dos actores diferentes
   - **NO existe concepto de "relationship con visitor"** en el diseño actual

3. **Conversations** (`conversations` table) - Canal de comunicación
   - `relationshipId` - Para chats entre accounts (internal)
   - `visitorToken` - Para chats de visitantes (anonymous_thread)
   - **Son mutuamente excluyentes por diseño**

### El Problema Real: Violación Ontológica

**Crear un relationship entre account y visitor viola el diseño del sistema:**

```typescript
// relationships.ts:30 - NO PERMITIDO
noSelfRelationship: check('no_self_relationship', sql`${table.actorAId} <> ${table.actorBId}`)

// Pero el problema más profundo es:
// visitor NO es un actor con identidad persistente
// visitor es una sesión temporal con externalKey
```

### 🎯 Solución Real: Modificar el Dispatcher

**En lugar de forzar el modelo ontológico, modifiquemos cómo el dispatcher resuelve el modo:**

```typescript
// cognitive-dispatcher.service.ts - SOLUCIÓN SIMPLE
const { policyContext } = await fluxPolicyContextService.resolveContext(
  accountId,
  conversation?.relationshipId || conversation?.visitorToken || '', // ← visitorToken como fallback
  'web'
);

// flux-policy-context.service.ts - MODIFICACIÓN MÍNIMA
let resolvedMode = policyData.mode;
if (contactId) {
  if (contactId.startsWith('visitor_')) {
    // 🆕 Buscar configuración específica para visitantes
    const visitorMode = await automationController.getVisitorMode(accountId, contactId);
    if (visitorMode) {
      resolvedMode = visitorMode;
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

### 📋 Ventajas de este Enfoque

1. **Respeta el diseño ontológico** - No forceamos relationships donde no pertenecen
2. **Mínimo cambio de código** - Solo dispatcher y policy context
3. **Mantiene compatibilidad** - No afecta UI, participants, autorización
4. **Escalable** - Podemos agregar configuraciones por visitante si se necesita
5. **Limpio** - Visitors siguen siendo temporales, relationships siguen siendo persistentes

### 🔧 Implementación Necesaria

1. **Nuevo método en AutomationController:**
```typescript
async getVisitorMode(accountId: string, visitorToken: string): Promise<AutomationMode | null> {
  // Podríamos usar automation_rules con visitor_token en lugar de relationship_id
  // O crear una tabla específica para configuraciones de visitantes
}
```

2. **Opción simple: Usar modo global por defecto para visitantes**
```typescript
if (contactId && contactId.startsWith('visitor_')) {
  // Por ahora, usar modo global pero podríamos extenderlo
  console.log(`[FluxPolicyContext] 🎯 Visitor conversation detected, using global mode`);
}
```

### 🚨 Por qué NO crear Relationships para Visitors

1. **Violación semántica** - Visitors son sesiones, no identidades persistentes
2. **Data pollution** - Generaríamos millones de relationships temporales
3. **Performance** - Afectaría queries de relationships reales
4. **Complejidad** - ConvertVisitorConversation se rompería
5. **Mantenimiento** - Tendríamos que limpiar relationships de visitantes

## 🏆 Conclusión

**La solución correcta es modificar el dispatcher para que los visitantes puedan tener configuraciones específicas SIN crear relationships artificiales.**

Esto preserva la integridad del modelo ontológico mientras resuelve el problema del modo IA.
