# Auditoría H0.2: Esquema de Base de Datos

**Fecha:** 2026-02-17  
**Objetivo:** Verificar separación ChatCore/FluxCore y preparación para v8.2

---

## 1. VERIFICACIÓN DE CONSTRAINT `UNIQUE (signal_id)` EN MESSAGES

### 1.1 Estado Actual

**Archivo:** `packages/db/src/schema/messages.ts`

#### ❌ NO EXISTE: `signal_id` en tabla messages

**Esquema actual:**
```typescript
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull(),
  senderAccountId: uuid('sender_account_id').notNull(),
  content: jsonb('content').notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  generatedBy: varchar('generated_by', { length: 20 }).default('human').notNull(),
  aiApprovedBy: uuid('ai_approved_by'),
  status: varchar('status', { length: 20 }).default('synced').notNull(),
  fromActorId: uuid('from_actor_id'),
  toActorId: uuid('to_actor_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**PROBLEMA CRÍTICO:** No hay columna `signal_id` ni constraint `UNIQUE (signal_id)`.

**Consecuencia:** 
- Violación de invariante #3 del Canon (sección 8)
- Re-ejecución de proyectores crearía mensajes duplicados
- Imposible reconstruir desde Journal sin duplicación

### 1.2 Acción Requerida H1

```sql
-- Migración requerida
ALTER TABLE messages ADD COLUMN signal_id BIGINT;
ALTER TABLE messages ADD CONSTRAINT messages_signal_id_unique UNIQUE (signal_id);
CREATE INDEX idx_messages_signal_id ON messages(signal_id) WHERE signal_id IS NOT NULL;
```

**Pre-requisito:** Verificar que no existen duplicados actuales:
```sql
SELECT signal_id, COUNT(*) 
FROM messages 
WHERE signal_id IS NOT NULL 
GROUP BY signal_id 
HAVING COUNT(*) > 1;
```

---

## 2. TABLAS DE CHATCORE (DERIVADAS)

### 2.1 Test Ontológico: ¿Existiría sin IA?

| Tabla | ¿Existe sin IA? | Propietario | Estado |
|---|---|---|---|
| `users` | ✅ Sí | ChatCore | ✅ Correcto |
| `accounts` | ✅ Sí | ChatCore | ✅ Correcto |
| `relationships` | ✅ Sí | ChatCore | ✅ Correcto |
| `conversations` | ✅ Sí | ChatCore | ✅ Correcto |
| `messages` | ✅ Sí | ChatCore | ⚠️ Falta `signal_id` |
| `templates` | ✅ Sí | ChatCore | ✅ Correcto |
| `contacts` | ✅ Sí | ChatCore | ✅ Correcto |
| `message_enrichments` | ✅ Sí | ChatCore | ✅ Correcto |

### 2.2 Verificación: Sin Lógica de Negocio

**Triggers en ChatCore:** Ninguno detectado (correcto).

**Conclusión:** Las tablas de ChatCore son puras tablas derivadas sin lógica embebida.

---

## 3. TABLAS DE FLUXCORE (KERNEL + CONFIGURACIÓN)

### 3.1 Kernel RFC-0001 (Congeladas)

| Tabla | Estado | Propósito |
|---|---|---|
| `fluxcore_signals` | ✅ Existe | Journal inmutable |
| `fluxcore_outbox` | ✅ Existe | Despertar transaccional |
| `fluxcore_projector_cursors` | ✅ Existe | Progreso de proyectores |
| `fluxcore_reality_adapters` | ✅ Existe | Registro de adapters |
| `fluxcore_fact_types` | ✅ Existe | Referencia de tipos físicos |

**Verificación:** Todas las tablas del Kernel existen y están congeladas.

### 3.2 Identidad (Proyector)

| Tabla | Estado | Propósito |
|---|---|---|
| `fluxcore_actors` | ✅ Existe | Actores globales |
| `fluxcore_addresses` | ✅ Existe | Direcciones físicas por driver |
| `fluxcore_actor_address_links` | ✅ Existe | Vínculo actor-address |
| `fluxcore_account_actor_contexts` | ✅ Existe | Contexto de actor por cuenta |

**Verificación:** Proyector de identidad tiene su esquema completo.

### 3.3 Configuración de FluxCore

| Tabla | ¿Existe sin IA? | Propietario | Estado |
|---|---|---|---|
| `fluxcore_assistants` | ❌ No | FluxCore | ✅ Correcto |
| `fluxcore_instructions` | ❌ No | FluxCore | ✅ Correcto |
| `fluxcore_vector_stores` | ❌ No | FluxCore | ✅ Correcto |
| `fluxcore_tools` | ❌ No | FluxCore | ✅ Correcto |
| `fluxcore_rag_configurations` | ❌ No | FluxCore | ✅ Correcto |

**Verificación:** Configuración de FluxCore correctamente separada de ChatCore.

### 3.4 Tablas Faltantes para v8.2

#### ❌ NO EXISTE: `fluxcore_cognition_queue`

**Requerida por Canon sección 4.2:**
```sql
CREATE TABLE fluxcore_cognition_queue (
  id                     BIGSERIAL PRIMARY KEY,
  conversation_id        TEXT NOT NULL,
  account_id             TEXT NOT NULL,
  last_signal_seq        BIGINT NOT NULL REFERENCES fluxcore_signals(sequence_number),
  turn_started_at        TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  turn_window_expires_at TIMESTAMPTZ NOT NULL,
  processed_at           TIMESTAMPTZ,
  attempts               INT NOT NULL DEFAULT 0,
  last_error             TEXT,
  UNIQUE (conversation_id) WHERE processed_at IS NULL
);

