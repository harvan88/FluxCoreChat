---
id: "asset-gateway-service"
type: "core"
status: "needs_review"
criticality: "critical"
location: "apps/api/src/services/asset-gateway.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "StorageAdapters, AssetRegistryService (consumer), Drizzle (uploadSessions)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Orquestador de Ingesta de Archivos con Validación UUID" }
  operations: { status: "complete", completed_date: "2026-03-25", confidence: 100, notes: "Session lifecycle (TTL 10m), MIME/Size validation, UUID validation, Chunked upload processing, SHA256 integrity verification, Expired session auto-cleanup" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
last_update: "2026-03-25"
update_reason: "Añadida validación UUID para uploadedBy"
---

# ⚙️ AssetGatewayService

## 🎯 Propósito
El `AssetGatewayService` es la única aduana de entrada para binarios en FluxCore. Gestiona el flujo temporal desde que un usuario (o sistema) decide enviar un archivo hasta que este es validado, hasheado y entregado al `AssetRegistry` para su persistencia definitiva. **IMPORTANTE:** Ahora incluye validación UUID estricta para `uploadedBy`.

## 🏛️ Arquitectura/Integración
### Sesiones de Upload
Todo upload requiere una sesión previa. Esto permite:
-   **Pre-validación**: Verificar límites de tamaño (Default 100MB), tipos de archivo permitidos, y **validación UUID de uploadedBy** antes de recibir un solo byte.
-   **Seguridad**: Vincular el upload a un `accountId` y `uploadedBy` validado desde el inicio.
-   **Temporalidad**: Las sesiones expiran en 10 minutos para liberar recursos en caso de uploads incompletos.

### 🔐 **Validación UUID (2026-03-25)**
Se añadió validación estricta en `createUploadSession`:
```typescript
// Validar uploadedBy como UUID válido o null
if (params.uploadedBy) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(params.uploadedBy)) {
    throw new Error(`Invalid uploadedBy: "${params.uploadedBy}". Expected valid UUID or null.`);
  }
}
```

## 🧬 Procesamiento de Chunks
El servicio soporta uploads fragmentados. Gestiona la concatenación de datos en el storage temporal (`generateTempStorageKey`) y mantiene un contador de `chunksReceived` y `bytesUploaded`. Al finalizar (Commit), el gateway descarga el binario completo de forma efímera para calcular su checksum SHA256 real.

## 🛡️ Autolimpieza (Cleanup)
Implementa una política de `cleanupExpiredSessions`. Periódicamente (o bajo demanda), el servicio escanea la base de datos en busca de sesiones que excedieron su `expiresAt` o quedaron en estado `uploading` infinito, eliminando los archivos huérfanos del almacenamiento temporal para evitar fugas de costes de storage.

## 🔗 Dependencias Externas
- **StorageAdapters**: Agnóstico al storage subyacente (S3, disco local).
- **AssetRegistryService**: Consumidor final al que le delega el archivo verificado.
- **Drizzle (uploadSessions)**: Entidad de base de datos interina.

## 🔍 **Dudas Técnicas (Needs Review)**
1. **Performance Impact:** ¿La validación UUID regex impacta significativamente el performance de createSession?
2. **Error Handling:** ¿Los errores de UUID se manejan consistentemente en todos los consumidores?
3. **Null vs UUID:** ¿Deberíamos permitir null o requerir siempre UUID para uploadedBy?

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { assetGatewayService } from 'apps/api/src/services/asset-gateway.service.ts';

// Ejemplo de invocación típica
const result = await assetGatewayService.execute(params);
```
