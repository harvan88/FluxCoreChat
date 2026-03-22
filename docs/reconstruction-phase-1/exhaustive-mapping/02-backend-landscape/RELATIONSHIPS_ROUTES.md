---
id: "relationships-routes"
type: "backend"
status: "stable"
criticality: "high"
location: "apps/api/src/routes/relationships.routes.ts"
---

# 🔗 Relationships Routes

**Ubicación:** `apps/api/src/routes/relationships.routes.ts`  
**Propósito:** API REST para gestión de relaciones entre actores y enriquecimiento de contactos  
**Estado:** ✅ STABLE - Recientemente corregido para filtrar visitor actors  
**Endpoints:** GET /relationships, POST /relationships, GET /:contactId/interactions  

---

## 🎯 **Función Principal**

Gestionar las relaciones entre actores (cuentas y visitors) y proporcionar datos enriquecidos para el frontend, incluyendo nombres de contacto, avatares y perfiles.

---

## 🔥 **CAMBIO RECIENTE: Filtro de Visitor Actors (2026-03-22)**

### **Problema Resuelto:**
- **Error 500:** `resolveAccountId()` devolvía `null` para visitor actors
- **Causa:** Actors con `account_id = NULL` referenciados en relationships
- **Impacto:** ContactsList mostraba error 500 al cargar contactos

### **Solución Implementada:**
```typescript
// 🆕 Filtrar relaciones con visitor actors
const otherAccountId = await resolveAccountId(otherActorId);

// Skip relationships where the other actor has no account (visitor actors)
if (!otherAccountId) {
  return null;
}

// 🆕 Filtrar resultados nulos
const validRelationships = enrichedRelationships.filter(rel => rel !== null);
```

---

## 🔄 **Endpoints Principales**

### **GET /relationships** - Listar relaciones con enriquecimiento
```typescript
// 🆕 Con soporte para accountId específico
const { accountId } = query;

// 🆕 Verificación de ownership
if (!userAccountIds.includes(accountId)) {
  set.status = 403;
  return { success: false, message: 'Account does not belong to user' };
}

// 🆕 Enriquecimiento con avatar y perfil
const presentedAccount = await presentAccountWithAvatar(otherAccount, { actorId: user.id });
```

### **POST /relationships** - Crear nueva relación
```typescript
const relationship = await relationshipService.createRelationship(
  body.accountAId,
  body.accountBId
);
```

### **GET /:contactId/interactions** - Historial de interacciones
```typescript
// 🆕 Filtra por relationshipId
const convs = await db
  .select()
  .from(conversations)
  .where(eq(conversations.relationshipId, relationship.id))
  .limit(1);
```

---

## 📊 **Interacciones con Otros Servicios**

### **Dependencias:**
- `relationshipService.getRelationshipsByAccountId()` - Obtener relaciones
- `resolveActorId()` / `resolveAccountId()` - Conversión actor ↔ account
- `accountService.getAccountById()` - Datos de cuenta
- `presentAccountWithAvatar()` - Avatar firmado

### **Consumidores:**
- `ContactsList.tsx` - Componente UI de lista de contactos
- `ContactDetails.tsx` - Vista detallada de contacto
- `AddContactModal` - Modal para agregar nuevos contactos

---

## 🔧 **Schema de Datos**

### **Input (POST /relationships):**
```typescript
{
  accountAId: string;  // Primera cuenta
  accountBId: string;  // Segunda cuenta
}
```

### **Output (GET /relationships):**
```typescript
{
  success: true;
  data: [{
    id: string;
    actorAId: string;
    actorBId: string;
    contactName: string;        // 🆕 Enriched
    contactAccountId: string;  // 🆕 Enriched
    contactAvatar: string;     // 🆕 Enriched
    contactProfile: object;    // 🆕 Enriched
    perspectiveA: object;
    perspectiveB: object;
    context: object;
    createdAt: string;
    lastInteraction: string;
  }];
}
```

---

## 🚨 **Consideraciones Críticas**

### **Actor Model Integration:**
- **Actores sin cuenta:** Visitors (`actorType='visitor'`)
- **Actores con cuenta:** Cuentas reales (`actorType='account'`)
- **Conversión automática:** `resolveActorId()` ↔ `resolveAccountId()`

### **Filtrado de Visitor Actors:**
- **Skip lógico:** `if (!otherAccountId) return null;`
- **Filter final:** `.filter(rel => rel !== null)`
- **Resultado:** Solo relaciones entre cuentas reales

### **Enriquecimiento de Contactos:**
- **Avatares firmados:** URLs temporales via `presentAccountWithAvatar`
- **Perfiles completos:** `displayName`, `bio`, `avatarUrl`
- **Fallbacks:** `contactName: 'Desconocido'` si no hay datos

---

## 📋 **Estado Actual**

**✅ STABLE** - Funcionando correctamente con:
- **Listado de contactos:** Sin error 500, filtra visitors correctamente
- **Creación de relaciones:** Genera conversación automáticamente
- **Enriquecimiento:** Avatares firmados y perfiles completos
- **Validación de ownership:** Solo muestra relaciones del usuario

**Corrección aplicada:** 2026-03-22 - Filtro de visitor actors implementado

---

## 🔗 **Flujo Completo**

```
Frontend ContactsList
    ↓ GET /relationships?accountId=X
    ↓ relationshipService.getRelationshipsByAccountId()
    ↓ resolveAccountId() → account o null
    ↓ 🆕 if null → skip (visitor actor)
    ↓ accountService.getAccountById()
    ↓ presentAccountWithAvatar()
    ↓ Frontend muestra contactos válidos
```

---

## 🎯 **Validación del Sistema**

### **Test Cases Verificados:**
- ✅ **Cuenta con múltiples relaciones:** Muestra todas las válidas
- ✅ **Cuenta sin relaciones:** Retorna array vacío
- ✅ **AccountId ajeno:** Error 403 (no pertenece al usuario)
- ✅ **Visitor actors:** Filtrados correctamente
- ✅ **Avatares:** URLs firmadas generadas

**Última actualización:** 2026-03-22 - Corrección de visitor actors implementada
