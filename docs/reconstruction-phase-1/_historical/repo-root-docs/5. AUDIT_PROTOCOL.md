# Protocolo de Auditoría de Implementación de Hitos

## Objetivo
Verificar la correcta implementación de los últimos hitos y prevenir falsos positivos mediante:
- Revisión de criterios de aceptación
- Verificación de implementación técnica
- Pruebas de integración

## Hitos a Auditar
1. **Hito 16: Profile System** (FC-800 a FC-807)
2. **Hito 17: Account Management** (FC-810 a FC-816)
3. **Hito 18: Workspace & Collaborators UI** (FC-820 a FC-830)
4. **Hito 19: Welcome Experience** (FC-840 a FC-843)

## Metodología de Auditoría

### 1. Verificación de Criterios de Aceptación
Para cada hito, confirmar que se cumplen todos los criterios listados en EXECUTION_PLAN.md:
- [ ] Revisar checklist de criterios
- [ ] Verificar implementación en código
- [ ] Confirmar funcionalidad mediante pruebas manuales

### 2. Revisión de Implementación Técnica
- **Código vs Especificación**: 
  - Comparar implementación con diseño en EXECUTION_PLAN.md
  - Verificar parámetros, tipos de datos y validaciones
- **Calidad de Código**:
  - Revisar manejo de errores
  - Verificar consistencia de estilos
  - Comprobar documentación interna

### 3. Prevención de Falsos Positivos
- **Pruebas de Frontera**: 
  - Probar valores límite (ej: 0, 150, 5000 caracteres)
  - Verificar manejo de datos inválidos
- **Pruebas de Estado**:
  - Confirmar persistencia correcta de estados
  - Verificar sincronización entre componentes
- **Monitoreo**:
  - Implementar logs de auditoría en puntos críticos
  - Registrar eventos importantes

### 4. Pruebas de Integración
- **Flujos Complejos**:
  - Probar conversión cuenta personal → negocio
  - Verificar aceptación de invitaciones
  - Comprobar experiencia de bienvenida
- **Pruebas Cross-Hito**:
  - Verificar interacción entre:
    - Perfiles y gestión de cuentas
    - Workspaces y experiencia de bienvenida

## Checklist de Auditoría

| Hito | Criterio Verificado | Implementación Correcta | Falsos Positivos Prevenidos |
|------|---------------------|-------------------------|-----------------------------|
| H16  |                     |                         |                             |
| H17  |                     |                         |                             |
| H18  |                     |                         |                             |
| H19  |                     |                         |                             |

## Reporte de Auditoría
- **Hallazgos**: Documentar discrepancias
- **Recomendaciones**: Acciones correctivas
- **Validación**: Firmado por auditor y desarrollador

---

## Alcance (extensión del protocolo)
Este protocolo aplica para:
- Auditar cualquier hito del `1. EXECUTION_PLAN.md` (no solo H16-H19).
- Actualizar el `1. EXECUTION_PLAN.md` en base a evidencia del **código real** y del **estado real de PostgreSQL**.
- Mantener consistencia entre:
  - **Migraciones Drizzle (oficiales)**
  - **Migraciones manuales (scripts)**
  - **IndexedDB/Dexie (cliente)**

---

## Fuentes de Verdad (orden de prioridad)
- **Estado real de PostgreSQL** (tablas/columnas/FKs/índices): `packages/db/src/audit-database.ts`
- **Schema Drizzle (TypeScript)**: `packages/db/src/schema/`
- **Migraciones Drizzle (SQL)**: `packages/db/migrations/`
- **Historial de migraciones manuales**: `packages/db/MIGRATIONS.md` + scripts en `packages/db/src/`
- **Estado real de IndexedDB (cliente)** (stores/índices/versiones): DevTools → Application → IndexedDB
- **Schema IndexedDB (Dexie)**: `apps/web/src/db/index.ts` + `apps/web/src/db/schema.ts`
- **Motor de sync offline-first**: `apps/web/src/db/sync/*` + hooks `apps/web/src/hooks/useOfflineFirst.ts`, `apps/web/src/hooks/useChatOffline.ts`
- **Código real de backend/frontend**: `apps/api/src/`, `apps/web/src/`, `packages/*/src/`
- **Plan**: `1. EXECUTION_PLAN.md` (debe reflejar la realidad, no al revés)

---

## Protocolo: Conciliar `1. EXECUTION_PLAN.md` vs Código Real
Para cada hito (PC-X / FC-XXXX):
- [ ] Identificar las tareas del hito y sus criterios de éxito.
- [ ] Verificar **evidencia en código**:
  - [ ] Rutas/endpoints existentes (y su contrato)
  - [ ] Servicios/handlers que implementan la lógica
  - [ ] Componentes UI/hooks implicados
  - [ ] Tests (unit/e2e) si están listados como criterio
- [ ] Verificar **evidencia en DB** (si aplica): tablas/columnas/índices/constraints.
- [ ] Verificar **integración** (manual o e2e) contra flujo real.
- [ ] Actualizar `1. EXECUTION_PLAN.md` con el estado real:
  - [ ] Marcar tareas completadas/parciales
  - [ ] Anotar desviaciones respecto del plan original
  - [ ] Registrar “evidencia mínima” (ver sección de evidencias)

---

## Protocolo DB: Migraciones Oficiales (Drizzle) vs Scripts Manuales (Dual Track)
### Definiciones
- **DB Oficial (Drizzle):** Cambios reproducibles mediante `drizzle-kit generate/push` + migrator (`packages/db/src/migrate.ts`).
- **DB Manual (scripts):** Cambios aplicados por scripts `.ts`/`.sql` (históricamente fuera del journal de Drizzle) y documentados en `packages/db/MIGRATIONS.md`.

