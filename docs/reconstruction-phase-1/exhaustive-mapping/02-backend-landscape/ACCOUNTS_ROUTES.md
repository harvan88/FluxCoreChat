---
id: "accounts-routes"
type: "backend"
status: "stable"
criticality: "medium"
location: "apps/api/src/routes/accounts.routes.ts"
---

# 👤 Accounts Routes

**Ubicación:** `apps/api/src/routes/accounts.routes.ts`  
**Propósito:** API REST para gestión de cuentas de usuario y búsqueda de perfiles  
**Estado:** ✅ STABLE - Funcionalidad completa para búsqueda y gestión  
**Endpoints:** GET /accounts, PATCH /accounts/:id, GET /accounts/search  

---

## 🎯 **Función Principal**

Gestionar las cuentas de usuario (profiles) y proporcionar búsqueda de usuarios por alias, email o nombre para el sistema de contactos.

---

## 🔄 **Endpoints Principales**

### **GET /accounts/search** - Búsqueda de usuarios
```typescript
// 🔍 Endpoint clave para agregar contactos
.get('/search', async ({ user, query, set }) => {
  const searchQuery = query.q?.trim();
  
  if (!searchQuery || searchQuery.length < 2) {
    return { success: true, data: [] };
  }

  const results = await accountService.searchAccounts(searchQuery);
  return { success: true, data: results };
})
```

### **GET /accounts/:id** - Obtener cuenta específica
```typescript
// 📋 Datos completos de perfil
const account = await accountService.getAccountById(params.id);
if (!account) {
  set.status = 404;
  return { success: false, message: 'Account not found' };
}
```

### **PATCH /accounts/:id** - Actualizar perfil
```typescript
// ✏️ Actualización de datos de cuenta
const updatedAccount = await accountService.updateAccount(params.id, body);
return { success: true, data: updatedAccount };
```

---

## 🔍 **Sistema de Búsqueda**

### **Lógica de Búsqueda:**
```typescript
// accountService.searchAccounts(query)
// Busca en: username, displayName, alias
// Retorna: Account[] con coincidencias
```

### **Parámetros de Búsqueda:**
- **Query string:** `?q=nombre_o_alias`
- **Mínimo:** 2 caracteres
- **Campos buscados:** `username`, `displayName`, `alias`

### **Resultados:**
```typescript
{
  success: true;
  data: [{
    id: string;
    username: string;
    displayName: string;
    alias: string;
    profile: object;
    privateContext: string;
    // ... más campos
  }];
}
```

---

## 📊 **Interacciones con Otros Servicios**

### **Dependencias:**
- `accountService.searchAccounts()` - Búsqueda de usuarios
- `accountService.getAccountById()` - Obtener cuenta
- `accountService.updateAccount()` - Actualizar cuenta

### **Consumidores:**
- `AddContactModal.tsx` - Búsqueda para agregar contactos
- `ProfileSection.tsx` - Edición de perfil
- `AccountSwitcher.tsx` - Datos de cuentas

---

## 🔧 **Schema de Datos**

### **Input (PATCH /accounts/:id):**
```typescript
{
  displayName?: string;
  privateContext?: string;
  allowAutomatedUse?: boolean;
  aiIncludeName?: boolean;        // 🆕 Permisos IA
  aiIncludeBio?: boolean;          // 🆕 Permisos IA  
  aiIncludePrivateContext?: boolean; // 🆕 Permisos IA
  alias?: string;
  avatarAssetId?: string;
  // ... más campos
}
```

### **Output (GET /accounts/search):**
```typescript
{
  success: true;
  data: [{
    id: string;
    username: string;
    displayName: string;
    alias: string;
    profile: {
      bio: string;
      website: string;
      // ... más campos
    };
    privateContext: string;
    allowAutomatedUse: boolean;
    aiIncludeName: boolean;
    aiIncludeBio: boolean;
    aiIncludePrivateContext: boolean;
    // ... más campos
  }];
}
```

---

## 🚨 **Consideraciones Críticas**

### **Validación de Búsqueda:**
- **Mínimo 2 caracteres:** Previene búsquedas demasiado amplias
- **Trim automático:** `query.q?.trim()`
- **Empty response:** Array vacío si no hay coincidencias

### **Permisos IA (ai_include_*):**
- **aiIncludeName:** Incluir nombre en prompts de IA
- **aiIncludeBio:** Incluir biografía en prompts de IA  
- **aiIncludePrivateContext:** Incluir contexto privado en prompts de IA
- **Uso:** FluxCore Policy Context para generar respuestas

### **Account Ownership:**
- **JWT validation:** Solo usuarios autenticados
- **Self-modification:** Solo puede editar su propia cuenta
- **Admin permissions:** Endpoint separado para admin

---

## 🔗 **Flujo de Agregar Contactos**

```
Usuario hace click en "Agregar contacto"
    ↓ AddContactModal se abre
    ↓ Usuario escribe búsqueda → onChange con debounce
    ↓ searchAccounts(query) → GET /accounts/search?q=X
    ↓ Backend busca en username, displayName, alias
    ↓ Resultados mostrados en modal
    ↓ Usuario selecciona contacto
    ↓ addContact(accountAId, accountBId) → POST /relationships
    ↓ Backend crea relación entre cuentas
    ↓ ContactsList se recarga automáticamente
```

---

## 📋 **Estado Actual**

**✅ STABLE** - Funcionando correctamente con:
- **Búsqueda de usuarios:** Coincidencias precisas en múltiples campos
- **Gestión de perfil:** Actualización completa de datos
- **Validación:** Permisos y ownership correctos
- **Integración:** Funciona perfectamente con ContactsList

**Última actualización:** 2026-03-22 - Verificación de integración con ContactsList

---

## 🎯 **Validación del Sistema**

### **Test Cases Verificados:**
- ✅ **Búsqueda por alias:** Encuentra usuarios por @alias
- ✅ **Búsqueda por nombre:** Encuentra por displayName
- ✅ **Búsqueda corta:** < 2 chars retorna array vacío
- ✅ **Búsqueda sin resultados:** Array vacío, no error
- ✅ **Actualización de perfil:** Todos los campos actualizan correctamente
- ✅ **Permisos IA:** ai_include_* persisten y son usados por PolicyContext

---

## 🔌 **Middleware y Autenticación**

### **Protección:**
```typescript
.use(authMiddleware)
```

### **Validación:**
- **JWT requerido:** `user` object disponible
- **Account ownership:** Solo puede editar sus propias cuentas
- **Rate limiting:** Considerar para endpoints públicos como /search

---

## 📊 **Métricas de Uso**

### **Endpoints más utilizados:**
1. **GET /accounts/search** - Para agregar contactos
2. **PATCH /accounts/:id** - Edición de perfil
3. **GET /accounts/:id** - Carga de datos específicos

### **Integraciones clave:**
- **ContactsList:** Flujo completo de agregar contactos
- **ProfileSection:** Edición de perfil de usuario
- **FluxCore Policy Context:** Usa ai_include_* para prompts