CREATE INDEX idx_cognition_queue_ready
  ON fluxcore_cognition_queue(turn_window_expires_at)
  WHERE processed_at IS NULL;
```

**Acción requerida:** H1 - Crear tabla y migración.

#### ❌ NO EXISTEN: Tablas de Fluxi/WES

**Requeridas por Canon sección 4.7.3:**
- `fluxcore_work_definitions`
- `fluxcore_works`
- `fluxcore_work_slots`
- `fluxcore_work_events`
- `fluxcore_proposed_works`
- `fluxcore_decision_events`
- `fluxcore_semantic_contexts`
- `fluxcore_external_effect_claims`
- `fluxcore_external_effects`

**Acción requerida:** H4 - Crear tablas completas de Fluxi.

---

## 4. SEPARACIÓN CHATCORE / FLUXCORE

### 4.1 Verificación de Fronteras

**ChatCore (tablas derivadas):**
- ✅ No contienen lógica de IA
- ✅ No tienen triggers de negocio
- ✅ Son escritas solo por proyectores
- ⚠️ `messages` necesita `signal_id` para idempotencia

**FluxCore (configuración + kernel):**
- ✅ Kernel congelado y completo
- ✅ Configuración separada de ChatCore
- ❌ Falta `fluxcore_cognition_queue`
- ❌ Faltan tablas de Fluxi/WES

### 4.2 Datos que Pertenecen a FluxCore pero Están en ChatCore

**NINGUNO DETECTADO.** La separación ontológica es correcta.

**Ejemplo correcto:**
- Preferencias de atención (tono, emojis) → viven en `extension_installations.config` (FluxCore)
- Perfil de cuenta (nombre, bio, avatar) → viven en `accounts` (ChatCore)

---

## 5. ÍNDICES Y PERFORMANCE

### 5.1 Índices Críticos para v8.2

#### ✅ EXISTEN: Índices del Kernel
- `idx_fluxcore_source` - búsqueda por origen
- `idx_fluxcore_subject` - búsqueda por sujeto
- `idx_fluxcore_sequence` - orden total
- `ux_fluxcore_adapter_external` - idempotencia

#### ❌ FALTA: Índice en `messages.signal_id`
**Acción requerida:** Crear junto con constraint UNIQUE.

#### ❌ FALTA: Índice en `cognition_queue`
**Acción requerida:** Crear en H1 junto con tabla.

### 5.2 Índices Recomendados (Optimización)

```sql
-- Para queries de historial conversacional
CREATE INDEX idx_messages_conversation_created 
  ON messages(conversation_id, created_at DESC);

-- Para queries de mensajes pendientes
CREATE INDEX idx_messages_status_pending 
  ON messages(status, created_at) 
  WHERE status = 'pending';
