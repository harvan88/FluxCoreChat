---
id: "fluxi-list"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/fluxcore/views/FluxiList.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Envoltura Genérica de CollectionView" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tabla Inteligente Listadora de Propuestas Fluxi" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Configurador polimórfico de Columnas Condicionales (Proposed/Active)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 FluxiList

## 🎯 Propósito
Ofrece una solución de Visualización en retícula o Listado para la matriz atípica de Inteligencia Artificial que involucra los "Fluxi Works". Modela una colección de datos de trabajos delegados en segundo plano, adoptando una piel semántica condicional frente a si está abordando un trabajo Histórico ya finalizado, uno Activo quemando tokens, o una Propuesta (Proposed) alzada por el LLM esperando aprobación humana.

## 📦 Estado y Datos
**Inyección Frontal Pasiva:**
- Actúa enteramente dependiendo del string Enum inyectado `type`: `proposed | active | history`.

## 🔄 Flujos de Interacción
1. **Arquitectura Condicional de Columnas:** Configura al vuelo la tabla hija (Un `CollectionView`). Analiza su propiedad intrínseca `type`, y si halla que NO está renderizando iteraciones de tipo `proposed` ejecuta un barrido asesino `columns.filter(col => false)` silenciando el renderizado de la columna entera referida a "Confianza % Matemática" al carecer de sentido visual en tareas que ya operaron.
2. **Badge-Transformer Colorimétrico:** Si el elemento analizado está propuesto y atorado, en lugar de invocar Badges del sistema invoca contornos propios grises (`Pendiente`). Para el resto confía en la envoltura oficial `<StatusBadge />` atada a Enums globales. Pinta los bordes y gradientes dependendiendo del margen probabilístico duro (Verde > 80%, Rojo < 50%).

## 💡 Ejemplo de Uso
```tsx
import { FluxiList } from '../../components/fluxcore/views/FluxiList';

<FluxiList 
   type="history" 
   works={myArchivedWorks} 
   loading={false}
   title="Historial de Delegaciones"
   onSelect={rowId => openAuditModal(rowId)}
/>
```
