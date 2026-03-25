---
id: "account-deletion-snapshot-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/account-deletion.snapshot.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Archiver, Filesystem, Drizzle (accounts, relationships, messages, etc)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Exportación y Respaldo de Datos (Takeout)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "JSON-to-ZIP archiving, Concurrent data fetching, Metadata summary generation" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AccountDeletionSnapshotService

## 🎯 Propósito
Proporciona una solución de "Takeout" (derecho a la portabilidad de datos) para los usuarios que deciden eliminar su cuenta. Antes de la purga irreversible, este servicio empaqueta toda la historia del negocio en un archivo comprimido descargable.

## 📦 Empaquetado de Datos (ZIP)
Utiliza la librería `archiver` para generar un flujo de compresión de alta eficiencia (zlib level 9) que incluye archivos JSON estructurados para cada entidad:
- `account.json`: Datos del perfil.
- `conversations.json` & `messages.json`: Todo el historial de chat con terceras partes.
- `relationships.json`: Directorio de contactos y reglas asociadas.
- `automation-rules.json`: Configuraciones de IA y flujos.
- `assistants.json` & `vector-stores.json`: Definiciones del entorno cognitivo.

## 📑 Autodescripción
Cada paquete generado incluye un `SUMMARY.json` con estadísticas de lo exportado y un `README.txt` amigable, asegurando que el usuario final pueda interpretar el contenido del respaldo sin necesidad de herramientas técnicas avanzadas.

## 🛡️ Gestión de Almacenamiento
Almacena los snapshots en una ruta dedicada (`uploads/account-snapshots/`) organizada por `accountId`. Implementa una lógica de limpieza preventiva que elimina cualquier snapshot previo del mismo Job ID antes de iniciar uno nuevo, garantizando eficiencia en el uso de disco del servidor.

## 🔗 Entrega por URL
Al finalizar la generación, retorna una URL pública firmada (virtual) para que el frontend pueda proporcionar el botón de descarga al usuario antes de proceder con la confirmación final de borrado.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { accountDeletion.snapshotService } from 'apps/api/src/services/account-deletion.snapshot.service.ts';

// Ejemplo de invocación típica
const result = await accountDeletion.snapshotService.execute(params);
```
