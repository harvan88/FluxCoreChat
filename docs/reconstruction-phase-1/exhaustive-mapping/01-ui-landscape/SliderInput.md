---
id: "slider-input"
type: "ui-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/ui/SliderInput.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "No depende de librerias de slider UI de terceros" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Input Numérico Visual e Interactivo Híbrido" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Calculo Algebraico de Dom Nodes Rect. Matemáticas Lineales Drag." }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🎚️ SliderInput

## 🎯 Propósito
Componente canónico para arrastre de valores (Ej. Temperatura AI de 0.0 a 2.0). Creado *FROM SCRATCH* ignorando el horrendo UI predeterminado web. Proporciona tracción Touch para el pulgar, rastreo de ratón por document.Listener y a su lado, ofrece precisión milimétrica abriendo campo al tipo texto clásico (input.type="number").

## 📦 Estado y Datos
**Falsa Verdad Temporal:**
- Emplea `localValue`. Para prevenir que un valor como "0." escrito en la caja colapse toda la app antes que termines de escribir "0.5", almacena tolerancias parciales sin disdrara `onChange()` hasta que el usuario saque el ratón (`onBlur`) de la caja.

## 🔄 Flujos de Interacción
1. **Perseguidora de Puntero Algebraico:** `calculateValueFromPosition()` toma `sliderRef.current.getBoundingClientRect()` transformando las coordenadas XY cartesianas del ratón/dedo en un valor fraccional (entre el Width de la varilla).
2. **Suscripción de Escape Hacia el Documento Master:** Añade `document.addEventListener('mousemove')` en cuanto el drag inicia (onMouseDown). De esta manera el control Deslizante no se quiebra al arrastrar fuerte si tú puntero abandona de casualidad el diminuto div.

## 💡 Ejemplo de Uso
```tsx
<SliderInput
    label="Temperatura"
    min={0}
    max={2}
    step={0.1}
    decimals={1}
    value={modelTemp}
    onChange={setTemp}
/>
```
