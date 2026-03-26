---
id: "runtime-input-factory.service"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/fluxcore/runtime-input-factory.service.ts"
---

# 🤖 runtime-input-factory.service

## 🎯 Propósito
Centraliza la construcción del `RuntimeInput` que se entrega a los motores de IA. Su función crítica es transformar los contextos brutos (Policy, DB, Config) en un objeto de entrada autorizado y "blindado", proporcionando además los servicios de herramientas (`RuntimeServices`) que la IA usará durante el razonamiento.

## 🏗️ Arquitectura
El servicio ensambla el `AuthorizedRuntimeContext` (lo que la IA *sabe*) y los `RuntimeServices` (lo que la IA *puede hacer*). 

Puntos clave:
- **Aislamiento de Herramientas:** Implementa el método `executeTool` delegando la lógica a la plataforma (Registry, Offer, Execution), protegiendo al runtime de la implementación técnica de las herramientas.
- **Normalización Dinámica:** Aplica `capabilityArgumentNormalizer` para asegurar que los argumentos del LLM se ajusten al contrato de FluxCore.
- **Detección de Modos:** Diferencia entre ejecuciones sincrónicas (RAG) y declarativas (Comandos de plantillas).

## 🧱 Dependencias
- **Depende de:** `capability-offer.service.ts`, `capability-execution.service.ts`, `capability-argument-normalizer.service.ts`.
- **Es usado por:** `cognitive-dispatcher.service.ts`.

## 💡 Ejemplo de Uso
```typescript
import { runtimeInputFactoryService } from './services/fluxcore/runtime-input-factory.service';

const input = await runtimeInputFactoryService.build({
  accountId,
  conversationId,
  runtimeId: 'local',
  policyContext,
  runtimeConfig,
  conversationHistory
});

// Este 'input' es el que recibe el runtimeGateway.invoke
```