```

**Acción requerida:** H9 (Optimizaciones).

---

## 6. MIGRACIONES PENDIENTES

### 6.1 Migraciones Críticas (H1)

1. **Agregar `signal_id` a `messages`**
   ```sql
   ALTER TABLE messages ADD COLUMN signal_id BIGINT;
   ALTER TABLE messages ADD CONSTRAINT messages_signal_id_unique UNIQUE (signal_id);
   CREATE INDEX idx_messages_signal_id ON messages(signal_id) WHERE signal_id IS NOT NULL;
   ```

2. **Crear `fluxcore_cognition_queue`**
   - Tabla completa según Canon sección 4.2
   - Constraint parcial `UNIQUE (conversation_id) WHERE processed_at IS NULL`
   - Índice en `turn_window_expires_at`

### 6.2 Migraciones Futuras (H4)

3. **Crear tablas de Fluxi/WES**
   - 9 tablas según Canon sección 4.7.3
   - Constraints de integridad referencial
   - Índices para queries de Work Engine

---

## 7. VERIFICACIÓN DE DATOS LEGACY

### 7.1 Mensajes sin `signal_id`

**Query de verificación:**
```sql
SELECT COUNT(*) as total_messages,
       COUNT(signal_id) as with_signal_id,
       COUNT(*) - COUNT(signal_id) as without_signal_id
FROM messages;
```

**Acción requerida:** Ejecutar antes de aplicar constraint UNIQUE.

**Estrategia si hay mensajes sin `signal_id`:**
- Opción A: Marcar como legacy (no reconstruibles)
- Opción B: Backfill desde Journal si existe correlación
- Opción C: Permitir NULL en `signal_id` pero UNIQUE solo en no-NULL

**Recomendación:** Opción C - `UNIQUE (signal_id) WHERE signal_id IS NOT NULL`

### 7.2 Duplicados en Journal

**Query de verificación:**
```sql
SELECT signal_fingerprint, COUNT(*) 
FROM fluxcore_signals 
GROUP BY signal_fingerprint 
HAVING COUNT(*) > 1;
```

**Expectativa:** 0 filas (garantizado por constraint UNIQUE).

---

## 8. TABLAS LEGACY A ELIMINAR

### 8.1 Candidatas para Eliminación (Fase 5)

**Ninguna identificada.** El sistema actual no tiene tablas legacy detectables.

**Nota:** Verificar en H0.3 si hay servicios que usan tablas no documentadas.

---

## RESUMEN EJECUTIVO

### Estado del Esquema

**ChatCore:**
- ✅ Separación ontológica correcta
- ✅ Sin lógica de negocio embebida
- ⚠️ Falta `signal_id` en `messages` (CRÍTICO)

**FluxCore:**
- ✅ Kernel RFC-0001 completo y congelado
- ✅ Configuración separada correctamente
- ❌ Falta `fluxcore_cognition_queue` (CRÍTICO para H1)
- ❌ Faltan tablas de Fluxi/WES (para H4)

### Migraciones Requeridas

**H1 (Críticas):**
1. Agregar `signal_id BIGINT UNIQUE` a `messages`
2. Crear `fluxcore_cognition_queue`

**H4 (Fluxi):**
3. Crear 9 tablas de Fluxi/WES

**H9 (Optimizaciones):**
4. Índices de performance

### Riesgos Identificados

**RIESGO ALTO:** Mensajes legacy sin `signal_id` pueden impedir migración.

**Mitigación:** Usar constraint parcial `UNIQUE (signal_id) WHERE signal_id IS NOT NULL`.

**RIESGO MEDIO:** Performance de queries sin índices optimizados.

**Mitigación:** Agregar índices en H9 después de validar patrones de uso.

---

## CONCLUSIÓN

El esquema de base de datos tiene **separación ontológica correcta** entre ChatCore y FluxCore. Las tablas del Kernel están completas y congeladas.

**Bloqueadores para H1:**
1. Falta `signal_id` en `messages` (migración simple)
2. Falta `fluxcore_cognition_queue` (migración nueva)

**Estimado:** Las migraciones de H1 son directas. No hay sorpresas arquitectónicas.

**Estimado H1 confirmado:** 7-10 días (incluye migraciones + refactor de proyectores).
