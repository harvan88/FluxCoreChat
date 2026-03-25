---
id: "storage-adapter-interface"
type: "infrastructure-interface"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/storage/storage-adapter.interface.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "AssetGateway, ProfileService, StorageFactory" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Contrato Abstracto de Almacenamiento" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Key generation (Tenant/Asset/Version), CRUD definitions, URL signing contract, Public access contract, Metadata retrieval" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ StorageAdapterInterface

## 🎯 Propósito
La interfaz `IStorageAdapter` es el contrato supremo que desacopla la lógica de negocio de FluxCore de la infraestructura de almacenamiento física. Define un lenguaje común para hablar con discos locales o nubes distribuidas, permitiendo que el sistema sea agnóstico al proveedor.

## 🚥 Operaciones Nucleares
Todos los adaptadores (S3, Local, etc.) deben garantizar:
-   **Inmutabilidad por Key**: Los archivos se referencian por una "clave" única estructurada.
-   **Soberanía de Firma**: Capacidad de generar URLs de acceso temporal.
-   **Gestión de Metadatos**: Recuperación de tamaño, tipo de contenido y última modificación de forma unificada.

## 🧬 Estrategia de Naming (Keys)
El contrato incluye funciones de utilidad para estandarizar cómo se guardan los archivos en el "Cubo" de almacenamiento:
-   **Assets**: `{accountId}/{assetId}/{version}`. Esto permite versionado nativo de archivos.
-   **Temporales**: `tmp/{sessionId}/{filename}`. Facilita la limpieza automática de restos de subidas fallidas.

## 🛡️ Seguridad por Diseño
La interfaz impone la distinción entre **SignedUrl** (acceso controlado y efímero) y **PublicUrl** (acceso directo para avatares públicos). Al centralizar estos métodos en la interfaz, FluxCore garantiza que cualquier nuevo proveedor que se añada en el futuro deba cumplir con los estándares de seguridad y resolución de rutas del sistema.

## 💡 Ejemplo de Uso
```typescript
// El adaptador/runtime se registra en el sistema
import { runtime } from 'apps/api/src/services/storage/storage-adapter.interface.ts';

// Invocado por el RuntimeGateway según la configuración de cuenta
const actions = await runtime.handleMessage(runtimeInput);
```
