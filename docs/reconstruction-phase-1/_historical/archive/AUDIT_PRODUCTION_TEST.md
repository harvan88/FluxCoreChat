# Auditoría para Prueba de Producción
> **Fecha:** 2024-12-09
> **Objetivo:** Preparar el sistema para la primera prueba humana real

---

## 📋 Resumen de la Prueba

**Escenario:** Carlos, dueño de "Panadería de la Esquina", realiza el flujo completo:
1. Registro de cuenta
2. Configuración de perfil
3. Activación de cuenta de negocio
4. Invitación a colaboradores (María y Daniel)
5. María y Daniel aceptan invitación y cambian entre cuentas

---

## 🔍 Estado Actual del Sistema

### ✅ Backend - COMPLETO

| Funcionalidad | Estado | Ruta API | Pruebas |
|---------------|--------|----------|---------|
| Auth (registro/login) | ✅ | `/auth/*` | 16/16 |
| Accounts CRUD | ✅ | `/accounts/*` | ✅ |
| Accounts personal/business | ✅ | `accountType` field | ✅ |
| privateContext (IA) | ✅ | `PATCH /accounts/:id` | ✅ |
| Workspaces CRUD | ✅ | `/workspaces/*` | 16/16 |
| Workspace Members | ✅ | `/workspaces/:id/members` | ✅ |
| Invitaciones | ✅ | `/workspaces/:id/invitations` | ✅ |
| Aceptar invitación | ✅ | `POST /invitations/:token/accept` | ✅ |
| Relaciones | ✅ | `/relationships/*` | ✅ |
| Conversaciones | ✅ | `/conversations/*` | ✅ |
| Mensajes | ✅ | `/messages/*` | ✅ |
| Extensiones | ✅ | `/extensions/*` | ✅ |
| WebSocket | ✅ | `/ws` | ✅ |

### ❌ Frontend - GAPS IDENTIFICADOS

| Funcionalidad | Estado | Componente Requerido | Prioridad |
|---------------|--------|----------------------|-----------|
| Perfil completo | ❌ FALTA | `ProfileSection.tsx` | 🔴 CRÍTICO |
| Foto de perfil | ❌ FALTA | `AvatarUploader.tsx` | 🟡 ALTO |
| Presentación (bio) | ❌ FALTA | `BioEditor.tsx` | 🔴 CRÍTICO |
| Toggle cuenta negocio | ❌ FALTA | `BusinessToggle.tsx` | 🔴 CRÍTICO |
| Editor contexto IA | ❌ FALTA | `AIContextEditor.tsx` | 🔴 CRÍTICO |
| Editor expandible | ❌ FALTA | `ExpandedEditor.tsx` | 🟡 ALTO |
| Gestión de cuentas | ❌ FALTA | `AccountsSection.tsx` | 🔴 CRÍTICO |
| Selector de cuenta | ❌ FALTA | `AccountSwitcher.tsx` | 🔴 CRÍTICO |
| Lista colaboradores | ❌ FALTA | `CollaboratorsList.tsx` | 🔴 CRÍTICO |
| Invitar colaborador | ❌ FALTA | `InviteCollaborator.tsx` | 🔴 CRÍTICO |
| Buscar usuarios | ❌ FALTA | `UserSearch.tsx` | 🟡 ALTO |
| Aceptar invitación | ❌ FALTA | `InvitationAccept.tsx` | 🔴 CRÍTICO |
| Mensaje bienvenida Fluxi | ❌ FALTA | `WelcomeMessage.tsx` | 🟡 ALTO |
| Hook useWorkspaces | ❌ FALTA | `useWorkspaces.ts` | 🔴 CRÍTICO |
| Hook useInvitations | ❌ FALTA | `useInvitations.ts` | 🔴 CRÍTICO |
| Store accounts | ❌ FALTA | `accountStore.ts` | 🔴 CRÍTICO |

---

## ⚠️ Análisis de Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| UI de perfil no lista | Alta | 🔴 Bloqueante | Implementar ProfileSection completo |
| Sin cambio de cuentas | Alta | 🔴 Bloqueante | Implementar AccountSwitcher |
| Sin invitaciones UI | Alta | 🔴 Bloqueante | Implementar flujo completo |
| Backend timeout | Baja | 🟡 Medio | Health checks existentes |
| Upload de imagen falla | Media | 🟡 Medio | Validación client-side |
| WebSocket desconexión | Baja | 🟢 Bajo | Reconexión automática existe |

---

## 📊 Gap Analysis por Flujo de Prueba

