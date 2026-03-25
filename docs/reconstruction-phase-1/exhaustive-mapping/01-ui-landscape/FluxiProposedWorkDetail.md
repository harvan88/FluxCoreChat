---
id: "fluxi-proposed-work-detail"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/views/FluxiProposedWorkDetail.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Llama explícitamente a Endpoints REST de aprobamiento" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Modal de Auditoría Previa a Ejecución Humana Absoluta" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Dicotomía Descartar/Aprobar con Parsing Visual de Slots y Evidencias" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 FluxiProposedWorkDetail

## 🎯 Propósito
Es esencialmente la antesala judicial del sistema, la "Cámara de Supervisión Humana". Antes de que el Modelo de IA (Fluxi) actúe autómata en un trabajo sensitivo, deja esta propuesta varada. Este componente interroga a la base de datos por los detalles lógicos (Entendimiento NLP) logrados y los renderiza en un tablero ordenado desglosando el Intento, evidencias citadas en crudo textual (Quotes), y proveyendo los gatillos de Juicio de Vida o Deceso ("Descartar" o "Aprobar y Abrir").

## 📦 Estado y Datos
**Acople de Red Autónomo:**
- Ignora Stores inyectados, asumiendo responsabilidad HTTP inicial en un hook `useEffect` tirando de la función vital directa de backend `api.getProposedWork(accId, workId)`.
- Maneja un cerrojo asíncrono para prevenir fallas o pánicos del frontend de doble-ingreso manejando estados paralelos de `isLoading` (Descargando vista) e `isProcessing` (Mutando servidor humano).

## 🔄 Flujos de Interacción
1. **Intérprete Forense Plegable (`Candidate Slots`):** Imprime iteraciones densas con las deducciones empíricas de la red neuronal. Genera bloques visuales para "Path deducido" vs "Valor transformado" acompañándolo mediante una tira estilística de comillas (Quote Icon) en itálicas explicitando textualmente el motivo subyacente de la fuente (`evidence`).
2. **Motor Mutativo de Extinción (`handleAction`):** En función a las dos banderas duras implementadas (`open` o `discard`), tranca permanentemente los botones asumiendo el spinner nativo, lanza las ráfagas HTTP `openWork` o `discardWork` rellenando temporalmente el control con Alerts puros nativos, hasta que la pestaña pueda refrescar en siguientes patches evolutivos de UX.

## 💡 Ejemplo de Uso
```tsx
import { FluxiProposedWorkDetail } from '../../components/fluxcore/views/FluxiProposedWorkDetail';

if (currentModal === 'approve-work') {
   return <FluxiProposedWorkDetail accountId="123" proposedWorkId="wrk_uuid_99" />;
}
```
