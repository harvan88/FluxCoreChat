---
id: "ai-branding-service"
type: "logic-service"
status: "stable"
criticality: "low"
location: "apps/api/src/services/ai-branding.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Agnóstico (Pure Functions)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Marca y Marcadores de Promoción" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Promo marker stripping, Branding footer injection, Suggestion branding decision, Text cleaning" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AIBrandingService

## 🎯 Propósito
Este servicio provee funciones puras para manipular el texto generado por la IA con fines de branding y marketing. Centraliza las reglas de "limpieza" de la salida de los LLMs antes de que lleguen al usuario final.

## 🚥 Funcionalidades Clave
-   **`[[fluxcore:promo]]`**: Detecta y elimina este marcador interno que los asistentes inyectan para indicar que una respuesta es candidata a incluir una promoción del sistema.
-   **Branding Footer**: Gestiona la inyección de la leyenda `(gestionado por FluxCore)` al final de los mensajes, asegurando que no se duplique y que el espaciado sea correcto.
-   **Limpieza de Sugerencias**: Se utiliza en el flujo de "Sugerencias IA" para determinar si un contenido debe mostrar el sello de FluxCore en la interfaz administrativa.

## 🛡️ Invariantes
-   **Pureza**: No tiene efectos secundarios, no accede a base de datos ni a variables de entorno.
-   **Idempotencia**: Aplicar `appendFluxCoreBrandingFooter` múltiples veces a un texto no añade múltiples firmas.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { aiBrandingService } from 'apps/api/src/services/ai-branding.service.ts';

// Ejemplo de invocación típica
const result = await aiBrandingService.execute(params);
```
