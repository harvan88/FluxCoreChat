---
id: "fluxcore-panel"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/FluxCorePanel.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Integrador superior, enlaza Views vs Sidebar" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Orquestador Visual del Área de Administración" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Switch puro de Componentes de Alto Nivel" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 FluxCorePanel

## 🎯 Propósito
(FC-ViewContainer). Es el Layout Orquestador que reemplaza a la interfaz de Chat clásica cuando un administrador accede a su Consola. Amarra el Sidebar oficial (`FluxCoreSidebar`) junto al motor de conmutación de Vistas Principales (Asistentes, Instrucciones, Vector Stores, Políticas, Debug Inspector). Prácticamente es la raíz del Área de Workspace para configuraciones directas de la plataforma IA.

## 📦 Estado y Datos
**Director de Vistas Ciego:**
- Su memoria (`activeView`) funciona únicamente con cadenas de texto estandarizadas del tipo `FluxCoreView` ('assistants', 'agents', 'debug', etc).
- Traspasa hacia abajo y a fondo de manera intacta los métodos `accountId` y `onOpenTab` para asegurar el enrutamiento cruzado en los Deep Links de otras vistas hijas.

## 🔄 Flujos de Interacción
1. **Intérprete Switch Inyectable (`renderContent`):** Se rige mediante sentencias `switch(activeView)` inyectadas. Si percibe `knowledge-base`, instauncia enteramente el componente mastodóntico `VectorStoresView` proveyéndole la herencia `accountId`.

## 💡 Ejemplo de Uso
```tsx
import { FluxCorePanel } from '../../components/fluxcore/FluxCorePanel';

// Integrado por el cargador Maestro de extensiones del App.
<ExtensionWrapper>
  <FluxCorePanel 
    accountId="usr_99X" 
    accountName="Mesa de Pagos" 
  />
</ExtensionWrapper>
```
