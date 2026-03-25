---
id: "marketplace-service"
type: "logic-service"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/marketplace.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (listings, subscriptions, reviews, assetPermissions, vectorStores)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Plataforma de Intercambio de Activos (RAG-005)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Listing management (CRUD), Search with filters/pricing, Subscription handling, Asset permission link, Review system" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ MarketplaceService

## 🎯 Propósito
Este servicio gestiona la economía de activos dentro de FluxCore. Permite a los usuarios (Sellers) publicar sus Vector Stores o configuraciones de IA para que otros usuarios (Subscribers) puedan comprarlos o suscribirse a ellos.

## 🚥 Conversión Suscripción -> Permiso
La funcionalidad más crítica es el puente entre la transacción financiera y el acceso técnico. Cuando un usuario se suscribe a un listing, el `MarketplaceService` crea automáticamente un registro en `fluxcore_asset_permissions`, otorgando acceso de lectura al asset subyacente de forma transparente.

## 🔍 Motor de Búsqueda de Activos
Implementa un sistema de búsqueda complejo con soporte para:
-   **Filtros**: Por categoría, modelo de precio (gratis/pago) y rangos.
-   **Ordenamiento**: Por popularidad (suscriptores), rating (reviews) o fecha de publicación.
-   **Moderación**: Soporta estados de publicación (`active`, `archived`) preparando el sistema para un flujo de revisión administrativa.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { marketplaceService } from 'apps/api/src/services/marketplace.service.ts';

// Ejemplo de invocación típica
const result = await marketplaceService.execute(params);
```
