---
id: "contacts-routes"
type: "api-routes"
status: "stable"
criticality: "medium"
location: "apps/api/src/routes/contacts.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "RelationshipService, AccountService, ActorResolver" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API de Historial de Contactos" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Contact interaction history aggregation, Combined message and context events, Actor-based interaction filtering" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Contacts Routes

## 🎯 Propósito
Las `Contacts Routes` proporcionan una vista consolidada de la historia entre un usuario del sistema y un contacto específico. Su función principal es alimentar la línea de tiempo de interacciones en el frontend, mezclando diferentes tipos de eventos en una única secuencia cronológica.

## 🚥 Agregación de Interacciones
A diferencia de las rutas de mensajes puras, este endpoint (`/:contactId/interactions`) combina:
1.  **Mensajes Reales**: Los últimos textos intercambiados en la conversación principal.
2.  **Actualizaciones de Contexto**: Notas de CRM, cambios de preferencias o reglas añadidas manualmente por el equipo de soporte.
3.  **Cambios de Estado**: Hitos importantes en la relación.

## 🧬 Resolución de Identidad
Utiliza `resolveActorId` para identificar al contacto independientemente de la plataforma (WhatsApp, Webchat), permitiendo que el historial sea consistente aunque el contacto cambie de identificador técnico pero mantenga su identidad de actor en el sistema.

## 🛡️ Privacidad
La ruta filtra las interacciones basándose en la cuenta del usuario autenticado, garantizando que un agente de soporte solo vea el historial que le compete según sus permisos de cuenta.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './contacts.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/contacts', router);
```
