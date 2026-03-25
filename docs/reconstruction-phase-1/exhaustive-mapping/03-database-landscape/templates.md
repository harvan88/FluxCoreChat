---
id: "db-templates"
type: "database-table"
status: "stable"
criticality: "medium"
location: "packages/db/src/schema/templates.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tabla de plantillas de respuesta" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FK a Accounts. Vinculado a TemplateAssets" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Message Templates & Automation" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Variable schema validation, Usage tracking, Automated use permissions, Categorization" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Table: templates

## 🎯 Propósito
Almacena mensajes predefinidos que los humanos o la IA pueden enviar rápidamente. Incluye soporte para variables dinámicas que se completan al momento del envío.

## 🚥 Estructura (Discovery)
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | ID de la plantilla. |
| `account_id` | UUID | Not Null | Cuenta dueña. |
| `content` | TEXT | Not Null | Cuerpo del mensaje con placeholders (ej: `Hola {{name}}`). |
| `variables` | JSONB | Not Null | Definición de tipos de variables (`text`, `number`, `date`). |
| `allow_automated_use`| BOOLEAN | Default False | Permite que la IA use esta plantilla sin permiso humano. |
| `usage_count` | INTEGER | Default 0 | Contador de popularidad de la plantilla. |

## 🧬 Relaciones (Connections)
-   **Rich Media**: A través de la tabla `template_assets`, una plantilla puede tener archivos adjuntos permanentes (ej: un PDF con lista de precios).
-   **AI Integration**: El Kernel consulta `allow_automated_use`. Si es `true`, los Agentes pueden elegir esta plantilla como una "respuesta canónica" ante ciertos triggers.

## 🛡️ Reglas de Operación (Operations)
1.  **Interpolación de Variables**: El campo `variables` no solo guarda el nombre, sino reglas de validación (ej: `required: true`). El motor de templates valida que todos los placeholders en `content` tengan su definición correspondiente.
2.  **Productividad**: El `usage_count` permite al frontend listar en la parte superior las respuestas más frecuentes del usuario.
3.  **Aislamiento**: Las plantillas son privadas por cuenta, asegurando que la terminología de un negocio no se mezcle con otro.

## 💡 Ejemplo de Uso
```typescript
// Listar templates activos por popularidad
import { db, templates } from '@fluxcore/db';
import { eq, and, desc } from 'drizzle-orm';

const list = await db.select()
  .from(templates)
  .where(and(
    eq(templates.accountId, accountId),
    eq(templates.isActive, true)
  ))
  .orderBy(desc(templates.usageCount));
```
