---
id: "account-deletion-local"
type: "logic-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/account-deletion.local.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Total DB Schema (Drizzle TX)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Purga Transaccional Local" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Cascade cleanup, Transactional safety, Record counting summary, Orphan prevention" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AccountPurgeService

## 🎯 Propósito
Este servicio es la "Bomba de Cobalto" de FluxCore. Se encarga de la eliminación física y definitiva de todos los registros asociados a una cuenta en la base de datos local. Es un proceso irreversible diseñado para garantizar que no queden rastros de datos privados tras un cierre de cuenta.

## 🛡️ Seguridad Transaccional
Todo el proceso de purga se ejecuta dentro de una única **Transacción de Base de Datos** (`db.transaction`). Si falla la eliminación de un solo mensaje o de una sola regla de automatización, toda la operación se revierte (Rollback), evitando estados de "purga parcial" que dejarían datos huérfanos e inconsistentes.

## 🕸️ Barrido de 360 Grados
El servicio conoce la estructura completa del sistema y elimina datos en un orden lógico para respetar la integridad:
- **Capa Cognitiva:** Asistentes, archivos, fragmentos de documentos (Knowledge chunks), configuraciones RAG.
- **Capa Operativa:** Automatizaciones, instalaciones de extensiones, configuraciones de sitios web.
- **Capa Financiera:** Wallets de créditos, historial de transacciones, suscripciones al marketplace.
- **Capa de Comunicación:** Mensajes, conversaciones (hilos), activos vinculados a mensajes.
- **Capa de Identidad:** Actores, perfiles y finalmente la entrada en la tabla `accounts`.

## 📊 Resumen de Ejecución
Retorna un `AccountPurgeSummary` que detalla exactamente cuántos registros fueron eliminados de cada tabla. Esta "factura de purga" es vital para la auditoría técnica y para confirmar al usuario/administrador el éxito de la operación.

## 🧪 Inteligencia de Orfandad
Antes de borrar al usuario dueño de la cuenta, verifica si posee otras cuentas activas. Si esta era su última cuenta, procede también a eliminar sus privilegios de `systemAdmins`, limpiando completamente el perfil de acceso del usuario al sistema administrativo.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: account-deletion.local
import { accountDeletion.local } from 'apps/api/src/services/account-deletion.local.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await accountDeletion.local.process(input);
```
