---
id: "asset-relations-routes"
type: "backend-route"
status: "stable"
criticality: "medium"
location: "apps/api/src/routes/asset-relations.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Asset Relations Service, Chat Core context" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Vinculación de Archivos" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Message-Asset Linking, Template-Asset Linking, Plan-Asset Linking" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🚀 AssetRelationsRoutes

## 🎯 Propósito
Expone los endpoints necesarios para gestionar la relación lógica entre los Archivos (`Assets`) y las diferentes entidades del ecosistema Chat Core (Mensajes, Plantillas y Planes de Ejecución). No gestiona archivos físicos, sino sus "punteros" y metadatos de uso.

## 📡 Grupos de Endpoints
### 1. Mensajes (`/messages/:id/assets`)
- Permite adjuntar archivos a mensajes enviados o recibidos.
- Soporta múltiples versiones y ordenamiento por posición.

### 2. Plantillas (`/templates/:id/assets`)
- Gestiona los archivos estáticos o dinámicos vinculados a plantillas (ej: el PDF de un catálogo).
- Introduce el concepto de **Slots**, permitiendo asignar assets a espacios específicos de la plantilla.

### 3. Planes de Ejecución (`/plans/:id/assets`)
- Crucial para la IA. Gestiona la disponibilidad de assets necesarios para que un plan de ejecución progrese (ej: un documento que la IA debe leer antes de responder).
- Soporta estados de "Ready" y tipos de dependencia (Requerido vs Opcional).

## 🛡️ Propiedad
A diferencia del `AssetGateway`, este servicio pertenece estrictamente a **Chat Core**, actuando como el pegamento entre el almacenamiento de archivos y el flujo de la mensajería.

## 💡 Reverse Lookup
- **`GET /assets/:assetId/links`**: Permite saber en qué partes del sistema se está usando un archivo específico, fundamental para prevenir el borrado accidental de archivos que aún están en uso.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './asset-relations.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/asset/relations', router);
```
