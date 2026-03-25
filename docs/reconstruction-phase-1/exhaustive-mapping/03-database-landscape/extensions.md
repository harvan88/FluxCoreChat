---
id: "db-extensions"
type: "core"
status: "stable"
criticality: "medium"
location: "packages/db/src/schema/extensions.ts, packages/db/src/schema/extension-contexts.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Schema Cluster: Extension System (FC-150/151)

## 🎯 Propósito
Habilita la arquitectura de plugins de FluxCore. Cada cuenta puede instalar extensiones que amplían las capacidades del sistema, agregando datos contextuales (overlays) a entidades existentes sin modificar las tablas core.

## 🚥 Componentes (Discovery)

### 1. `extension_installations`
Registro de extensiones instaladas por cuenta. Incluye permisos granulares (`granted_permissions`) y configuración override (`config`).

### 2. `extension_contexts` (Context Overlays)
Permite a extensiones almacenar datos JSONB asociados a una cuenta, relación o conversación. Solo **una** FK puede estar activa (`account_id` XOR `relationship_id` XOR `conversation_id`).

## 🧬 Relaciones (Connections)
- `extension_installations.account_id` → `accounts.id`.
- `extension_contexts` referencia polimórficamente a `accounts`, `relationships` o `conversations`.
- El `extensionId` (ej: `@fluxcore/fluxcore`) se usa como filtro textual, no FK.

## 🔗 Dependencias
- **ManifestLoader**: Lee los manifiestos físicos de las extensiones locales instaladas.

## 🛡️ Reglas de Operación (Operations)
1. **Permisos Granulares**: La columna `granted_permissions` almacena el subconjunto de permisos que el usuario autorizó del manifiesto de la extensión.
2. **Isolation**: Cada extensión opera en su propio namespace de `context_type`, impidiendo colisiones de datos entre plugins.

## 💡 Ejemplo de Uso
```typescript
// Verificar si una extensión está instalada y habilitada
import { db, extensionInstallations } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

const [ext] = await db.select()
  .from(extensionInstallations)
  .where(and(
    eq(extensionInstallations.accountId, accountId),
    eq(extensionInstallations.extensionId, '@fluxcore/fluxcore'),
    eq(extensionInstallations.enabled, true)
  )).limit(1);
```
