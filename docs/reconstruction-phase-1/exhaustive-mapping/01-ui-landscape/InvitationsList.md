---
id: "invitations-list"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/workspace/InvitationsList.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Conectado al useWorkspaceStore Global" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor Dual In/Out de Invitaciones Colaborativas" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Separador Listador de correos y Card Botonera Aceptar/Rechazar" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 InvitationsList (y AcceptInvitation)

## 🎯 Propósito
(FC-827 / FC-828). Encapsula en un solo archivo magnético todos los bloques reactivos que median entre las invitaciones a unirse a los Workspaces y los usuarios. Provee un lado de la moneda (La lista para que el Administrador vea quién no ha aceptado y Cancele) y el Otro lado (La Card final que recibe el invitado mostrándole un Botón Aceptar para amarrar la Token API).

## 📦 Estado y Datos
**Suscriptor Global Pasivo Activo:**
- Toma variables vivas destructivas de `useWorkspaceStore()` tales como `invitations` y métodos mutantes `cancelInvitation() / acceptInvitation()`.

## 🔄 Flujos de Interacción
1. **Motor de Filtraje Excluyente:** Si está operando en formato "Lista", itera a toda velocidad destripando las resoluciones ya resueltas `filter((i) => i.status === 'pending')`. Imprimiendo una grilla plana de Tarjetas con botones `X` destructivos que abren Diálogos Puros Nativos del DOM (`confirm()`) previos a amputar la invitación al correo de manera irrecuperable.
2. **Máquina de Estados de Adhesión Pura (`AcceptInvitation`):** El componente hermano en línea asume una actitud asíncrona ciega. Al chocar su botón Aceptar impone la bandera `accepting`, frena clics dobles `disabled={isLoading || status === 'accepting'}`, y si el backend devuelve un 200 OK destruye visualmente la interfaz de formularios enteros y asume permanentemente la forma de un Icono `Check` brillante felicitando. 
3. **Píldora Indicadora Notificacional (`PendingInvitationsIndicator`):** Diminuto botón de campana/Mail superior en Layouts que extrae los arreglos del store inyectando bolitas rojas (`-top-1 bg-accent`) imitando burbujas iOS empujando instintos ansiosos al clic basándose exclusivamente en sus Arrays `length`.

## 💡 Ejemplo de Uso
```tsx
import { InvitationsList, AcceptInvitation } from '../../components/workspace/InvitationsList';

// Administrador
<section>
  <InvitationsList workspaceId="wk_123" canManage={true} />
</section>

// Huésped clickeando el Email URL profundo
<section>
  <AcceptInvitation invitation={inboundPayloadObj} />
</section>
```
