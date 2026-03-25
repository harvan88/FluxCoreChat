---
id: "agent-detail"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/agents/AgentDetail.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Envio/Validacion robusta de flujos AST JSON" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Visualizador y Editor de DAG de Pipeline Multi-Asistente" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Parsing JSON-String local, Dropdown flotante manual, Autoguardado" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 AgentDetail (View)

## 🎯 Propósito
Es el Editor de "Partituras" y configuraciones base para la capa Master (Agents). Se encarga de mostrar un form para un `Agent` con su Configuración de Trigger, Listado de Asistentes amarrados subyacentes, visualización de Seguridad (Tokens scope) y expone la artillería pesada: Un TextBox plano manipulable en modo Raw-JSON para alterar las reglas AST del Flujo de pensamiento (Flow).

## 📦 Estado y Datos
**Máquina Loca de JSON:**
Contiene `flowJson` (texto crudo). Trata de aislar lo que escribe el usuario antes de arrojarlo al contexto real permitiéndole equivocarse con el JSON de configuración; Cuando pinchas Guardar atrapará cualquier excepción `JSON.parse()` en un feo bloque de `flowError`.

## 🔄 Flujos de Interacción
1. **Inyección de Templates:** Esconde arriba un minúsculo engrane inteligente: "Plantillas". Al seleccionarla extrae estructuras pre-armadas en RAM del arreglo estático `AGENT_FLOW_TEMPLATES` e incrusta el Texto con una sobreescritura letal avisando mediante `confirm('Reemplazará el flujo')`.
2. **Visualización Horizontal:** Imprime visualmente una hilera horizontal concatenando con flechitas (`→`) todos los pasos detectados en el JSON para orientar al humano si configuró 4 o 10 nodos.

## 💡 Ejemplo de Uso
```tsx
<AgentDetailView 
  agent={fullAgentPayload} 
  onSaveFlow={putDataToServer} 
  onActivate={() => switchStatus('active')}
/>
```
