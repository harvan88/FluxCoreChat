---
id: "db-audit-critical-report"
type: "audit-report"
status: "critical"
location: "packages/db/src/schema"
date: "2026-03-24"
author: "Antigravity Audit Engine"
summary: "Análisis de integridad del esquema Drizzle, detección de tablas huérfanas y gaps de sincronización en el Kernel."
---

# 🚨 INFORME CRÍTICO: Auditoría de Base de Datos (FluxCore v8.x)

## 🎯 Hallazgos de Alta Prioridad

### 1. Tablas Huérfanas (Bloqueo de Sincronización)
Se han identificado archivos de esquema en `packages/db/src/schema/` que están **implementados pero no exportados** en `index.ts`. Esto genera "Dead Code" en la base de datos y bloquea funciones core que el código asume que existen.

| Archivo | Estado | Riesgo | Recomendación |
| :--- | :--- | :--- | :--- |
| `signals.ts` | **HUÉRFANO** | **CRÍTICO**. No se pueden enviar notificaciones (Push/Email) desde la API. | Exportar en `index.ts` inmediatamente. |
| `fluxcore-cognition-queue.ts`| **COMENTADO** | **ALTO**. El CognitiveDispatcher lo importa pero el export global está bloqueado. | Validar por qué está comentado y reactivar. |

### 2. Redundancia Arquitectónica (Deuda Técnica)
Existen múltiples archivos que definen las mismas tablas, lo que puede causar colisiones en la generación de migraciones de Drizzle.

-   **Conflicto WES**: `wes.ts` (Correcto) colisiona con `fluxcore-works.ts`, `fluxcore-proposed-works.ts`, etc. (Obsoletos).
-   **Conflicto Identidad**: `fluxcore-identity.ts` (Correcto) colisiona con `fluxcore-actors.ts` y cada uno define su propia versión de `actors`. El Kernel usa `fluxcore_signals` pero existen definiciones divergentes en `fluxcore-signals.ts`.

## 🔍 Verificación Directa de Índices (Optimization)

| Tabla | Índices Críticos | Estado |
| :--- | :--- | :--- |
| `messages` | `idx_messages_conversation`, `ux_messages_signal_id` | ✅ OK |
| `conversations` | `idx_conversations_visitor_token`, `idx_conversations_owner_account` | ✅ OK |
| `assets` | `assets_unique_checksum_account`, `idx_assets_storage_key` | ✅ OK |
| `signals` | `idx_signals_recipient_unread`, `idx_signals_status` | ❌ HUÉRFANO (No migrado) |

## ⚠️ Gaps de Implementación (Skeletons)
1.  **`fluxcore-fact-types.ts`**: Es una cáscara vacía. El Kernel no puede validar tipos de hechos dinámicamente.
2.  **`fluxcore-reality-adapters.ts`**: Falta la implementación física para persistir adaptadores externos.

## 📌 Acciones Requeridas (Critical Actions)
1.  **Plug-in `signals.ts`**: Exportar el sistema de notificaciones en el `index.ts` de la DB.
2.  **Purga de archivos `fluxcore-*`**: Eliminar los archivos fragmentados de WES que ya están integrados en el archivo consolidado `wes.ts`.
3.  **Alineación de `fluxcore_signals`**: Asegurar que solo exista una fuente de verdad para el Diario del Kernel entre `fluxcore-journal.ts` y las definiciones redundantes.

## 💡 Ejemplo de Uso
```typescript
// Consultar estado de las migraciones
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const tables = await db.execute(
  sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
);
console.log(`Total tablas en PostgreSQL: ${tables.rows.length}`);
```
