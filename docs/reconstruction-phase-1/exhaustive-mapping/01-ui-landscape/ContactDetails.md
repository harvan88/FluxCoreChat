---
id: "contact-details"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/contacts/ContactDetails.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Bypass a wrapper api, usa fetch puro con token Storage" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Panel derecho o Drawer de inspección de usuario" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Ruteos rápidos a Chats e instanciación de Timeline" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 ContactDetails

## 🎯 Propósito
Ficha técnica sumaria (View Profile) de un usuario/lead/agente alojado en el sistema de Relaciones B2B. Despliega la información pública de Avatar y Alias por encima de una cronología interactiva (Timeline) demostrando un historial de los eventos más recientes cruzados entre quien visualiza y quien es visualizado (Últimos mensajes, actualizaciones de contexto, cambios de estado).

## 📦 Estado y Datos
**Consultas Asíncronas en Frío:**
- `contactId`: Obligatorio, dispara un Side-Effect al montarse.
- **Nota arquitectónica**: Evade el uso del `api` wrapper convencional prefiriendo ejecuciones `fetch` directas inyectando el Authorization Bearer desde `localStorage` manualmente (`/api/accounts/:id`, `/api/contacts/:id/interactions`). Genera dos conjuntos aislados: Info del usuario (`setContact`) e historial de la relación (`setInteractions`, `setRelationship`).

## 🔄 Flujos de Interacción
1. **Montaje Dual:** Tras resolver la carga paralela (`setLoading`), pinta de arriba hacia abajo la tarjeta de Avatar Grande con quick actions.
2. **Invocación de Callbacks Maestros:** Al hacer click en "Iniciar Chat" u "Editar Contexto", puentea la decisión hacia el componente padre despachando `onStartChat(contactId)` para delegar a Rutas superiores del Router.
3. **Mapeo de Timeline:** Pinta las últimas 10 actividades interactivas como "Tarjetas" informativas (`slice(0, 10)`), renderizando en crudo los eventos si fueron producidos por máquinas (`status_change`) o el preview de contenido y fechas formatadas a locale `es-ES`.

## 💡 Ejemplo de Uso
```tsx
import { ContactDetails } from '../../components/contacts/ContactDetails';

<RightSideDrawer>
   <ContactDetails 
      contactId={selectedUserId} 
      onStartChat={(id) => openGlobalChatTab(id)} 
   />
</RightSideDrawer>
```
