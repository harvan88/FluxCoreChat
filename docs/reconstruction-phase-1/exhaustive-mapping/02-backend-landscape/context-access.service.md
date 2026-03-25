---
id: "context-access-service"
type: "security-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/context-access.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "PermissionValidatorService, Drizzle (accounts, relationships, conversations, extensionContexts)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Contextos Controlados (FC-157)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Granular context assembly, Scope-based field filtering (Public vs Private), History extraction with limits, Extension Overlays management, Relationship perspective injection" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ ContextAccessService

## 🎯 Propósito
El `ContextAccessService` (FC-157) es el guardián de la privacidad en FluxCore. Su función es ensamblar el "mundo" de datos que una extensión o agente puede ver, filtrando la información sensible según los permisos otorgados por el usuario.

## 🚥 Jerarquía de Scopes
El servicio ensambla el contexto evaluando scopes granulares:
-   **public/private**: Determina si se incluyen metadatos básicos o el `privateContext` del perfil.
-   **relationship**: Inyecta datos del vínculo actual, incluyendo las perspectivas de ambos lados.
-   **history**: Agrega los últimos 50 mensajes de la conversación para dar contexto temporal a la extensión.

## 🧬 Extension Overlays
Implementa un sistema de almacenamiento "paralelo" por extensión. Las extensiones pueden guardar datos propios vinculados a entidades del sistema (Ej: una extensión de CRM puede guardar un "Lead ID" contra una `accountId`). El servicio recupera estos overlays de forma transparente al ensamblar el contexto.

## 🛡️ Aislamiento Selectivo
Al recuperar el historial de mensajes o perfiles, el servicio no solo valida permisos estáticos, sino que coordina con `PermissionValidatorService` para asegurar que la extensión solo acceda a los campos autorizados en el manifiesto, implementando una arquitectura de "Privilegio Mínimo" por diseño.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { contextAccessService } from 'apps/api/src/services/context-access.service.ts';

// Ejemplo de invocación típica
const result = await contextAccessService.execute(params);
```
