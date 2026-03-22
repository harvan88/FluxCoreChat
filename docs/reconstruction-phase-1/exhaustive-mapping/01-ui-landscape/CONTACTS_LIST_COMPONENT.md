---
id: "contacts-list-component"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/contacts/ContactsList.tsx"
---

# 👥 Contacts List Component

**Ubicación:** `apps/web/src/components/contacts/ContactsList.tsx`  
**Propósito:** Lista de contactos con búsqueda, agregación y gestión de relaciones  
**Estado:** ✅ STABLE - Funcionando correctamente después de corrección backend  
**Responsable:** UI principal para gestión de contactos y relaciones  

---

## 🎯 **Función Principal**

Mostrar lista de contactos (relaciones) del usuario con capacidades de búsqueda, agregación de nuevos contactos y eliminación de relaciones existentes.

---

## 🔥 **PROBLEMA RESUELTO: Error 500 en Carga (2026-03-22)**

### **Síntoma:**
- Frontend mostraba: "Error del servidor: 500 Internal Server Error"
- Causa: `GET /relationships` fallaba con visitor actors en DB

### **Solución Backend:**
- **Filtrado visitor actors:** `if (!otherAccountId) return null;`
- **Componente sin cambios:** El problema estaba en backend, no en frontend

---

## 🔄 **Arquitectura del Componente**

### **Estado Principal:**
```typescript
const [contacts, setContacts] = useState<Relationship[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [showAddModal, setShowAddModal] = useState(false);
```

### **Hooks Utilizados:**
- `useUIStore()` - `selectedAccountId`, `loadConversations()`
- `usePanelStore()` - `openTab()` para detalles de contacto
- `api.getRelationships()` - Llamada a backend
- `api.addContact()` - Crear nueva relación

---

## 📋 **Flujos de Interacción**

### **1. Carga Inicial:**
```typescript
// Al montar o cambiar cuenta
useEffect(() => {
  if (!hasLoaded) {
    loadContacts();
  }
}, [hasLoaded, loadContacts]);

// Reset al cambiar cuenta
useEffect(() => {
  setHasLoaded(false);
  setContacts([]);
}, [selectedAccountId]);
```

### **2. Búsqueda de Contactos:**
```typescript
// Input de búsqueda local (no backend)
const filteredContacts = contacts.filter((contact) => {
  if (!searchQuery) return true;
  const search = searchQuery.toLowerCase();
  return (
    contact.accountBId?.toLowerCase().includes(search) ||
    contact.perspectiveA?.savedName?.toLowerCase().includes(search)
  );
});
```

### **3. Agregar Contacto:**
```typescript
// 1. Abrir modal
const handleAddContact = () => setShowAddModal(true);

// 2. Modal: AddContactModal
//    - Busca usuarios: api.searchAccounts(query)
//    - Crea relación: api.addContact(currentAccountId, targetAccountId)
//    - Recarga lista: loadContacts(true)
```

### **4. Eliminar Contacto:**
```typescript
const handleDeleteContact = async (contactId: string) => {
  const response = await api.deleteContact(contactId);
  if (response.success) {
    loadContacts(true); // Recargar
    loadConversations(); // Actualizar conversaciones
  }
};
```

---

## 🔌 **Integración con Backend**

### **API Calls:**
```typescript
// Cargar contactos
const response = await api.getRelationships(selectedAccountId);

// Buscar usuarios para agregar
const response = await api.searchAccounts(searchQuery);

// Agregar contacto
const response = await api.addContact(currentAccountId, targetAccountId);

// Eliminar contacto
const response = await api.deleteContact(contactId);
```

### **Endpoints Backend:**
- **GET /relationships?accountId=X** - Lista de relaciones
- **GET /accounts/search?q=query** - Búsqueda de usuarios
- **POST /relationships** - Crear relación
- **DELETE /relationships/:id** - Eliminar relación

---

## 🎨 **Estructura UI**

### **Componentes Principales:**
```typescript
// Header con búsqueda y botón agregar
<div className="p-3">
  <input placeholder="Buscar contactos..." />
  <button onClick={handleAddContact}>
    <UserPlus size={18} />
    Agregar contacto
  </button>
</div>

// Lista de contactos
<div className="flex-1 overflow-y-auto">
  {contacts.map(contact => (
    <ContactItem 
      key={contact.id}
      contact={contact}
      onDelete={handleDeleteContact}
    />
  ))}
</div>
```

### **Estados de Loading/Error:**
```typescript
{isLoading && <Loader2 className="w-6 h-6 animate-spin" />}
{error && <div className="text-error">{error}</div>}
{!isLoading && !error && contacts.length === 0 && (
  <div className="text-muted">No hay contactos</div>
)}
```

---

## 📱 **Subcomponentes**

### **AddContactModal:**
- **Búsqueda:** `api.searchAccounts()` con debounce
- **Resultados:** Lista de usuarios encontrados
- **Acción:** `api.addContact()` al seleccionar
- **Feedback:** Estados de loading y éxito/error

### **ContactItem:**
- **Avatar:** `Avatar` component con iniciales
- **Info:** `displayName`, `@alias`
- **Acciones:** Click para abrir detalles, botón eliminar

---

## 🔄 **Flujo Completo**

```
Usuario selecciona cuenta
    ↓ ContactsList se monta
    ↓ loadContacts() → GET /relationships?accountId=X
    ↓ Backend filtra visitor actors
    ↓ Frontend muestra contactos válidos
    ↓ Usuario busca localmente (no backend)
    ↓ Usuario hace click en "Agregar contacto"
    ↓ AddContactModal se abre
    ↓ Usuario escribe → searchAccounts() → GET /accounts/search?q=X
    ↓ Usuario selecciona → addContact() → POST /relationships
    ↓ Backend crea relación + conversación
    ↓ loadContacts(true) → Recargar lista
```

---

## 🚨 **Consideraciones Críticas**

### **Account Switching:**
- **Reset automático:** `setHasLoaded(false)` al cambiar `selectedAccountId`
- **Prevención duplicados:** `if (isLoading || (hasLoaded && !force)) return`

### **Error Handling:**
- **Backend errors:** Mostrados en UI con estado `error`
- **Network errors:** Try/catch en cada API call
- **Empty state:** Mensaje amigable cuando no hay contactos

### **Performance:**
- **Búsqueda local:** Sin llamadas backend, filtering en frontend
- **Debounce search:** 300ms delay en AddContactModal
- **Lazy loading:** Solo carga cuando `hasLoaded` es false

---

## 📋 **Estado Actual**

**✅ STABLE** - Funcionando correctamente con:
- **Carga de contactos:** Sin error 500, filtra visitors
- **Búsqueda:** Local, responsiva
- **Agregar:** Modal funcional con búsqueda real
- **Eliminar:** Confirmación y recarga automática
- **Account switching:** Reset correcto de estado

**Última actualización:** 2026-03-22 - Verificación post-corrección backend

---

## 🔗 **Dependencias del Sistema**

### **Servicios Backend:**
- `relationships.routes.ts` - Lista y gestión de relaciones
- `accounts.routes.ts` - Búsqueda de usuarios
- `actor-resolver.ts` - Conversión actor ↔ account

### **Componentes UI:**
- `Avatar` - Avatares con iniciales
- `Button` - Botones de acción
- `Input` - Campo de búsqueda
- `Modal` - AddContactModal

### **Stores Globales:**
- `useUIStore` - Estado de cuenta seleccionada
- `usePanelStore` - Navegación y tabs