### Flujo 1: Registro (Carlos)
```
[✅] Página de registro
[✅] Formulario de registro
[✅] Crear usuario
[✅] Crear cuenta personal automática
[❌] Mensaje de bienvenida "Fluxi"
[✅] Redirigir a workspace
```
**Gap:** Falta mensaje de bienvenida inicial

### Flujo 2: Configuración de Perfil
```
[✅] ActivityBar → Settings
[✅] Sidebar muestra opciones
[❌] Sección Perfil completa
[❌] Campo foto con uploader
[❌] Campo presentación (0/150)
[❌] Campo nombre visible editable
[❌] Campo descripción
[❌] Toggle cuenta de negocio
[❌] Campo contexto IA (0/5000)
[❌] Editor expandible tipo GitHub
[❌] Contador de líneas/tokens
```
**Gap:** TODO el flujo de perfil

### Flujo 3: Cuenta de Negocio
```
[❌] Toggle activa sección cuentas
[❌] Link a "Configuración de cuentas"
[❌] Opción convertir a negocio
[❌] Opción crear cuenta negocio
[❌] Lista de colaboradores
[❌] Colaborador "Flux Core" por defecto
```
**Gap:** TODO el flujo de cuentas de negocio

### Flujo 4: Invitar Colaboradores
```
[❌] Botón "Agregar colaboradores"
[❌] Buscador de usuarios por alias
[❌] Input para email manual
[❌] Selector de permisos
[❌] Botón "Invitar a colaborar"
[❌] Feedback de invitación enviada
```
**Gap:** TODO el flujo de invitaciones

### Flujo 5: María y Daniel
```
[❌] Ver invitación pendiente
[❌] Aceptar invitación
[❌] Selector de cuenta (avatar superior izquierdo)
[❌] Cambiar entre cuenta personal y "Panadería"
[❌] Ver workspace según permisos
```
**Gap:** TODO el flujo de aceptación y cambio

---

## 🎯 Plan de Acción - Nuevos Hitos

### Hito 16: Profile System (CRÍTICO)
**Duración estimada:** 1 semana

| ID | Descripción | Prioridad | Componente |
|----|-------------|-----------|------------|
| FC-600 | ProfileSection completa | Alta | `settings/ProfileSection.tsx` |
| FC-601 | BioEditor (presentación) | Alta | `settings/BioEditor.tsx` |
| FC-602 | AvatarUploader | Alta | `common/AvatarUploader.tsx` |
| FC-603 | AIContextEditor básico | Alta | `settings/AIContextEditor.tsx` |
| FC-604 | ExpandedEditor (tipo GitHub) | Media | `editors/ExpandedEditor.tsx` |
| FC-605 | TokenCounter | Media | `editors/TokenCounter.tsx` |
| FC-606 | BusinessToggle | Alta | `settings/BusinessToggle.tsx` |
| FC-607 | Hook useProfile | Alta | `hooks/useProfile.ts` |

**Criterios de aceptación:**
- [ ] Usuario puede editar foto de perfil
- [ ] Usuario puede escribir presentación (0/150 chars)
- [ ] Usuario puede editar nombre visible
- [ ] Usuario puede escribir contexto IA (0/5000 chars)
- [ ] Editor expandible funciona en nueva tab
- [ ] Toggle de cuenta de negocio visible

---

### Hito 17: Account Management (CRÍTICO)
**Duración estimada:** 1 semana

| ID | Descripción | Prioridad | Componente |
|----|-------------|-----------|------------|
| FC-610 | AccountStore | Alta | `store/accountStore.ts` |
| FC-611 | AccountSwitcher | Alta | `layout/AccountSwitcher.tsx` |
| FC-612 | AccountsSection | Alta | `settings/AccountsSection.tsx` |
| FC-613 | ConvertToBusiness | Alta | `accounts/ConvertToBusiness.tsx` |
| FC-614 | CreateBusinessAccount | Alta | `accounts/CreateBusinessAccount.tsx` |
| FC-615 | Hook useAccounts | Alta | `hooks/useAccounts.ts` |
| FC-616 | API client accounts | Alta | `services/accounts.ts` |

**Criterios de aceptación:**
- [ ] Usuario puede ver sus cuentas
- [ ] Usuario puede convertir cuenta a negocio
- [ ] Usuario puede crear cuenta de negocio nueva
- [ ] Selector de cuenta visible en header
- [ ] Cambio de cuenta funciona correctamente

---

### Hito 18: Workspace & Collaborators (CRÍTICO)
**Duración estimada:** 1.5 semanas

