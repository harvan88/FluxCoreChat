---
id: "enrichment-badge"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/enrichments/EnrichmentBadge.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Conquista Zustand 'enrichmentStore'" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Inyección visual sobre Burbujas de IA de Chat" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Analizador morfológico automático de semántica de respuestas y parser tipo Switch" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 EnrichmentBadge

## 🎯 Propósito
(FC-309). Representa el sistema de "Etiquetado AI Extraído" sobre Burbujas de Chat. Se aloja pasivamente en el fondo o bajo los mensajes del historial leyendo sus meta-análisis (Intenciones inferidas, estado emocional o sentimiento, idioma, Keywords, resúmenes). Traduce diccionarios asimétricos JSON de IA en Píldoras/Badges coloridos y comprensibles humanamente. Complementario contiene un Macro-componente Exportado (`EnrichmentPanel`) para despliegues complejos dentro de Modales.

## 📦 Estado y Datos
**Acople Directo a Data-Pipeline:**
- Carga el flujo de la cola de análisis invocando `useIsEnrichmentLoading(messageId)` permitiéndole dibujar estado `Loading / Spinners` temporal independiente mientras los Background Jobs en el backend leen el mensaje asíncronamente y emiten su informe final.
- Suplica los resultados concretos extraídos hacia el Store: `useMessageEnrichments(messageId)`.

## 🔄 Flujos de Interacción
1. **Delegador Visual Switch (`getEnrichmentDisplay`):** Es el traductor maestro de Meta-Types (Sentiment, Intent, Entities, Language). Actúa mapeando un identificador de variable en color semántico UI. Ejemplo: Si deduce "Sentiment" y valida "Negative", mapea violentamente Icons tipo Frown Face en fondo Variant `error`. Si es Intent emite variant `info` azul oscuro.
2. **Truncamiento Defensivo Inteligente (`showAll = false`):** Sabe que ensuciar un Chat Box con 90 badges es horrible UX. Opera priorizado por propensa de limpieza. Si tiene Múltiples Badges, corta violentamente empleando filter priorizando los top tier `['sentiment', 'intent', 'category']` y un `.slice(0,3)` para los tres más vitales. Reagrupando matemáticamente los escombros ocultos bajo una placa minúscula `+X ocultos`.
3. **Modal Expansion (`EnrichmentPanel`):** Opcional e independiente es la expansión gruesa de reportes. Si se requiere inspección de auditor, permite ver resúmenes textuales de alta complejidad, porcentajes directos de la métrica matemática de `Confidence`, e inyectar sub-pildoritas dinámicas de Extracción de Lenguaje NLP.

## 💡 Ejemplo de Uso
```tsx
import { EnrichmentBadge } from '../../components/enrichments/EnrichmentBadge';

<MessageFooter>
  {/* Visión limpia al usuario */}
  <EnrichmentBadge messageId={msg.id} />
  
  {/* Visión completa de Dev si se le hace Click de Inspección */}
  {showDevPanel && <EnrichmentPanel messageId={msg.id} />}
</MessageFooter>
```
