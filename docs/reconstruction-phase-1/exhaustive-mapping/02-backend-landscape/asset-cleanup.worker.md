---
id: "asset-cleanup-worker"
type: "background-worker"
status: "stable"
criticality: "medium"
location: "apps/api/src/workers/asset-cleanup.worker.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Asset Gateway, Storage Adapters, Asset Deletion Service" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Garbage Collector de Archivos" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Expired Session Purge, Orphaned Temp File Deletion, Expired Asset Purge" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 👷 AssetCleanupWorker

## 🎯 Propósito
Es el "Recolector de Basura" del sistema de archivos. Su misión es mantener el almacenamiento limpio y optimizado, eliminando archivos que ya no son necesarios, sesiones abandonadas y temporales que consumen espacio y dinero innecesariamente.

## 🔄 Tareas de Limpieza (Priority Loop)
1. **Sesiones Expiradas:** Elimina las sesiones de upload que nunca se completaron y borra sus archivos temporales en el almacenamiento.
2. **Temporales Huérfanos:** Busca en el directorio `tmp/` del almacenamiento cualquier archivo con más de 1 hora de antigüedad que no esté vinculado a una sesión activa.
3. **Purge de Assets:** Procesa assets en estado `deleted` que ya cumplieron su periodo de gracia legal. 
   - **Safety Check:** Antes de borrar físicamente el archivo, verifica por última vez si el asset es "Huérfano" (si no está referenciado en ningún mensaje o registro activo). Si hay una referencia, lo mantiene por integridad referencial.

## ⚙️ Configuración Operativa
- **Intervalo por defecto:** Se ejecuta cada 5 minutos.
- **Persistence First:** Prioriza la integridad del chat sobre el ahorro de espacio. Si un archivo está borrado pero el mensaje que lo adjunta sigue existiendo, el worker **no** borra el archivo físico.

## 💡 Monitoreo
Devuelve un `CleanupResult` con el conteo exacto de sesiones, archivos y assets procesados, permitiendo graficar la eficiencia del mantenimiento en el panel de control.

## 💡 Ejemplo de Uso
```typescript
// El worker se ejecuta como proceso de fondo
// Iniciado automáticamente por el sistema de workers
import { asset_cleanup.worker } from 'apps/api/src/workers/asset-cleanup.worker.ts';

// Polling loop típico
setInterval(() => worker.poll(), intervalMs);
```
