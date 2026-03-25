---
id: "local-storage-adapter"
type: "infrastructure-adapter"
status: "stable"
criticality: "high"
location: "apps/api/src/services/storage/local-storage.adapter.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Node FS, Crypto, Assets API" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Persistencia en Disco" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Atomic file writes, Metadata storage (.meta.json), URL signing via SHA256, Path-traversal protection, Stream-based reading for large files, Batch delete operations" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Local Storage Adapter

## 🎯 Propósito
Este adaptador implementa la interfaz `IStorageAdapter` para el almacenamiento de archivos directamente en el sistema de archivos del servidor. Es la solución estándar para entornos de desarrollo y para el almacenamiento de assets locales (como avatares) que requieren alta velocidad de acceso.

## 🚥 Seguridad y Aislamiento
Implementa protecciones rigurosas contra ataques comunes:
-   **Anti-Path-Traversal**: Valida que ninguna ruta contenga `..` o caracteres que permitan salir del directorio base configurado (`uploads/assets`).
-   **URL Signing**: Genera URLs temporales seguras usando firmas HMAC (SHA256) con un secreto de sistema. Esto evita que usuarios no autorizados adivinen URLs de archivos privados.

## 🧬 Gestión de Metadatos
Debido a que el sistema de archivos tradicional no soporta metadatos personalizados (como `Content-Type`), el adaptador utiliza un sistema de archivos sombra:
-   Cada archivo `image.jpg` tiene un compañero secreto `image.jpg.meta.json`.
-   Este JSON guarda el tipo MIME original, la fecha de subida y metadatos adicionales de negocio, manteniendo la paridad de características con S3.

## 🛡️ Manejo de Streams
Para evitar el agotamiento de memoria RAM en el servidor con archivos grandes, el adaptador soporta `createReadStream`. Esto permite que el servidor web transmita los datos directamente desde el disco al cliente de forma progresiva (chunked), garantizando estabilidad bajo carga.

## 💡 Ejemplo de Uso
```typescript
// El adaptador/runtime se registra en el sistema
import { runtime } from 'apps/api/src/services/storage/local-storage.adapter.ts';

// Invocado por el RuntimeGateway según la configuración de cuenta
const actions = await runtime.handleMessage(runtimeInput);
```
