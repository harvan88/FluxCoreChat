---
id: "storage-adapter-factory"
type: "infrastructure-factory"
status: "stable"
criticality: "high"
location: "apps/api/src/services/storage/storage-adapter.factory.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "LocalStorageAdapter, S3StorageAdapter, Environment Variables" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Fábrica Singleton de Adaptadores de Storage" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Auto-detection logic (S3 to Local fallback), Singleton instance management, Dynamic path resolution (Mono-repo aware), Instance reset (for tests)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ StorageAdapterFactory

## 🎯 Propósito
La `StorageAdapterFactory` es el componente encargado de instanciar y proveer el adaptador de almacenamiento correcto para toda la aplicación. Implementa un patrón **Singleton** para asegurar que el sistema no cree múltiples conexiones o gestores de archivos innecesarios.

## 🚥 Lógica de Selección
La fábrica decide qué adaptador usar basándose en la variable `STORAGE_PROVIDER`:
1.  **s3**: Intenta cargar la configuración de S3. Si fallan las credenciales, lanza un error crítico.
2.  **local**: Fuerza el uso de disco local. Detecta automáticamente si está corriendo dentro del directorio `apps/api` o desde la raíz del mono-repo para ajustar las rutas de `uploads` de forma inteligente.
3.  **auto (Default)**: La opción más resiliente. Intenta configurar S3; si las variables no están presentes o fallan, cae automáticamente al adaptador de disco local (**Fallback**).

## 🧬 Inteligencia de Rutas
La fábrica resuelve las rutas relativas para el adaptador local asegurando que, independientemente de dónde se ejecute el proceso de Bun/Node, los archivos siempre terminen en `apps/api/uploads/assets`. Esto previene la dispersión de archivos temporales por todo el disco duro del desarrollador.

## 🛡️ Facilidad de Testing
Provee métodos como `resetStorageAdapter()`, permitiendo a las suites de pruebas limpiar la instancia singleton y re-configurar adaptadores de Mock o Local en medio de la ejecución, garantizando aislamiento total entre tests de integración.

## 💡 Ejemplo de Uso
```typescript
// El adaptador/runtime se registra en el sistema
import { runtime } from 'apps/api/src/services/storage/storage-adapter.factory.ts';

// Invocado por el RuntimeGateway según la configuración de cuenta
const actions = await runtime.handleMessage(runtimeInput);
```
