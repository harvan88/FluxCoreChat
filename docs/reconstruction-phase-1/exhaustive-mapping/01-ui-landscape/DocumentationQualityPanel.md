---
id: "documentation-quality-panel"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/monitor/DocumentationQualityPanel.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Enlace Directo AST (Petición HTTP a backend FluxCore)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Monolito Juez del Systema y Hub Monitor" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Renderizado Masivo Condicional e Invoca Callbacks System Shell" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 DocumentationQualityPanel

## 🎯 Propósito
Es el "Gran Juez de la Verdad" (Single Source of Truth) utilizado por herramientas como Antigravity Agents e Ingenieros de Plataforma. Permanece permanentemente alojado en el Monitoring Hub informando un vistazo macro detallado sobre qué tan saludable, precisa, íntegra y mecánicamente robusta es la Documentación de Arquitectura de todo el Sistema. Abarca métricas de UI, Base de datos y Backend NodeJS, indicando de forma explícita archivos huérfanos y cobertura pura de archivos físicos.

## 📦 Estado y Datos
**Mega Estructura Volátil (`DocumentationMetrics`):**
- Descansa sobre un volcado JSON masivo con índices y métricas frías recuperado de `/api/fluxcore/documentation/quality` (e.g. `qualityScore`, `uiCoverage`, `wipDocs`, `isUiValid`, arrays grandes de strings errados).
- Estado de Interface Acordeones (`expandedSections`) garantizando UX comprimible predefinida en cerrada para evadir sobrecargas en DOM.

## 🔄 Flujos de Interacción
1. **Ruptura de Cachés Forzada (`Date.now()`):** Todas las solicitudes de fetch eluden la rehidratación o memorizaciones erróneas del protocolo HTTP utilizando un truco nativo inyectando Timestamp de Query (`?t=`).
2. **Motor Supervisor Atómico (FASE 1: Discovery):** Invoca proactivamente un parámetro especial de red (`forceDiscovery=true`). Este lanza una instrucción al AST parser de Node bloqueando el frontend hasta que el analizador estático indexe y genere mágicamente los esqueletos markdown faltantes.
3. **Pipeline Reactivo a Alertas (`mathematicalValidation`):** Condicionalmente aplica paneles rojos gigantes o chips verdes cruzando matrices enteras (Por ejemplo `totalDocs ==  uiDocsCount + backendDocsCount`), evaluando si la suma de archivos escaneados físicamente es real. 
4. **Utilidad Macro (`CopyButton`):** Instancia portapapeles universales al final de los listados permitiendo extraer los strings crudos de "Componentes no documentados" listos para ser arrojados al Prompt general de un Agente IA Asistencial de Documentación.

## 💡 Ejemplo de Uso
```tsx
import { DocumentationQualityPanel } from '../../components/monitor/DocumentationQualityPanel';

// Integrado mediante render dinámico del DynamicContainer.
{view === 'documentation' && <DocumentationQualityPanel />}
```
