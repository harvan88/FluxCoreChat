---
id: "automation-controller-service"
type: "backend"
status: "stable"
criticality: "high"
location: "apps/api/src/services/automation-controller.service.ts"
---

# 🤖 Automation Controller Service

**Ubicación:** `apps/api/src/services/automation-controller.service.ts`  
**Propósito:** Control central de modos de automatización y reglas específicas  
**Estado:** ✅ STABLE - Recientemente extendido con método para reglas globales  
**Responsable:** Gestión de modos auto/suggest/off por account y relationship  

---

## 🎯 **Función Principal**

Controla el comportamiento de automatización del sistema, permitiendo configuraciones globales por cuenta y reglas específicas por conversación.

---

## 🔄 **Métodos Principales**

### **1. getRelationshipMode()**
```typescript
async getRelationshipMode(accountId: string, relationshipId: string): Promise<AutomationMode | null> {
  const [rule] = await db
    .select()
    .from(automationRules)
    .where(and(
      eq(automationRules.accountId, accountId),
      eq(automationRules.relationshipId, relationshipId),
      eq(automationRules.enabled, true)
    ))
    .limit(1);
  
  return (rule?.mode as AutomationMode) || null;
}
```

### **2. 🆕 getGlobalRule()**
```typescript
async getGlobalRule(accountId: string): Promise<AutomationRule | null> {
  const [globalRule] = await db
    .select()
    .from(automationRules)
    .where(and(
      eq(automationRules.accountId, accountId),
      isNull(automationRules.relationshipId),  // ← Clave: NULL = global
      eq(automationRules.enabled, true)
    ))
    .limit(1);

  return globalRule || null;
}
```

### **3. getEffectiveRule()**
```typescript
async getEffectiveRule(accountId: string, relationshipId?: string): Promise<AutomationRule | null> {
  // Primero buscar regla específica del relationship
  if (relationshipId) {
    const [relationshipRule] = await db
      .select()
      .from(automationRules)
      .where(and(
        eq(automationRules.accountId, accountId),
        eq(automationRules.relationshipId, relationshipId),
        eq(automationRules.enabled, true)
      ))
      .limit(1);

    if (relationshipRule) {
      return relationshipRule;
    }
  }

  // Luego buscar regla global del account
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

## 🎯 **Características Clave**

### **🆕 Soporte para Reglas Globales**
- **`relationshipId = NULL`:** Representa configuración global del account
- **Jerarquía clara:** Specific > Global > Default
- **Uso para Visitors:** Perfiles públicos usan reglas globales

### **📋 Modos Soportados**
```typescript
export type AutomationMode = 'auto' | 'suggest' | 'off';
```

### **🔍 Schema de Reglas**
```typescript
export const automationRules = pgTable('automation_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull(),
  relationshipId: uuid('relationship_id') // ← NULL = global
    .references(() => relationships.id, { onDelete: 'cascade' }),
  mode: varchar('mode', { length: 20 }).notNull().default('suggest'),
  enabled: boolean('enabled').notNull().default(true),
  config: jsonb('config').$type<AutomationConfig>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## 📊 **Interacciones con Otros Servicios**

### **Consumidores:**
- `FluxPolicyContextService` - Resuelve modo para políticas
- `CognitionWorker` - Evalúa triggers de automatización
- `MessageCore` - Aplica reglas a mensajes

### **Base de Datos:**
- **automation_rules** - Almacenamiento de reglas
- **relationships** - Referencia para reglas específicas
- **accounts** - Scope de reglas

---

## 🔧 **Configuración y Parámetros**

### **Tipos de Reglas:**
```typescript
interface AutomationConfig {
  triggers?: AutomationTrigger[];
  conditions?: AutomationCondition[];
  delayMs?: number;
  extensionId?: string | null;
  rateLimit?: number;
}

interface AutomationTrigger {
  type: 'message_received' | 'keyword' | 'schedule' | 'webhook';
  value?: string;
  metadata?: Record<string, unknown>;
}
```

### **Prioridad de Resolución:**
1. **Regla Específica:** `relationshipId` coincide
2. **Regla Global:** `relationshipId = NULL`
3. **Default:** Modo 'off' (sin regla)

---

## 🚨 **Consideraciones Críticas**

### **Modificación Reciente (2026-03-21):**
- **Nuevo método:** `getGlobalRule()` para reglas globales
- **Impacto:** Perfiles públicos ahora pueden usar configuración global
- **Validación:** Tests confirman funcionamiento con `relationshipId = NULL`

### **Constraints Importantes:**
- **FK Constraint:** `relationshipId` debe referenciar `relationships.id`
- **NULL Permitido:** `relationshipId = NULL` para reglas globales
- **Enabled Filter:** Solo reglas activas (`enabled = true`)

### **Performance:**
- **Indexado:** Por `accountId` y `relationshipId`
- **Queries:** Optimizadas con `LIMIT 1`
- **Caching:** Sin caché implementado (stateless)

---

## 📋 **Estado Actual**

**✅ STABLE** - Funcionando correctamente con:
- **Reglas específicas:** Por conversación/relación
- **Reglas globales:** Por cuenta (para visitors)
- **Jerarquía completa:** Specific > Global > Default
- **Todos los modos:** auto/suggest/off

**Última actualización:** 2026-03-21 - Método `getGlobalRule()` implementado
