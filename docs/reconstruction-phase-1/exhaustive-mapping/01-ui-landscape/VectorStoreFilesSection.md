---
id: "vector-store-files-section"
type: "smart-component"
status: "stable"
criticality: "critical"
location: "apps/web/src/components/fluxcore/components/VectorStoreFilesSection.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Maneja FormData Subidas nativas y Polling 5s de CronJobs remotos" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Macro-Manager File Upload Pipeline (Vectorización)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Upload Cíclico Secuencial, Reprocesos en caliente, Smart-Badges" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 VectorStoreFilesSection

## 🎯 Propósito
El motor central de ingestión de PDFs, DOCXs y TXTs a los cerebros del sistema. Este componente no es un simple uploader estático: Funciona como un orquestador vivo. Suelta archivos locales (Multi-part FormData) hacia un enrutador en la nube, y luego empieza a "staklear" a PostgreSQL en tiempo real preguntando: "¿Ya terminaste de embuchar los vectores? ¿Hubo un error?". Es la línea delgada entre un documento ciego y los "cargando conocimiento" de una IA.

## 📦 Estado y Datos
**Polling Auto-Destructivo:**
- El cerebro interno del componente vigila si la lista detecta al menos "1" fila con status `processing` o `pending`. Si lo halla, abre el grifo a un `setInterval` de 5 segundos pidiendo actualizaciones persistentes, matando la suscripción tan pronto todas las filas vuelvan a estados inertes (completado/error) para no gastar ancho de red inútilmente.
- Mantiene propagación hacia arriba vía Ref (`onFileCountChangeRef`) comunicándole al Padre (Details) los gastos estáticos totales.

## 🔄 Flujos de Interacción
1. **Subida Cíclica Calculada:** Pese a recibir Array global de archivos del `<input multiple>`, sube archivo a archivo encadenando iteraciones y calculando sobre la marcha el progreso `((completados / cantidad) * 100)` para mostrar una ilusión óptica en porcentajes en el botón principal. Al terminar, forzosamente invoca `handleSync` (ordenando limpiar temporales).
2. **Re-Encendido de Muertos Vivos (Reprocess):** Archivos donde OpenAI corrompió el timeout quedan con flag Rojo (`failed`). Permite disparar `/reprocess` reviviendo la ruta de inyección manual obligatoria.
3. **Purgado Transaccional:** Actúa un "delete confirm" interno atómico que expone botones Verdes "X" temporales forzando un click bi-paso para purgar.

## 💡 Ejemplo de Uso
```tsx
import { VectorStoreFilesSection } from '../../components/fluxcore/components/VectorStoreFilesSection';

<VectorStoreFilesSection
    vectorStoreId={id}
    accountId={accCount}
    onFileCountChange={sincronizarContadorParent}
/>
```
