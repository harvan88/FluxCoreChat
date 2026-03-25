---
id: "rag-config-section"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/components/RAGConfigSection.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Uso dual de sliders y Fetch nativo put" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tablero Control IA de Hiperparametros Vectoriales" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Autosave Inmerso (600ms Debounce) sobre cada input Modificado" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 RAGConfigSection

## 🎯 Propósito
(Retriever-Augmented Generation Configurator). Es el panel de expertos para Bases Locales. Domina los parámetros profundos y científicos sobre cómo un PDF ingresado es triturado matemáticamente antes de sumirse a PostgreSQL Vector. Permite manipular qué algoritmo de partición (Chunking) ocurre, elegir el Modelo Matemático que mapeará en la Nube (Embeddings) y parametrizar cuántos pedazos traerá de vuelta durante la extracción de respuestas (TopK y Fallback MinScore).

## 📦 Estado y Datos
**Estado Esquizofénico Autosustentable:**
- Declara una macroestructura local temporal `config` con 3 ramas gigantes: Chunking, Embedding y Retrieval.
- Aplica el patrón "Salva sin botones". Todo slider movido muta su rama React State y de forma asíncrona martilla un `debouncedSave(newConfig)` para disparar al Backend PUT sin intervención Manual tras 600 milisegundos de paz.

## 🔄 Flujos de Interacción
1. **Acordeones Anidados Semánticos (`CollapsibleSection`):** Usa extensamente las secciones de Colapso con una propiedad agresiva Inversora Oculta `isCustomized`. Si un interruptor superior (Ej: "Fragmentación de Texto") se desmarca, toda la interfaz UI interior asume opacidades visuales (`opacity-50 pointer-events-none`) forzando el retorno mental a Defaults e impidiendo clics, pero conservando los estados viejos en memoria.
2. **Desplazamiento Dinámico Sensorial (Sliders):** Intercambia los áridos Input Numbers por `SliderInput`. Modificando en tiempo vivo el `Similitud Mínima` que va de 0.1 a 0.7 calculándole inmediatamente su formato perceptivo Humano `"30%"` para inyectar confianza algorítmica y previniendo que el usuario inserte datos suicidas (`minScore: 0.9` que dejarían el resultado ciego).

## 💡 Ejemplo de Uso
```tsx
import { RAGConfigSection } from '../../components/fluxcore/components/RAGConfigSection';

<RAGConfigSection 
   vectorStoreId="vs_xx110"
   accountId="wk_corp"
/>
```
