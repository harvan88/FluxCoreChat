---
id: "asset-gateway-service"
type: "infrastructure-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/asset-gateway.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "StorageAdapters, AssetRegistryService (consumer), Drizzle (uploadSessions)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Orquestador de Ingesta de Archivos" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Session lifecycle (TTL 10m), MIME/Size validation, Chunked upload processing, SHA256 integrity verification, Expired session auto-cleanup" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AssetGatewayService

## 🎯 Propósito
El `AssetGatewayService` es la única aduana de entrada para binarios en FluxCore. Gestiona el flujo temporal desde que un usuario (o sistema) decide enviar un archivo hasta que este es validado, hasheado y entregado al `AssetRegistry` para su persistencia definitiva.

## 🏛️ Arquitectura/Integración
### Sesiones de Upload
Todo upload requiere una sesión previa. Esto permite:
-   **Pre-validación**: Verificar límites de tamaño (Default 100MB) y tipos de archivo permitidos antes de recibir un solo byte.
-   **Seguridad**: Vincular el upload a un `accountId` y `uploadedBy` desde el inicio.
-   **Temporalidad**: Las sesiones expiran en 10 minutos para liberar recursos en caso de uploads incompletos.

## 🧬 Procesamiento de Chunks
El servicio soporta uploads fragmentados. Gestiona la concatenación de datos en el storage temporal (`generateTempStorageKey`) y mantiene un contador de `chunksReceived` y `bytesUploaded`. Al finalizar (Commit), el gateway descarga el binario completo de forma efímera para calcular su checksum SHA256 real.

## 🛡️ Autolimpieza (Cleanup)
Implementa una política de `cleanupExpiredSessions`. Periódicamente (o bajo demanda), el servicio escanea la base de datos en busca de sesiones que excedieron su `expiresAt` o quedaron en estado `uploading` infinito, eliminando los archivos huérfanos del almacenamiento temporal para evitar fugas de costes de storage.

## 🔗 Dependencias Externas
- **StorageAdapters**: Agnóstico al storage subyacente (S3, disco local).
- **AssetRegistryService**: Consumidor final al que le delega el archivo verificado.
- **Drizzle (uploadSessions)**: Entidad de base de datos interina.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { assetGatewayService } from 'apps/api/src/services/asset-gateway.service.ts';

// Ejemplo de invocación típica
const result = await assetGatewayService.execute(params);
```
