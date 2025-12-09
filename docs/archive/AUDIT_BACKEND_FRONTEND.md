# AUDITORÍA TÉCNICA: Backend → Frontend

> **Fecha:** 2024-12-09 06:20 UTC-3
> **Base de datos:** Reiniciada y migrada ✅

---

## 📊 ESTADO DE TABLAS

```
users               ✅ Vacía (limpia)
accounts            ✅ Vacía (limpia)
actors              ✅ Vacía (limpia)
conversations       ✅ Vacía (limpia)
messages            ✅ Vacía (limpia)
relationships       ✅ Vacía (limpia)
message_enrichments ✅ Vacía (limpia)
```

---

## 🔗 CONEXIONES API: Backend → Frontend

### AUTH
| Endpoint | Backend | Frontend | Estado |
|----------|---------|----------|--------|
| POST /auth/register | ✅ auth.routes.ts | ✅ api.ts | ✅ CONECTADO |
| POST /auth/login | ✅ auth.routes.ts | ✅ api.ts | ✅ CONECTADO |
| POST /auth/logout | ✅ auth.routes.ts | ✅ api.ts | ✅ CONECTADO |

### ACCOUNTS
| Endpoint | Backend | Frontend | Estado |
|----------|---------|----------|--------|
| GET /accounts | ✅ accounts.routes.ts | ✅ api.ts | ✅ CONECTADO |
| POST /accounts | ✅ accounts.routes.ts | ✅ api.ts | ✅ CONECTADO |
| GET /accounts/:id | ✅ accounts.routes.ts | ✅ api.ts | ✅ CONECTADO |
| PATCH /accounts/:id | ✅ accounts.routes.ts | ✅ api.ts | ✅ CONECTADO |
| GET /accounts/search | ✅ accounts.routes.ts | ✅ api.ts | ✅ CONECTADO |
| POST /accounts/:id/convert-to-business | ✅ accounts.routes.ts | ✅ api.ts | ✅ CONECTADO |

### RELATIONSHIPS
| Endpoint | Backend | Frontend | Estado |
|----------|---------|----------|--------|
| GET /relationships | ✅ relationships.routes.ts | ✅ api.ts | ✅ CONECTADO |
| POST /relationships | ✅ relationships.routes.ts | ✅ api.ts | ✅ CONECTADO |

### CONVERSATIONS
| Endpoint | Backend | Frontend | Estado |
|----------|---------|----------|--------|
| GET /conversations | ✅ conversations.routes.ts | ✅ api.ts | ✅ CONECTADO |
| POST /conversations | ✅ conversations.routes.ts | ✅ api.ts | ✅ CONECTADO |
| GET /conversations/:id | ✅ conversations.routes.ts | ✅ api.ts | ✅ CONECTADO |
| GET /conversations/:id/messages | ✅ conversations.routes.ts | ✅ api.ts | ✅ CONECTADO |

### MESSAGES
| Endpoint | Backend | Frontend | Estado |
|----------|---------|----------|--------|
| POST /messages | ✅ messages.routes.ts | ✅ api.ts | ✅ CONECTADO |
| GET /messages/:id | ✅ messages.routes.ts | ✅ api.ts | ✅ CONECTADO |

### EXTENSIONS
| Endpoint | Backend | Frontend | Estado |
|----------|---------|----------|--------|
| GET /extensions | ✅ extensions.routes.ts | ✅ useExtensions.ts | ⚠️ PARCIAL |
| GET /extensions/installed/:accountId | ✅ extensions.routes.ts | ✅ useExtensions.ts | ✅ CONECTADO |
| POST /extensions/install | ✅ extensions.routes.ts | ✅ useExtensions.ts | ✅ CONECTADO |
| DELETE /extensions/:accountId/:extId | ✅ extensions.routes.ts | ✅ useExtensions.ts | ✅ CONECTADO |

---

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. Extensiones NO se cargan desde /extensions
**Archivo:** `manifest-loader.service.ts`
**Problema:** Solo carga `@fluxcore/core-ai` como built-in. No carga manifests de `/extensions/`
**Solución:** Llamar `loadFromDirectory()` al iniciar el servidor

### 2. Usuario nuevo no tiene Fluxi
**Archivo:** `auth.service.ts`
**Problema:** Al crear cuenta, no se crea relación con Fluxi ni conversación de bienvenida
**Solución:** Crear seed de Fluxi y establecer relación automática

### 3. ProfileSection sin feedback de guardado
**Archivo:** `ProfileSection.tsx`
**Problema:** El botón "Guardar" no muestra feedback claro cuando guarda
**Estado:** Funcional pero UX mejorable

### 4. ExtensionsPanel colores hardcodeados
**Archivo:** `ExtensionsPanel.tsx`
**Problema:** Usa `bg-gray-900`, `text-blue-400` en lugar del sistema canónico
**Solución:** Migrar a clases canónicas

---

## 📋 PLAN DE CORRECCIÓN

### HITO 27: Integración Completa

| ID | Tarea | Prioridad |
|----|-------|-----------|
| INT-001 | Cargar extensiones desde /extensions al iniciar | ALTA |
| INT-002 | Crear seed de Fluxi (cuenta sistema) | ALTA |
| INT-003 | Auto-crear relación con Fluxi al registrar | ALTA |
| INT-004 | Corregir colores ExtensionsPanel | MEDIA |
| INT-005 | Verificar flujo completo de Carlos | ALTA |

---

## ✅ ELEMENTOS SIN MOCK

- [x] ConversationsList - Conectado a API real
- [x] ContactsList - Conectado a API real
- [x] ProfileSection - Conectado a useProfile → API
- [x] useProfile - Conectado a api.getAccounts/updateAccount
- [x] useExtensions - Conectado a /extensions endpoints
- [x] AccountsSection - Conectado a useAccounts → API
