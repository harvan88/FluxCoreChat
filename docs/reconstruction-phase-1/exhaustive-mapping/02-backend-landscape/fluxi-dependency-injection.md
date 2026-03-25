---
id: "fluxi-dependency-injection"
type: "infrastructure-helper"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/fluxcore/fluxi-dependency-injection.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "WorkEngineService, MessageCore, FluxiRuntime" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Inyector de Capacidades para WES" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Runtime configuration assembly, Cross-service dependency resolution, Health validation of core services, LLM parameter defaults" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Fluxi Dependency Injection

## 🎯 Propósito
Este servicio resuelve las dependencias complejas del `FluxiRuntime`. Debido a la arquitectura de desacoplamiento de FluxCore, los runtimes (que son puros y sin estado) no pueden acceder directamente a servicios pesados de negocio. Este inyector prepara el terreno empaquetando las capacidades necesarias antes de la ejecución.

## 🚥 Ensamblado del RuntimeConfig
Construye el objeto de configuración que se pasa al runtime en cada mensaje:
-   **Capacidad de Trabajo**: Inserta el `workEngineService`.
-   **Capacidad de Realidad**: Inserta el `messageCore`.
-   **Parámetros LLM**: Define el proveedor (ej: Groq) y el modelo predeterminado para las tareas del Work Engine.

## 🧬 Validación de Salud
Antes de iniciar una ráfaga cognitiva, el DI ofrece `validateFluxiServices()`. Este método actúa como una pre-comprobación de salud (Health Check) específica para el motor transaccional, asegurando que todos los conectores vitales estén vivos antes de quemar tokens de IA.

## 🛡️ Desacoplamiento de Servicios
Su existencia permite que `FluxiRuntime` sea testeable en aislamiento. Al no importar los servicios globales directamente, el runtime puede recibir "mocks" (simulacros) de estos servicios a través del inyector, lo que facilita el desarrollo de tests unitarios complejos para la lógica de estados de tareas.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: fluxi-dependency-injection
import { fluxiDependencyInjection } from 'apps/api/src/services/fluxcore/fluxi-dependency-injection.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await fluxiDependencyInjection.process(input);
```
