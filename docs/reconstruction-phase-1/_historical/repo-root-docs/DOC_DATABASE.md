# Documentación de Bases de Datos FluxCore

Este documento describe la estructura de datos del sistema FluxCore, que opera con una arquitectura híbrida de doble fuente de verdad (Dual Source of Truth).

## 1. PostgreSQL (Backend - System of Record)
Almacena la configuración autoritativa, activos de IA y estado global.

### Módulo: Asistentes (FluxCore Brain)
Tablas relacionadas con la orquestación de agentes.

| Tabla | Descripción | Columnas Clave |
|-------|-------------|----------------|
| `fluxcore_assistants` | Entidad principal del asistente. | `id`, `accountId`, `name`, `status`, `modelConfig` (JSON), `timingConfig` (JSON) |
| `fluxcore_assistant_instructions` | Relación N:M ordenada. | `assistantId`, `instructionId`, `versionId`, `order`, `isEnabled` |
| `fluxcore_assistant_vector_stores` | Relación N:M con permisos. | `assistantId`, `vectorStoreId`, `accessMode` (read/write) |
| `fluxcore_assistant_tools` | Relación N:M con configuración. | `assistantId`, `toolConnectionId`, `isEnabled` |

### Módulo: Activos (Assets)
Recursos reutilizables referenciados por los asistentes.

| Tabla | Descripción | Columnas Clave |
|-------|-------------|----------------|
| `fluxcore_instructions` | Metadatos de instrucciones. | `id`, `name`, `visibility`, `currentVersionId` |
| `fluxcore_instruction_versions` | Historial de contenido (Prompts). | `id`, `instructionId`, `versionNumber`, `content`, `changeLog` |
| `fluxcore_vector_stores` | Bases de conocimiento RAG. | `id`, `name`, `visibility`, `expirationPolicy` |
| `fluxcore_vector_store_files` | Archivos indexados en vectores. | `id`, `vectorStoreId`, `name`, `status`, `sizeBytes` |
| `fluxcore_tool_definitions` | Definiciones de herramientas. | `id`, `slug`, `type` (mcp/http), `schema` (JSON), `visibility` |
| `fluxcore_tool_connections` | Credenciales/Conexiones por cuenta. | `id`, `accountId`, `toolDefinitionId`, `authConfig` (JSON) |

---

## 2. IndexedDB (Frontend - Local Cache)
Base de datos local en el navegador para funcionamiento Offline-First. Implementada con Dexie.js.
**Aislamiento:** Se crea una base de datos separada por cuenta (`FluxCoreDB_{accountId}`).

| Tabla | Descripción | Esquema / Índices |
|-------|-------------|-------------------|
| `messages` | Caché de mensajes de chat. | `id`, `conversationId`, `syncState`, `[conversationId+localCreatedAt]` |
| `conversations` | Lista de conversaciones activas. | `id`, `relationshipId`, `lastMessageAt`, `syncState` |
| `relationships` | Contactos y relaciones. | `id`, `accountAId`, `accountBId`, `syncState` |
| `syncQueue` | Cola de operaciones pendientes de sincronización. | `id`, `entityType`, `entityId`, `operation`, `status`, `[entityType+entityId]` |

### Principios de Sincronización
1.  **Lectura:** La UI lee de IndexedDB (rápido, offline).
2.  **Escritura:** La UI escribe en IndexedDB + SyncQueue.
3.  **Sync:** Un proceso en segundo plano (Service Worker o Hook) replica SyncQueue al Backend PostgreSQL.
4.  **Hidratación:** Al abrir la app, se descargan del Backend los cambios nuevos hacia IndexedDB.
