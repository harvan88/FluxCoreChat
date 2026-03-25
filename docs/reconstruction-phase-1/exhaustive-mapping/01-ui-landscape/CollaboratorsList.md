---
id: "collaborators-list"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/workspace/CollaboratorsList.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Vinculado a useWorkspaceStore multi-tenant" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Orquestador visual de permisos RBAC" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Mutaciones seguras y feedback visual" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 CollaboratorsList

## 🎯 Propósito
Componente de gestión de identidades y accesos (IAM/RBAC) dedicado a listar y administrar los miembros pertenecientes a un Espacio de Trabajo (Workspace) particular. Contiene lógica integrada para escalar o degradar privilegios en tiempo real así como revocar el acceso a operadores indeseados.

## 📦 Estado y Datos
**Acople de Store:**
- Se nutre de `useWorkspaceStore` para consumir la matriz reactiva `members`, y los métodos asíncronos de mutación activa `updateMember` y `removeMember`.

**Estado Local Efímero:**
- Mantiene registro de qué fila está siendo alterada mediante `editingMemberId` instanciando un solo panel expansivo de permisos a la vez.

## 🔄 Flujos de Interacción
1. **Despliegue Protegido (canManage):** Toda la visual de botoneras (Kebab menus, Iconos de Basurero) está fuertemente ceñida por el prop booleano `canManage`. Aún teniéndolo, el componente aplica una regla "Hardcoded" defensiva: Nadie puede auto-gestionar a un miembro superior si su role es `owner` (`member.role !== 'owner'`).
2. **Promoción/Degradación de Rol en Caliente (Inline Expansion):** En lugar de navegar a una vista distinta o modal superpuesto, incrusta su propio sub-componente `PermissionsSelector`. Esto expone Radio Buttons ricos con iconos (`admin`, `operator`, `viewer`) y comitea mediante promesas, bloqueando transitoriamente la UI con estados de espín de carga (`isUpdating`).
3. **Revocación Confirmada:** El sub-menú de acciones (`MemberActionsMenu`) incluye una alerta JavaScript nativa (`confirm()`) previo a despachar conmutaciones fatales al Backend previniendo demoliciones accidentales del equipo.

## 💡 Ejemplo de Uso
```tsx
import { CollaboratorsList } from '../../components/workspace/CollaboratorsList';

<CollaboratorsList 
   workspaceId="wks_428A" 
   canManage={currentUser.role === 'admin'} 
/>
```
