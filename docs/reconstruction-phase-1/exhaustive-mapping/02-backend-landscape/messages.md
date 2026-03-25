---
id: "messages-routes"
type: "api-routes"
status: "stable"
criticality: "critical"
location: "apps/api/src/routes/messages.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "MessageCore, MessageService, RelationshipService, ActorResolver" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API de Alta Disponibilidad para Mensajería" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Human input reception (POST), Atomic persistence via ChatCore, World-Truth enrichment (IP/UA), Message editing with branding preservation, Redaction (For all) vs Hiding (For self), Bulk deletion" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Messages Routes

## 🎯 Propósito
Las `Messages Routes` son el punto de entrada de mayor tráfico de la plataforma. Gestionan el intercambio de mensajes entre humanos y sistemas, asegurando que cada envío se capture con su contexto original de red y se persista de forma atómica antes de que cualquier lógica agéntica (IA) sea notificada.

## 🚥 Recepción de "Verdad del Mundo"
Al recibir un mensaje (`POST /`), el sistema no solo guarda el texto, sino que lo enriquece con metadatos del entorno HTTP:
-   **IP y User-Agent**: Para detección de fraude y contexto geográfico.
-   **Identificación de Canal**: Infiere si el mensaje viene desde un móvil, web o tablet basándose en cabeceras.
-   **Idempotencia**: Soporta `requestId` para evitar duplicados en condiciones de red inestables.

## 🧬 Ciclo de Vida Soberano
1.  **Persistencia Directa**: El mensaje se envía a `messageCore.receive`. ChatCore tiene la soberanía sobre qué sucedió en el mundo humano.
2.  **Visibilidad**: La API implementa filtros de actor, asegurando que un usuario solo vea los mensajes que su cuenta tiene permiso de recibir o ver (especialmente en conversaciones grupales o delegadas).
3.  **Edición Protegida**: Permite correcciones de texto manteniendo la integridad de metadatos críticos como el branding de la IA.

## 🛡️ Redacción y Purga
-   **Redaccón (Delete for All)**: Solo el emisor puede "redactar" un mensaje para que nadie lo vea (elimina el rastro).
-   **Ocultación (Delete for Self)**: Permite que un participante limpie su vista del chat sin afectar la evidencia histórica del otro participante.
-   **Borrado masivo**: Implementa un endpoint `/bulk` para operaciones de limpieza a gran escala con límites de seguridad (max 100 por petición).

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: messages
import { messages } from 'apps/api/src/routes/messages.routes.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await messages.process(input);
```
