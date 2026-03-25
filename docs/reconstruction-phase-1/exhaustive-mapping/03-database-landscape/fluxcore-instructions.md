---
id: "db-fluxcore-instructions"
type: "database-table"
status: "stable"
criticality: "high"
location: "packages/db/src/schema/fluxcore-instructions.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tabla de prompts de sistema" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FK a Accounts. Vinculado a Assistants" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Prompt Engineering & Governance" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Versioning (Draft/Production), Category tagging, Variable interpolation (handled in code), Marketplace visibility" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Table: fluxcore_instructions

## 🎯 Propósito
Almacena el "ADN" de comportamiento de la IA. Gestiona los prompts de sistema de forma modular, permitiendo que una misma instrucción sea compartida por varios asistentes o versionada independientemente del código.

## 🚥 Estructura (Discovery)
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | ID de la instrucción. |
| `account_id` | UUID | Not Null | Cuenta dueña. |
| `name` | VARCHAR(255) | Not Null | Nombre corto de la instrucción. |
| `current_version_id`| UUID | FK | Referencia a la versión activa. |
| `status` | VARCHAR(20) | Default 'draft' | `draft`, `production`, `disabled`. |
| `visibility` | VARCHAR(20) | Default 'private'| `private`, `shared`, `public`, `marketplace`. |

## 🧬 Ciclo de Vida de Versiones (Connections)
-   **Inmutabilidad**: Las instrucciones tienen una tabla hija `fluxcore_instruction_versions`. Cada vez que el usuario edita el prompt, se genera una nueva fila en la tabla de versiones.
-   **Rollback**: Cambiar el `current_version_id` en esta tabla permite revertir instantáneamente el comportamiento de todos los asistentes vinculados a una versión previa estable.

## 🛡️ Reglas de Gobernanza (Operations)
1.  **Managed Instructions**: El flag `is_managed` indica que la instrucción es generada o inyectada automáticamente por un proceso del sistema (ej: durante la fase de análisis de un agente).
2.  **Economía de Prompts**: Mediante la `visibility`, el sistema prepara el terreno para el "Marketplace", donde una instrucción de alto valor (ej: "Resolutor de Errores Legales") puede ser compartida entre múltiples cuentas.
3.  **Seguridad**: El contenido real del prompt reside en la versión, minimizando el riesgo de pérdida de datos por colisiones de edición concurrente.

## 💡 Ejemplo de Uso
```typescript
// Obtener instrucciones en producción
import { db, fluxcoreInstructions } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

const instructions = await db.select()
  .from(fluxcoreInstructions)
  .where(and(
    eq(fluxcoreInstructions.accountId, accountId),
    eq(fluxcoreInstructions.status, 'production')
  ));
```
