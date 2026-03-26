---
id: "capability-registry.service"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/services/capability-registry.service.ts"
---

# 🤖 capability-registry.service

## 🎯 Propósito
Es el repositorio central y "Single Source of Truth" para todas las definiciones de capacidades (`FluxCoreCapability`) disponibles en el sistema. Proporciona una interfaz unificada para listar, buscar y recuperar la metadata de las herramientas que la IA puede utilizar.

## 🏗️ Arquitectura
El servicio mantiene una lista estática interna de definiciones (como `SYSTEM_SEARCH_KNOWLEDGE`, `SYSTEM_SEND_TEMPLATE`, etc.) y expone métodos de consulta para otros servicios de la plataforma (como `capability-offer` y `capability-translation`).

## 🧱 Dependencias
- **Depende de:** `../core/capabilities` (donde residen las definiciones canónicas).
- **Es usado por:** `capability-offer.service.ts`, `capability-translation.service.ts`, `capability-execution.service.ts`.

## 💡 Ejemplo de Uso
```typescript
import { capabilityRegistryService } from './services/capability-registry.service';

const capability = capabilityRegistryService.getBySlug('search_knowledge');
if (capability) {
  console.log('Nombre de herramienta:', capability.name);
}
```
