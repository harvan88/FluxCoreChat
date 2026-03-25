---
id: "openai-vector-store-detail"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/vectorStores/OpenAIVectorStoreDetail.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Inyectado con VectorStoreFilesSection" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Visualizador Proxy de Archivos en la Nube (OpenAI)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Manipulación de Expiración en remoto y lectura de Gastos/Costos estimatorios" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 OpenAIVectorStoreDetail

## 🎯 Propósito
Contraparte del Detail Local. Funciona como un Proxy Espejo "solo-lectura parcial" de una base de datos vectorial hospedada íntegramente en los servidores de OpenAI. Carece intencionalmente del tester "RAGConfigSection" porque OpenAI no nos deja modificar sus algoritmos internos de Chunking; a cambio, expone métricas de Dinero y facturación basadas en su consumo de disco en la nube, y políticas de borrado autogestionadas por OpenAI para limpiar inactividad.

## 📦 Estado y Datos
**Acople Informativo Nube:**
- Adopta todo un objeto VectorStore pre-poblado. Absorbe e interpreta variables externas provenientes de la sincronización como `store.externalId` y sus propiedades anidadas contables de peso para dólares estadísticos.

## 🔄 Flujos de Interacción
1. **Píldoras Híbridas de Destrucción Automática (`expirationPolicy`):** Entiende que el cloud cuesta dinero. Por ende, interfiere el Switch `Checkbox` ofreciendo la mutación para que OpenAI barra la BD entera después de X días borrándolo todo. Si detona el update con `after_days`, activa inputs numéricos y precalcula una franja de impacto (`formatDate(store.expiresAt)`).
2. **Tablas Forenses (VectorStoreDiagnosticSection):** Se diferencia de local al adjuntarle una sección de diagnósticos severos, que escanea por debajo los Sync Logs para ver si OpenAI se atoró parseando algún PDF sucio enviando telemetría de fallas en red.

## 💡 Ejemplo de Uso
```tsx
import { OpenAIVectorStoreDetail } from '../../components/fluxcore/vectorStores/OpenAIVectorStoreDetail';

<OpenAIVectorStoreDetail 
   store={openAiCloudDB}
   accountId="wk_110"
/>
```
