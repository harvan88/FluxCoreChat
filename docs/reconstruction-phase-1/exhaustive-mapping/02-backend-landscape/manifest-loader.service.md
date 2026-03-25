---
id: "manifest-loader-service"
type: "infrastructure-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/manifest-loader.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Filesystem (manifest.json), ExtensionService" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Cargador y Validador de Metadatos de Extensiones (FC-155)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Manifest validation, Built-in extension registration, Directory scanning, Default config generation" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ ManifestLoaderService

## 🎯 Propósito
El `ManifestLoaderService` es el encargado de leer y certificar la identidad de las piezas de software externas (extensiones). Asegura que cualquier código que intente integrarse al sistema cumpla con el esquema técnico y declare explícitamente qué permisos necesita.

## 🚥 Validación Estricta
Cada extensión debe proporcionar un `manifest.json`. El cargador valida:
-   **Identidad**: ID único, versión semver y autor.
-   **Permisos**: Solo permite declarar permisos de una lista blanca pre-aprobada (ej. `read:context.public`, `send:messages`).
-   **Config Schema**: Esquema para los formularios de configuración en la UI, incluyendo tipos de datos y valores por defecto.

## 🏗️ Extensiones Built-in
El sistema viene con extensiones pre-registradas (como `@fluxcore/asistentes`). El cargador las inyecta en el esquema de arranque para asegurar que las capacidades núcleo estén disponibles desde el primer segundo sin necesidad de escaneo de disco adicional.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { manifestLoaderService } from 'apps/api/src/services/manifest-loader.service.ts';

// Ejemplo de invocación típica
const result = await manifestLoaderService.execute(params);
```
