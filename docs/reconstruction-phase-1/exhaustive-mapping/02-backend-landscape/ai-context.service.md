---
id: "ai-context-service"
type: "infrastructure-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/ai-context.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (messages, conversations, accounts, relationships, assetEnrichments)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Constructor de Contexto Cognitivo" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Account profile retrieval, Relationship context (entries) aggregation, Message history normalization, Attachment/Transcript matching" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AIContextService

## 🎯 Propósito
Este servicio es el responsable de "preparar la mesa" para la IA. Su función es recolectar toda la información dispersa en la base de datos (perfiles, historial, notas CRM, archivos) y empaquetarla en una estructura coherente que el LLM pueda procesar.

## 🚥 Capas de Información
-   **Identidad**: Incluye el perfil público y privado de la cuenta (bio, nombre, etc.).
-   **Relación (CRM Context)**: Recolecta las "entradas" manuales o automáticas guardadas en la relación, lo que permite que la IA sepa cosas como "este cliente prefiere el café frío" si alguien lo anotó previamente.
-   **Historial Enriquecido**: No solo envía el texto de los últimos mensajes; también busca si los mensajes tienen audios y adjunta la **transcripción** (texto extraído) dentro del objeto del mensaje.

## 🧬 Normalización
Transforma datos crudos de base de datos en formatos amigables para prompts, asegurando que los mensajes se presenten en orden cronológico inverso (el más reciente primero) y manejando fallbacks para mensajes que no contienen texto (ej. solo archivos).

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { aiContextService } from 'apps/api/src/services/ai-context.service.ts';

// Ejemplo de invocación típica
const result = await aiContextService.execute(params);
```
