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
2.  **local**: Fuerza el uso de disco local. Detecta el puerto dinámicamente desde `FLUXCORE_PORT` (default 3001) para construir URLs accesibles desde cualquier proceso.
3.  **auto (Default)**: Intenta configurar S3; si falla, cae automáticamente al adaptador de disco local (**Fallback**).

## 🧬 Inteligencia de Rutas (Multi-Proceso)
La fábrica ahora utiliza una lógica de **Raíz de Proyecto Absoluta**:
*   Detecta si el proceso se ejecuta desde una subcarpeta (`apps/`) o la raíz.
*   Construye una ruta absoluta hacia `apps/api/uploads/assets`.
*   Esto garantiza que tanto el proceso `api` como el `kernel` compartan exactamente el mismo storage físico, evitando que las imágenes se "pierdan" entre procesos independientes.

## 🛡️ Facilidad de Testing
Provee métodos como `resetStorageAdapter()`, permitiendo a las suites de pruebas limpiar la instancia singleton y re-configurar adaptadores de Mock o Local en medio de la ejecución, garantizando aislamiento total entre tests de integración.

## 💡 Ejemplo de Uso
```typescript
// El adaptador/runtime se registra en el sistema
import { runtime } from 'apps/api/src/services/storage/storage-adapter.factory.ts';

// Invocado por el RuntimeGateway según la configuración de cuenta
const actions = await runtime.handleMessage(runtimeInput);
```
