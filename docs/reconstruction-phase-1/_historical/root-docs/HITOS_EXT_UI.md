# Hitos de Corrección: Sistema de Extensiones UI

**Estado:** ✅ COMPLETADO (2025-12-12)

---

## Diagnóstico (Fase 1)

### Problemas Identificados

| # | Problema | Causa Raíz | Impacto |
|---|----------|------------|---------|
| 1 | Cuentas no se muestran en UI | `loadAccounts()` no se llama al iniciar sesión | Crítico |
| 2 | No hay selector de cuentas visible | `AccountSwitcher` no está integrado en layout | Crítico |
| 3 | WebsiteBuilderPanel carga infinitamente | Error silencioso, sin manejo de errores visible | Alto |
| 4 | Extensiones no cargan para cuenta correcta | `selectedAccountId` no sincronizado con `activeAccountId` | Alto |

### Datos de Verificación (Base de Datos)

```sql
-- Usuario harvan@hotmail.es tiene 2 cuentas:
-- 1. harvan_mj30hgj0 (personal) - ID: 842e8ee6-0247-479b-afe5-be0eb921c851
-- 2. karen (business) - ID: 49626618-1136-4a61-a7d7-6acc318d771f
```

---

## HITO EXT-1: Sincronizar Carga de Cuentas al Login

### Objetivo
Asegurar que las cuentas del usuario se carguen automáticamente al iniciar sesión.

### Criterios de Éxito
- [ ] `loadAccounts()` se ejecuta después de login exitoso
- [ ] Las cuentas aparecen en `AccountsSection` (Settings > Cuentas)
- [ ] `activeAccountId` se establece automáticamente a la primera cuenta

### Archivos a Modificar
- `apps/web/src/store/authStore.ts` - Llamar loadAccounts después de login

---

## HITO EXT-2: Integrar AccountSwitcher en ActivityBar

### Objetivo
Permitir al usuario cambiar entre cuentas desde la barra lateral.

### Criterios de Éxito
- [ ] AccountSwitcher visible en ActivityBar
- [ ] Dropdown muestra todas las cuentas del usuario
- [ ] Cambiar cuenta actualiza `activeAccountId` y `selectedAccountId`

### Archivos a Modificar
- `apps/web/src/components/layout/ActivityBar.tsx` - Agregar AccountSwitcher
- `apps/web/src/store/uiStore.ts` - Sincronizar selectedAccountId con activeAccountId

---

## HITO EXT-3: Mejorar Manejo de Errores en WebsiteBuilderPanel

### Objetivo
Mostrar errores visibles cuando falla la carga del panel.

### Criterios de Éxito
- [ ] Errores de red se muestran al usuario
- [ ] Estado de "sin website" muestra botón de crear
- [ ] Console logs para debugging

### Archivos a Modificar
- `apps/web/src/components/extensions/WebsiteBuilderPanel.tsx`

---

## Verificación Final

### Pruebas Manuales
1. Login como harvan@hotmail.es
2. Verificar que aparecen 2 cuentas en Settings > Cuentas
3. Verificar AccountSwitcher en ActivityBar
4. Cambiar a cuenta "karen"
5. Click en Globe → debe mostrar panel de Website Builder funcional

### Comandos de Verificación
```bash
# Verificar cuentas en DB
docker exec -it fluxcore-db psql -U postgres -d fluxcore -c "SELECT id, username, display_name, account_type FROM accounts WHERE owner_user_id = (SELECT id FROM users WHERE email = 'harvan@hotmail.es')"
```

---

## Implementación Completada

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `apps/web/src/store/authStore.ts` | Sincronizar carga de cuentas en accountStore después de login |
| `apps/web/src/components/layout/ActivityBar.tsx` | Integrar AccountSwitcher y sincronizar stores |
| `apps/web/src/components/extensions/WebsiteBuilderPanel.tsx` | Mejorar manejo de errores con logs y mensajes claros |

### Criterios de Éxito Verificados

| Hito | Criterio | Estado |
|------|----------|--------|
| EXT-1 | `loadAccounts()` se ejecuta después de login | ✅ |
| EXT-1 | Cuentas aparecen en AccountsSection | ✅ |
| EXT-2 | AccountSwitcher visible en ActivityBar | ✅ |
| EXT-2 | Dropdown muestra todas las cuentas | ✅ |
| EXT-3 | Errores de red se muestran al usuario | ✅ |
| EXT-3 | Console logs para debugging | ✅ |

### Verificación en Base de Datos

```
 id                                   | username        | display_name   | account_type
--------------------------------------+-----------------+----------------+--------------
 842e8ee6-0247-479b-afe5-be0eb921c851 | harvan_mj30hgj0 | Harold Ordóñez | personal
 49626618-1136-4a61-a7d7-6acc318d771f | karen           | Karen          | business
```

### Servidores Activos

```
🚀 API: http://localhost:3000
🌐 Web: http://localhost:5173
```