### Reglas
- [ ] No se considera “completo” un hito que requiere DB si el cambio no está reflejado en:
  - [ ] Estado real de PostgreSQL (audit)
  - [ ] Schema Drizzle (source of truth en TS)
  - [ ] Migración (Drizzle o script manual registrado)
- [ ] Si se aplica un script manual:
  - [ ] Debe registrarse en `packages/db/MIGRATIONS.md`
  - [ ] Debe reflejarse en `packages/db/src/schema/` (evitar drift)
  - [ ] Debe evaluarse “consolidación” a migración Drizzle (cuando sea viable)

### Procedimiento estándar (por cambio DB)
- [ ] Antes del cambio: ejecutar auditoría y guardar evidencia
- [ ] Aplicar migración (preferentemente Drizzle)
- [ ] Después del cambio: volver a ejecutar auditoría y confirmar tablas/columnas/índices
- [ ] Actualizar `packages/db/MIGRATIONS.md` si hubo intervención manual

### Triage: Tablas inesperadas / Drift de tablas esperadas
- [ ] Si el audit detecta **tablas inesperadas**:
  - [ ] Identificar origen (migración Drizzle, script manual, feature nueva)
  - [ ] Documentarlas en `packages/db/MIGRATIONS.md` o crear migración oficial si corresponde
  - [ ] Alinear `packages/db/src/schema/` (si aplica)
- [ ] Si el audit marca **tablas esperadas faltantes**:
  - [ ] Confirmar si la tabla sigue siendo parte del sistema (o es legacy/deprecada)
  - [ ] Si es legacy/deprecada: actualizar la expectativa (docs/scripts) para evitar falsos positivos
  - [ ] Si es requerida: crear/aplicar migración y registrar evidencia

---

## Protocolo DB Cliente: IndexedDB (Dexie) vs Backend (PostgreSQL)
### Alcance
- IndexedDB es responsabilidad del **core** para cache/offline-first.
- Las extensiones pueden tener sus propias bases de datos, y su ciclo de vida es responsabilidad de la extensión.

### Definiciones
- **Backend (PostgreSQL)**: fuente de verdad para datos persistentes.
- **IndexedDB (Dexie)**: cache/offline queue por cuenta, con aislamiento por `accountId`.

### Reglas de consistencia
- [ ] Backend prevalece ante conflicto (“backend wins”).
- [ ] La app debe soportar mensajes `local_only`/`pending_backend` sin romper UI.
- [ ] La DB local debe estar aislada por cuenta (ej. `FluxCoreDB_<accountId>`).
- [ ] Los stores locales no deben asumir que el `id` local será igual al `id` del servidor.

### Versionado y migraciones (Dexie)
- [ ] Todo cambio en `apps/web/src/db/index.ts` que altere stores/índices requiere bump de versión Dexie.
- [ ] Cambios incompatibles (shape de entidad) deben tener estrategia explícita:
  - [ ] `upgrade()` para migración in-place, o
  - [ ] limpieza controlada de DB local (si es cache y se puede reconstruir), o
  - [ ] migración “dual” temporal (leer viejo/escribir nuevo) con ventana de compatibilidad.

### Auditoría IndexedDB (manual, reproducible)
- [ ] Abrir DevTools → Application → IndexedDB
- [ ] Verificar DB por cuenta: `FluxCoreDB_<accountId>`
- [ ] Verificar stores mínimos:
  - [ ] `messages`
  - [ ] `conversations`
  - [ ] `relationships`
  - [ ] `syncQueue`
- [ ] Verificar índices compuestos esperados (según schema actual):
  - [ ] `messages`: `[conversationId+localCreatedAt]`
  - [ ] `syncQueue`: `[entityType+entityId]`
- [ ] Verificar semántica de sync:
  - [ ] Crear mensaje offline → debe aparecer en `messages` con `syncState=local_only`
  - [ ] Volver online → debe pasar a `pending_backend` y luego `synced` (o resolver dedupe)
  - [ ] `syncQueue` debe vaciarse al sincronizar

### Evidencia mínima requerida (IndexedDB)
- [ ] Captura o export (DevTools) del estado de stores relevantes
- [ ] Pasos reproducibles (offline/online) + resultados
- [ ] Si hubo cambio de versión Dexie: documentar versión anterior/nueva y estrategia

---

## Evidencia mínima requerida (por hito)
Registrar en el reporte del hito:
- **Código**:
  - [ ] Archivos/rutas principales (paths)
  - [ ] Commit hash / rama
- **DB (si aplica)**:
  - [ ] Output de `packages/db/src/audit-database.ts` (ideal: `--json` como artefacto)
  - [ ] Tablas/columnas/índices verificados
  - [ ] Evidencia IndexedDB (si aplica): stores/índices/versión y estado de `syncQueue`
- **Pruebas**:
  - [ ] E2E/Unit: nombre del test o evidencia de ejecución
  - [ ] Manual: pasos + resultado

---

## Comandos de soporte (referencia)
- Auditoría DB (solo lectura):
  - `bun run packages/db/src/audit-database.ts`
  - `bun run packages/db/src/audit-database.ts --json`
- Migraciones Drizzle:
  - `bun run packages/db/src/migrate.ts`
  - `bun run packages/db db:generate`
  - `bun run packages/db db:push`
