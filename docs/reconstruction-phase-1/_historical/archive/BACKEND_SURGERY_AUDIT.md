# AUDITORÍA QUIRÚRGICA BACKEND - HITO 28

> **Fecha:** 2024-12-09 08:51 UTC-3
> **Estado:** 🟡 EN PROGRESO - Mensajería backend funciona, frontend pendiente

---

## 🚨 DIAGNÓSTICO ACTUAL

### SÍNTOMAS REPORTADOS
1. **POST /messages → 400 Bad Request** - No se pueden enviar mensajes
2. **"No hay cuenta activa"** - `selectedAccountId` no se setea
3. **Click conversación → Pantalla negra** - Error en renderizado
4. **Mensajes hardcodeados** - Frontend no lee de BD
5. **Mensajes no persisten** - Relacionado a POST /messages 400

### CAUSA RAÍZ IDENTIFICADA

**DESINCRONIZACIÓN SCHEMA ↔ CÓDIGO**

El schema de Drizzle se modificó (eliminando `status`, `alias`, `actorType`) pero el código de servicios aún los usa:

| Archivo | Campo Muerto | Líneas |
|---------|--------------|--------|
| `message.service.ts` | `status` | 2, 17, 28, 56, 71-79, 84-95, 100-110, 116-130 |
| `message.service.ts` | `MessageStatus` type | 2 |
| `account.service.ts` | `alias` | ✅ FIXED |
| `actors` schema | `actorType` | ✅ FIXED |

---

## 📋 PLAN DE CORRECCIÓN

### FASE 1: Eliminar referencias a campos muertos [URGENTE]

| ID | Tarea | Archivo | Estado |
|----|-------|---------|--------|
| SRG-001 | Eliminar `status` de `createMessage` | message.service.ts | ⏳ |
| SRG-002 | Eliminar `MessageStatus` import | message.service.ts | ⏳ |
| SRG-003 | Eliminar métodos `updateStatus`, `getMessagesByStatus`, `getPendingMessages`, `markAsSeen` | message.service.ts | ⏳ |
| SRG-004 | Verificar que `@fluxcore/db` exports no incluyan tipos muertos | packages/db/src/schema/messages.ts | ⏳ |

### FASE 2: Corregir selectedAccountId en Frontend

| ID | Tarea | Archivo | Estado |
|----|-------|---------|--------|
| SRG-005 | Asegurar que login setea `selectedAccountId` en uiStore | auth hooks/login | ⏳ |
| SRG-006 | Verificar que ContactsList usa `selectedAccountId` correctamente | ContactsList.tsx | ⏳ |
| SRG-007 | Verificar que ChatView obtiene `senderAccountId` correctamente | ChatView.tsx/useChat.ts | ⏳ |

### FASE 3: Verificar flujo de mensajería

| ID | Tarea | Verificación |
|----|-------|--------------|
| SRG-008 | GET /conversations/:id/messages retorna mensajes | curl test |
| SRG-009 | POST /messages inserta mensaje en BD | curl test |
| SRG-010 | Frontend lee mensajes reales, no hardcoded | Network tab |
| SRG-011 | WebSocket notifica nuevos mensajes | Console log |

---

## 🔧 CORRECCIONES DETALLADAS

### SRG-001/002/003: message.service.ts

**ANTES:**
```typescript
import { messages, type MessageContent, type MessageStatus } from '@fluxcore/db';

async createMessage(data: {
  // ...
  status?: MessageStatus;
}) {
  // ...
  status: data.status || 'synced',
}

async updateStatus(messageId: string, status: MessageStatus) { ... }
async getMessagesByStatus(conversationId: string, status: MessageStatus) { ... }
async getPendingMessages(conversationId?: string) { ... }
async markAsSeen(conversationId: string, upToMessageId?: string) { ... }
```

**DESPUÉS:**
```typescript
import { messages, type MessageContent } from '@fluxcore/db';

async createMessage(data: {
  // SIN status
}) {
  // SIN status
}

// ELIMINAR métodos de status
```

### SRG-005: Login debe setear selectedAccountId

En `authStore` o donde se maneje el login:
```typescript
// Después de login exitoso
if (accounts.length > 0) {
  useUIStore.getState().setSelectedAccountId(accounts[0].id);
}
```

---

## ✅ CRITERIOS DE ÉXITO

1. [ ] POST /messages retorna 200 y mensaje se guarda en BD
2. [ ] GET /conversations/:id/messages retorna mensajes reales
3. [ ] `selectedAccountId` se setea automáticamente al login
4. [ ] AddContactModal no muestra "No hay cuenta activa"
5. [ ] Click en conversación muestra mensajes reales
6. [ ] Enviar mensaje aparece en ambos chats

---

## 🧪 PRUEBAS

### Test 1: Backend - Crear mensaje ✅ PASS
```powershell
# Resultado: {"success":true,"data":{"messageId":"1294bd38-2462-451a-8e5a-ab856b1c362a"}}
```

### Test 2: Backend - Obtener mensajes ✅ PASS
```powershell
# GET /conversations/:id/messages funciona correctamente
```

### Test 3: Frontend - Verificar selectedAccountId ⏳ PENDIENTE
```javascript
// En Console del navegador después de login
console.log(localStorage.getItem('selectedAccountId'));
```

---

## 🔧 CORRECCIONES APLICADAS

| ID | Problema | Fix | Estado |
|----|----------|-----|--------|
| SRG-001 | `message.service.ts` usaba `status` | Eliminado campo `status` | ✅ |
| SRG-002 | `MessageStatus` type no existe | Eliminado import | ✅ |
| SRG-003 | Métodos de status | Eliminados | ✅ |
| SRG-004 | `automation_rules` table no existe | Try-catch en evaluateTrigger | ✅ |
| SRG-005 | `extension_installations` table no existe | Try-catch en processMessage | ✅ |
| SRG-006 | Login no setea `selectedAccountId` | authStore actualiza uiStore | ✅ |
| SRG-007 | Register no devuelve accounts | auth.routes.ts actualizado | ✅ |
| SRG-008 | api.ts login type sin accounts | Añadido accounts[] al tipo | ✅ |

---

## ⚠️ ISSUES PENDIENTES

1. **Content serialización** - Los mensajes nuevos guardan content como string escapado
2. **Tablas faltantes** - `automation_rules`, `extension_installations`, `extension_contexts` no existen
3. **Frontend** - Verificar que mensajes se muestran correctamente
