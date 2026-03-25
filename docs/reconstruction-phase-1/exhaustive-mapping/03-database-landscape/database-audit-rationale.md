---
id: "db-audit-rationale"
type: "critical-analysis"
status: "ratified"
criticality: "critical"
location: "packages/db/src/schema/"
description: "Auditoría de deuda técnica y justificación canónica de la arquitectura de datos"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Identificación de tablas activas vs legacy" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Mapeo de dependencias entre Kernel y Sistema" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Justificación vía Cánones Arquitectónicos (v8.3)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Plan de limpieza y exportación de módulos huérfanos" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🚨 Auditoría y Racional Canónico de Base de Datos

## 🎯 Resumen Ejecutivo
Tras la restauración de la **Soberanía del Runtime (RFC-v8.3)**, el esquema de base de datos ha pasado por un proceso de consolidación masiva. Este documento justifica la existencia de tablas "huérfanas" y define la frontera entre el **Kernel** y el **Sistema**.

## 📖 Justificación Canónica (Rationale)

### 1. Kernel vs Sistema (Manifiesto de Runtime v8.3)
La arquitectura de FluxCore distingue estrictamente entre:
-   **El Kernel**: Actúa como el **Registro Canónico de Verdad**. Es inmutable y soverano. Aquí residen tablas como `fluxcore_journal` y `fluxcore_signals`.
-   **El Sistema (Pipeline)**: Es el flujo vivo de procesamiento. Las señales viajan a través del sistema y se "certifican" en el Kernel.
-   **Consecuencia**: Tablas como `signals.ts` (Notificaciones) son de nivel de **Sistema**, mientras que `fluxcore-signals.ts` son de nivel de **Kernel**.

### 2. Soberanía del Runtime
El principio de **Runtime Sovereignty** dicta que la configuración elegida por el usuario (`account_runtime_config`) manda sobre cualquier lógica predefinida. Esto hizo que las tablas de adaptadores individuales y configuraciones dispersas fueran consolidadas en el clúster **WES (Work Execution System)** y **Identity System**.

## 🕵️ Verificación Directa de Tablas

### 🏗️ Tablas Consolidadas (Legacy Interno)
Los siguientes archivos en `/schema/` son **obsoletos** y no deben ser usados por la API. Su lógica ahora reside en `wes.ts` o `fluxcore-identity.ts`:
-   `fluxcore-works.ts` / `fluxcore-proposed-works.ts` -> Ver `wes.ts`.
-   `fluxcore-actors.ts` / `fluxcore-addresses.ts` -> Ver `fluxcore-identity.ts`.
-   `fluxcore-external-effects.ts` -> Ver `wes.ts`.

### ⚠️ El "Huérfano Crítico": `signals.ts`
Se ha verificado que `signals.ts` contiene el sistema completo de **Notificaciones (Push/Email/Websocket)**. 
-   **Estado**: Implementado al 100% pero **HAY UN ERROR DE EXPORTACIÓN**.
-   **Acción**: No está presente en `packages/db/src/schema/index.ts`. Debe ser exportado para habilitar las notificaciones en la API.

### 🔍 Auditoría de Índices
-   **Activos**: Todas las tablas core tienen índices de alto rendimiento para UUIDs y campos de búsqueda rápida.
-   **Identificados**: Se han verificado índices compuestos en `fluxcore_works` (WES) para optimización de estados de FSM.

## 🌐 Progreso de IndexedDB (Offline-First)
El sistema utiliza **IndexedDB** en el frontend para soportar la estrategia **Dual Source of Truth (Canvas §9.1)**.

| Entidad | Estado de Sync | Propósito |
| :--- | :--- | :--- |
| `LocalMessage` | `pending_backend` | Permite envío de mensajes offline con reintento automático. |
| `SyncQueueItem` | `processing` | Cola de operaciones deterministas (Create/Update/Delete). |
| `LocalConversation` | `synced` | Caché local de hilos para carga instantánea (Optimistic UI). |

## 🛠️ Plan de Acción (Critique)
1.  **Exportar `signals.ts`**: Integrar inmediatamente en el `index.ts` de la base de datos.
2.  **Limpieza Física**: Eliminar los archivos `fluxcore-*.ts` redundantes para evitar colisiones de nombres en herramientas de autocompletado.
3.  **Alineación de Tipos**: Asegurar que los tipos de `MessageContent` en IndexedDB coincidan 1:1 con el JSONB de PostgreSQL.

## 💡 Ejemplo de Uso
```typescript
// Verificar qué tablas están exportadas en el index
import * as schema from '@fluxcore/db';

// Todas las tablas exportadas están disponibles aquí
console.log(Object.keys(schema).filter(k => k.match(/^[a-z]/)));
```