| ID | Descripción | Prioridad | Componente |
|----|-------------|-----------|------------|
| FC-620 | Hook useWorkspaces | Alta | `hooks/useWorkspaces.ts` |
| FC-621 | WorkspaceStore | Alta | `store/workspaceStore.ts` |
| FC-622 | CollaboratorsList | Alta | `workspace/CollaboratorsList.tsx` |
| FC-623 | UserSearch | Alta | `common/UserSearch.tsx` |
| FC-624 | InviteCollaborator | Alta | `workspace/InviteCollaborator.tsx` |
| FC-625 | PermissionsSelector | Media | `workspace/PermissionsSelector.tsx` |
| FC-626 | Hook useInvitations | Alta | `hooks/useInvitations.ts` |
| FC-627 | InvitationsList | Alta | `workspace/InvitationsList.tsx` |
| FC-628 | AcceptInvitation | Alta | `workspace/AcceptInvitation.tsx` |
| FC-629 | PendingInvitations | Alta | `layout/PendingInvitations.tsx` |
| FC-630 | API client workspaces | Alta | `services/workspaces.ts` |

**Criterios de aceptación:**
- [ ] Usuario puede ver lista de colaboradores
- [ ] Usuario puede buscar usuarios por alias
- [ ] Usuario puede invitar por email
- [ ] Usuario puede asignar permisos
- [ ] Invitado puede ver y aceptar invitación
- [ ] Invitado ve workspace según permisos

---

### Hito 19: Welcome Experience (ALTO)
**Duración estimada:** 0.5 semanas

| ID | Descripción | Prioridad | Componente |
|----|-------------|-----------|------------|
| FC-640 | WelcomeMessage | Alta | `onboarding/WelcomeMessage.tsx` |
| FC-641 | FluxiAvatar | Media | `common/FluxiAvatar.tsx` |
| FC-642 | OnboardingConversation | Alta | Backend: crear conversación inicial |
| FC-643 | FirstTimeExperience | Media | `onboarding/FirstTimeExperience.tsx` |

**Criterios de aceptación:**
- [ ] Usuario nuevo ve mensaje de Fluxi
- [ ] Conversación inicial creada automáticamente
- [ ] Avatar de Fluxi distintivo

---

## 📅 Cronograma Actualizado

```
Semana 23:    Hito 16 - Profile System
Semana 24:    Hito 17 - Account Management
Semana 25-26: Hito 18 - Workspace & Collaborators
Semana 26.5:  Hito 19 - Welcome Experience
Semana 27:    Prueba de Producción con Carlos, María, Daniel

Total adicional: ~4.5 semanas
```

---

## 🧪 Guía de Verificación Manual

### Pre-requisitos
- [ ] PostgreSQL corriendo
- [ ] `bun run dev` sin errores
- [ ] Frontend accesible en localhost:5173
- [ ] API accesible en localhost:3000

### Prueba 1: Registro de Carlos
```bash
1. Abrir http://localhost:5173
2. Click "Crear cuenta"
3. Nombre: Carlos Panadero
4. Email: carlos@panaderia.com
5. Password: Test123!
6. Verificar: Redirige a workspace
7. Verificar: Mensaje de Fluxi visible
```

### Prueba 2: Configurar Perfil
```bash
1. Click Settings en ActivityBar
2. Click "Perfil"
3. Subir foto (cualquier imagen)
4. Escribir presentación: "Panadería artesanal desde 1990"
5. Escribir contexto IA: "Soy dueño de panadería..."
6. Activar "Cuenta de negocio"
7. Guardar
```

### Prueba 3: Invitar Colaboradores
```bash
1. Ir a Configuración de Cuentas
2. Click "Agregar colaboradores"
3. Buscar "daniel" -> Seleccionar -> Invitar
4. Escribir "maria@email.com" -> Invitar
5. Verificar: 2 invitaciones pendientes
```

### Prueba 4: María acepta
```bash
1. Registrar cuenta María
2. Verificar: Notificación de invitación
3. Aceptar invitación
4. Verificar: Puede cambiar a "Panadería"
5. Verificar: No ve extensiones (según permisos)
```

---

## 📝 Notas para la IA de Desarrollo

1. **Seguir HTP** (Hito Transition Pattern) definido en `INSTRUCCIONES.md`
2. **Usar componentes existentes** de Component Library
3. **No crear mocks** - Todo debe conectar con API real
4. **Commitear** al finalizar cada issue
5. **Actualizar** `ESTADO_PROYECTO.md` al cerrar cada hito

---

## ✅ Checklist Pre-Prueba

- [ ] Hito 16 completado
- [ ] Hito 17 completado
- [ ] Hito 18 completado
- [ ] Hito 19 completado
- [ ] Build de producción exitoso
- [ ] Base de datos limpia/seed
- [ ] Documentación actualizada
- [ ] Guía de verificación probada

---

**Este documento es la guía para preparar la primera prueba de producción real.**
