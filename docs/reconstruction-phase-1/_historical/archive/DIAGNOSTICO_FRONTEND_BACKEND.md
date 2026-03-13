# DIAGNÓSTICO: Desacople Frontend-Backend

**Fecha:** 2024-12-09
**Estado:** CRÍTICO - Sistema no funcional para pruebas

---

## 🔴 DESCONEXIONES CRÍTICAS IDENTIFICADAS

### 1. BÚSQUEDA DE CONTACTOS
| Componente | Estado | Problema |
|------------|--------|----------|
| `ContactsList.tsx` línea 45-48 | ❌ DECORATIVO | `handleAddContact` solo hace `console.log` |
| Buscador | ❌ LOCAL | Filtra contactos YA cargados, no busca en BD |
| Backend | ✅ EXISTE | `GET /accounts/search?q=` implementado |
| Frontend | ❌ NO USA | `accountsApi.searchUsers` filtra localmente |

**Acción:** Conectar frontend a `GET /accounts/search`

### 2. PERFIL
| Componente | Estado | Problema |
|------------|--------|----------|
| `useProfile.ts` | ✅ CONECTADO | Llama a `api.getAccounts`, `api.updateAccount` |
| Avatar upload | ❌ DECORATIVO | Botón sin endpoint |
| Guardar cambios | ✅ FUNCIONA | Actualiza en BD |

### 3. CONVERSIÓN A NEGOCIO
| Componente | Estado | Problema |
|------------|--------|----------|
| `ProfileSection.tsx` línea 146-175 | ❌ INCOMPLETO | Solo marca flag `businessRequested` |
| `accountStore.ts` línea 139-162 | ❌ INCOMPLETO | Llama a `convertToBusiness` que no cambia `accountType` |
| Backend | ❌ FALTA | No hay endpoint que cambie `accountType` real |

**Acción:** Crear endpoint `PATCH /accounts/:id/convert-to-business`

### 4. EXTENSIONES
| Componente | Estado | Problema |
|------------|--------|----------|
| `useExtensions.ts` | ✅ CONECTADO | Llama a endpoints reales |
| Backend endpoints | ✅ EXISTEN | `/extensions`, `/extensions/installed/:accountId` |
| Datos | ❌ VACÍO | No hay extensiones registradas en BD |

**Acción:** Seed de extensiones (fluxcore ya debería existir)

### 5. ARQUITECTURA SETTINGS (VIOLACIÓN CANÓNICA)
| Actual | Canónico |
|--------|----------|
| ActivityBar → Sidebar (renderiza TODO) | ActivityBar → Sidebar (MENÚ) → DynamicContainer (CONTENIDO) |
| Settings ocupa todo el Sidebar | Settings abre TABS en el container principal |

**Acción:** Refactorizar Settings para usar tabs en DynamicContainer

---

## 📊 RESUMEN EJECUTIVO

```
COMPONENTES ANALIZADOS: 8
├── FUNCIONALES:     2 (25%)  - Profile read, Accounts list
├── DECORATIVOS:     4 (50%)  - Add contact, Avatar, Convert, Search  
├── DESCONECTADOS:   1 (12.5%) - Extensions UI
└── MAL ARQUITECTURA: 1 (12.5%) - Settings flow
```

---

## 🎯 PLAN DE ACCIÓN (HCI)

### HITO 24: EMPAREJAMIENTO CORE (Prioridad ALTA)
**Duración:** 4 horas
**Riesgo:** Bajo

| Issue | Tarea | Archivo |
|-------|-------|---------|
| EMF-001 | Conectar búsqueda a API real | `ContactsList.tsx`, `api.ts` |
| EMF-002 | Modal agregar contacto funcional | `ContactsList.tsx` |
| EMF-003 | Endpoint convert-to-business | `accounts.routes.ts` |
| EMF-004 | Conectar conversion UI a endpoint | `accountStore.ts` |

### HITO 25: ARQUITECTURA SETTINGS (Prioridad MEDIA)
**Duración:** 3 horas
**Riesgo:** Medio (refactoring)

| Issue | Tarea |
|-------|-------|
| SET-001 | Settings sidebar solo muestra menú |
| SET-002 | Cada opción abre tab en DynamicContainer |
| SET-003 | ProfileSection como tab |
| SET-004 | AccountsSection como tab |

### HITO 26: EXTENSIONES (Prioridad BAJA)
**Duración:** 2 horas
**Riesgo:** Bajo

| Issue | Tarea |
|-------|-------|
| EXT-001 | Verificar seed de fluxcore |
| EXT-002 | Mostrar extensiones instaladas |

---

## ✅ CRITERIOS DE ÉXITO

Al completar estos hitos:
1. [ ] Buscar "@alias" devuelve usuarios de la BD
2. [ ] Botón "Agregar contacto" crea relación real
3. [ ] "Convertir a negocio" cambia accountType
4. [ ] Settings abre tabs en el container
5. [ ] Extensiones visibles en panel
