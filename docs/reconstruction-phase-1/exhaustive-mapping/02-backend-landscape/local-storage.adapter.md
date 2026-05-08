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
-   **Anti-Path-Traversal**: Valida que ninguna ruta contenga `..` o caracteres que permitan salir del directorio base.
-   **URL Signing**: Genera URLs temporales seguras usando firmas HMAC (SHA256).
-   **Port-Aware URLs**: Detecta el puerto del servidor (`FLUXCORE_PORT`) para asegurar que las URLs generadas en procesos secundarios (como el Kernel) apunten correctamente al servidor de assets en la API (usualmente puerto 3001).

## 🧬 Gestión de Metadatos
Cada archivo `image.jpg` tiene un compañero `image.jpg.meta.json` que guarda el tipo MIME original y metadatos adicionales, manteniendo la paridad de características con S3.

## 💡 Ejemplo de Uso
```typescript
import { LocalStorageAdapter } from './local-storage.adapter';

const storage = new LocalStorageAdapter({
  basePath: '/absolute/path/to/uploads',
  baseUrl: 'http://localhost:3001/uploads/assets'
});

const url = await storage.getSignedUrl('my-image.png', { expiresInSeconds: 3600 });
```
