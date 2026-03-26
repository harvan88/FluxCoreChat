---
id: "capability-translation.service"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/capability-translation.service.ts"
---

# 🤖 capability-translation.service

## 🎯 Propósito
Este servicio es el responsable de transformar las definiciones experimentales o canónicas de `FluxCoreCapability` en esquemas técnicos (`toolSchema`) que los motores de IA (OpenAI, Local) pueden entender. Centraliza la lógica de "traducción" de contratos de plataforma a formatos de herramientas.

## 🏗️ Arquitectura
Toma una capacidad del `CapabilityRegistryService` y extrae su `jsonSchema`, `instructionBlock` y otros metadatos necesarios para la inferencia. Esto permite que el sistema evolucione los contratos internos sin romper la compatibilidad con los runtimes.

## 🧱 Dependencias
- **Depende de:** `capability-registry.service.ts`.
- **Es usado por:** `capability-offer.service.ts`, `capability-openai-compat.service.ts`.

## 💡 Ejemplo de Uso
```typescript
import { capabilityTranslationService } from './services/capability-translation.service';

const translation = capabilityTranslationService.translateToTool('search_knowledge');
if (translation) {
  // Enviar translation.toolSchema al LLM
}
```
