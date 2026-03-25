---
id: "dynamic-container"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/panels/DynamicContainer.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "ViewRegistry System y ExtensionHost. Fallback local de estado Zustand" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tótem Arquitectónico No. 11 de la Interfaz" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "El gran router de vistas secundarias (Centro de trabajo). Evita re-renders externos." }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 DynamicContainer

## 🎯 Propósito
Es el "Gran Lienzo" de Flujo Central y el Enrutador Visual Interno de la aplicación completa (Tótem P11). No obedece a React-Router (URLs web), sino al sistema de Workspaces multi-panel. Recibe configuraciones directas para bifurcar qué componente pesado debe ser pintado en este cajón en este momento: Un chat de WhatsApp, El sistema de Monitoreo de Kernel, el Gestor de Plantillas PDF o las vistas remotas orquestadas por Sistemas de Extensiones (Plugin Manager). 

## 📦 Estado y Datos
**Súper Controlador de Entorno:**
- `container`: Recibe un descriptor gigante tipado (`DynamicContainerType`), con listas completas de pestañas abiertas internamente (`tabs[]`) y el foco actual.
- Usa `usePanelStore` global de flujo interactivo para apoderarse visualmente si el usuario acciona su recubrimiento. Instancia `isActive`.
- Conecta un `ErrorBoundary` de Clase obsoleto de React (Robusto por herencia) para atrapar explosiones locales de chats y evadir corrupciones generales UI.

## 🔄 Flujos de Interacción
1. **Intérprete ViewRegistry (Extensible):** A nivel núcleo opera bajo patrón Factory. Consulta primariamente en caliente al subsistema de plugins `viewRegistry` para validar si el render corresponde a un módulo externo encapsulado. 
2. **Auto-Descubridor Fallback (El Switch Titánico):** Si es funcionalidad nativa, entra a una maquinaria Switch-Case abrumadora y monstruosa empujando subcomponentes vitales al lienzo. (Ej. Renderizando el `OpenAIAssistantEditor`, o delegando a `ExtensionTabContent` cuando nota prefijos ajenos y `MonitoringHub`).
3. **Mecánica de Minimización Fluida:** Si detecta que su propiedad reducida global reza `container.minimized`, anula su cascada render destructiva masiva y retorna estrictamente un componente lateral mudo sin cuerpos (`TabBar`).
4. **Acoples Sub-Dimensionales:** Todas las rutas generadas dentro de esta maquinaria empujan una llave única transversal (`identity`) acoplada a las Sesiones Multi-Tenant (`selectedAccountId`), salvaguardando que un usuario no pueda cruzar ventanas del Locatario A mientras visualiza locaciones del Locatario B.

## 💡 Ejemplo de Uso
```tsx
import { DynamicContainer } from '../../components/panels/DynamicContainer';

// Se instancia únicamente dentro de constructos como Multi-grids
{containers.map(c => (
    <DynamicContainer 
       key={c.id} 
       container={c} 
       isActive={activeContainer === c.id} 
    />
))}
```
