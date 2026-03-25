---
id: "ai-routes"
type: "backend-route"
status: "stable"
criticality: "high"
location: "apps/api/src/routes/ai.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "AI Service, Account Service, Execution Plan Service, Runtime Config" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gateway Principal de Operaciones de IA" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Eligibility checking, Tracing, Connectivity probing, Policy resolution, Runtime switching" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🚀 AIRoutes

## 🎯 Propósito
Constituye el punto de entrada a todas las capacidades de Inteligencia Artificial de FluxCore. Proporciona una interfaz rica tanto para el frontend como para herramientas de diagnóstico, permitiendo supervisar, configurar y depurar el comportamiento de los modelos de lenguaje.

## 🔍 Diagnóstico y Elegibilidad
- **`/status`**: Ofrece una visión del estado de conexión y entitlements para una cuenta específica.
- **`/eligibility`**: Endpoint crítico para el frontend que permite saber, ANTES de intentar generar una respuesta, si el sistema está listo (créditos, modelos, API keys).
- **`/probe`**: Herramienta de administrador para testear la conectividad real con proveedores (Groq/OpenAI) de forma aislada.

## 📉 Observabilidad (Prompt Tracing)
Maneja el ecosistema de **Traces**, permitiendo la auditoría profunda de qué se le envió a la IA y qué respondió ésta:
- Listado, Exportación (JSONL), Detalle y Limpieza de trazas.
- **Seguridad:** Todas las operaciones de traces requieren demostrar propiedad de la cuenta (`accountId`).

## 🛡️ Contexto de Políticas
- **`/policy-context`**: Resuelve el `FluxPolicyContext`, que es el bloque masivo de datos no autorizados que sirve como base para las decisiones de la IA en una conversación específica.

## ⚙️ Control de Runtime
- **`/runtime`**: Permite cambiar dinámicamente entre motores de ejecución (ej: pasar de usar el motor Legacy a usar el motor soberano `fluxcore` para una cuenta específica).

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './ai.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/ai', router);
```
