---
id: "audio-processing-service"
type: "utility-service"
status: "stable"
criticality: "low"
location: "apps/api/src/services/audio-processing.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "None (Pure Computational)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Generador de Formas de Onda para UI" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Waveform generation, Audio-to-Visual sampling, Array normalization" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AudioProcessingService

## 🎯 Propósito
Este servicio es una utilidad técnica para la visualización de audio. Transforma datos binarios de sonido en una estructura numérica simplificada (Waveform) que el frontend puede dibujar para dar feedback visual al usuario durante la reproducción o grabación de notas de voz.

## 🚥 Proceso de Muestreo (Sampling)
-   **Normalización**: Recorre el buffer de audio y agrupa los picos de potencia en `N` muestras (por defecto 64).
-   **Visual-Friendly**: Aplica un offset (`-128`) para centrar los valores alrededor del eje cero, permitiendo que las barras de la UI crezcan hacia arriba y hacia abajo simétricamente.
-   **Eficiencia**: Utiliza un algoritmo de un solo paso con complejidad `O(n)` para procesar audios largos rápidamente.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { audioProcessingService } from 'apps/api/src/services/audio-processing.service.ts';

// Ejemplo de invocación típica
const result = await audioProcessingService.execute(params);
```
