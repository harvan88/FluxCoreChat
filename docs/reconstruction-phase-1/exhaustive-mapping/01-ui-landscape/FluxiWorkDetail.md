---
id: "fluxi-work-detail"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/fluxcore/views/FluxiWorkDetail.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Llama datos forenses HTTP getWork" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Visor Forense Post-Morten Lineal de Eventos" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Intérprete de Timeline Vertical Nativo Creado a Mano" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 FluxiWorkDetail

## 🎯 Propósito
Si la fase formativa pre-creación pertenece a `FluxiProposedWorkDetail`, esta pieza es explícitamente el visor Forense y en Tiempo Real de un bloque ejecutable IA que ya arrancó o feneció en un Servidor en la sombra. Es el visualizador de Autopsias Crudas estructurado en Pestañas: Examinando los estados atómicos logrados de datos (`Slots`) e inyectando un componente Timeline con los latidos del cerebro (Eventuales y Cíclicos de Commits).

## 📦 Estado y Datos
**Descargador Exclusivo Singular:**
- Desconoce Listas, consume directamente el Endpoint `getWork` sobre la variable nativa HTTP y muta su entorno salvaje entre Pantallas de Cargando o Alertas rojas centradas por fallos.

## 🔄 Flujos de Interacción
1. **Intérprete de Identidad (Status Colorimétrico):** Declara su estado base mutando colores de Tailwind dependiendo textualmente de la variable HTTP provista del API. (`ACTIVE` -> primary, `CANCELLED` -> gray-500).
2. **Generador del Timeline Vertical Eventual (`activeTab === 'events'`):** Empleando magia pura de flexión y divisores relativos nativos de CSS sin apoyo de librerías extra (`border-l`, `-left-1.5`, `ring-surface`), teje una cronología visual conectada. Cada globo dibujado evalúa violentamente quién disparó el hilo en la base de datos (Ej. Dibuja rayos morados si el actor fue el Sistema, chulos verdes en `semantic_commit`, y equis rojas ensangrentadas en desbordamientos de buffers `error` acompañados de objetos JSON de autopsia expuestos horizontalmente en crudos strings `Delta`).

## 💡 Ejemplo de Uso
```tsx
import { FluxiWorkDetail } from '../../components/fluxcore/views/FluxiWorkDetail';

<TabsContainer>
   <FluxiWorkDetail accountId="acc_99" workId="wrk_1212" />
</TabsContainer>
```
