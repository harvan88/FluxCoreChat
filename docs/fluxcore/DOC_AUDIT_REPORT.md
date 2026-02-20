# FluxCore Documentation Audit & Unification Report

**Fecha:** 2026-02-18  
**Objetivo:** Auditar las 18 documentaciones FluxCore existentes, verificar consistencia con el Canon,
identificar solapamientos y proponer unificación para evitar sobre-documentación.

---

## 1. INVENTARIO COMPLETO

| # | Archivo | Líneas | Tipo | Tier |
|---|---------|--------|------|------|
| 1 | `FLUXCORE_CANON_FINAL_v8.2.md` | ~800 | Ley arquitectónica suprema | **CANON** |
| 2 | `FLUXCORE_KERNEL_FOUNDATION.md` | 472 | RFC-0001 congelado | **CANON** |

| 3 | `FLUXCORE_SIGNAL_CANON.md` | 115 | Canon de señales | **CANON** |
| 4 | `FLUXCORE_ASISTENTES_CANON.md` | 194 | Canon de runtimes Asistentes | **CANON** |
| 5 | `FLUXCORE_WES_CANON.md` | 169 | Canon de runtime Fluxi | **CANON** |
| 6 | `POLICY_CONTEXT_GUIDE.md` | 428 | Canon + Guía de PolicyContext | **CANON** |
| 7 | `FLUXCORE_V8_IMPLEMENTATION_PLAN.md` | 1272 | Plan maestro v8.2 | **PLAN** |
| 8 | `REFACTOR_MILESTONES.md` | 233 | Plan de refactorización (Canon v7.0) | **PLAN (OBSOLETO)** |
| 9 | `MIGRATION_STRATEGY.md` | 519 | Estrategia de migración H0.6 | **PLAN** |
| 10 | `AUDIT_KERNEL_PROJECTORS.md` | 316 | Auditoría H0.1 | **AUDIT** |
| 11 | `AUDIT_DATABASE_SCHEMA.md` | 342 | Auditoría H0.2 | **AUDIT** |
| 12 | `AUDIT_RUNTIMES.md` | 443 | Auditoría H0.3 | **AUDIT** |
| 13 | `AUDIT_FRONTEND.md` | 348 | Auditoría H0.4 | **AUDIT** |
| 14 | `AUDIT_SERVICES_TOOLS.md` | 569 | Auditoría H0.5 | **AUDIT** |
| 15 | `PROGRESS_LOG.md` | 172 | Changelog de progreso | **TRACKING** |
| 16 | `ARCHITECTURE_MAP.md` | 284 | Mapa visual del sistema | **TRACKING** |
| 17 | `EXECUTION_TRACE.md` | 78 | Traza de ejecución real | **TRACKING (LEGADO)** |
| 18 | `KERNEL_STATUS.md` | 42 | Status operativo del Kernel | **TRACKING (LEGADO)** |
| 19 | `SYSTEM_ARCHITECTURE_KB.md` | 156 | Knowledge Base de arquitectura | **TRACKING (LEGADO)** |

**Total: 19 documentos · ~6,000 líneas de documentación**

---

## 2. JERARQUÍA NORMATIVA

```
TIER 1 — CANON (Ley Inmutable)
  Si el código contradice estos documentos, el código está en error.
  ├── FLUXCORE_CANON_FINAL_v8.2.md   ← Documento supremo
  ├── FLUXCORE_KERNEL_FOUNDATION.md  ← RFC-0001 (congelado)
  ├── FLUXCORE_SIGNAL_CANON.md       ← Señales
  ├── FLUXCORE_ASISTENTES_CANON.md   ← Runtimes cognitivos
  ├── FLUXCORE_WES_CANON.md          ← Runtime transaccional
  └── POLICY_CONTEXT_GUIDE.md        ← PolicyContext

TIER 2 — PLAN (Ejecutable · Mutable)
  Define CÓMO se implementa el Canon. Puede cambiar.
  ├── FLUXCORE_V8_IMPLEMENTATION_PLAN.md   ← Plan maestro
  └── MIGRATION_STRATEGY.md                ← Estrategia migración

TIER 3 — AUDIT (Snapshot · Punto-en-tiempo)
  Capturas del estado real vs. Canon en un momento dado.
  ├── AUDIT_KERNEL_PROJECTORS.md
  ├── AUDIT_DATABASE_SCHEMA.md
  ├── AUDIT_RUNTIMES.md
  ├── AUDIT_FRONTEND.md
  └── AUDIT_SERVICES_TOOLS.md

TIER 4 — TRACKING (Vivos · Actualizables)
  Registros de lo hecho y mapas del estado actual.
  ├── PROGRESS_LOG.md                ← Qué se ha hecho
  └── ARCHITECTURE_MAP.md            ← Cómo se ve ahora

OBSOLETOS — Para evaluar descarte o fusión
  ├── REFACTOR_MILESTONES.md         ← Predecesor del Plan v8.2
  ├── EXECUTION_TRACE.md             ← Duplica ARCHITECTURE_MAP §2
  ├── KERNEL_STATUS.md               ← Duplica PROGRESS_LOG H0
  └── SYSTEM_ARCHITECTURE_KB.md      ← Duplica CANON + WES_CANON
```

---

## 3. ANÁLISIS DE CONSISTENCIA CON EL CANON

### 3.1 Documentos 100% Consistentes ✅

| Documento | Veredicto |
|---|---|
| `FLUXCORE_CANON.md` | ✅ Es la fuente de verdad. |
| `FLUXCORE_KERNEL_FOUNDATION.md` | ✅ RFC-0001 congelado. No contradice Canon. |
| `FLUXCORE_SIGNAL_CANON.md` | ✅ Subordinado al Canon. Coherente en fact types y estructura de señales. |
| `FLUXCORE_WES_CANON.md` | ✅ Subordinado al Canon. Coherente en soberanía de runtime y FSM. |
| `FLUXCORE_ASISTENTES_CANON.md` | ✅ Subordinado al Canon. Coherente en separación de runtimes. |
| `AUDIT_KERNEL_PROJECTORS.md` | ✅ Hallazgos consistentes con Canon (detecta correctamente violaciones). |
| `AUDIT_DATABASE_SCHEMA.md` | ✅ Hallazgos consistentes. |
| `AUDIT_RUNTIMES.md` | ✅ Hallazgos consistentes. |
| `AUDIT_FRONTEND.md` | ✅ Compatible. |
| `AUDIT_SERVICES_TOOLS.md` | ✅ Compatible. |
| `FLUXCORE_V8_IMPLEMENTATION_PLAN.md` | ✅ Derivado directamente del Canon. |
| `MIGRATION_STRATEGY.md` | ✅ Derivado del Plan. |
| `PROGRESS_LOG.md` | ✅ Consistente con Plan e implementación real. |
| `ARCHITECTURE_MAP.md` | ✅ Refleja estado actual post-HITO 2. |

### 3.2 Documentos con Conflictos o Desalineamiento ⚠️

#### `POLICY_CONTEXT_GUIDE.md` vs. `FLUXCORE_CANON.md` & `FLUXCORE_V8_IMPLEMENTATION_PLAN.md`

| Aspecto | Canon + Plan | POLICY_CONTEXT_GUIDE | Conflicto |
|---|---|---|---|
| Campos de PolicyContext | Incluye `mode`, `responseDelayMs`, `turnWindowMs`, `activeRuntimeId` | Sección 9 dice explícitamente **"no contiene delays, no contiene modo automático/supervisado, no contiene selección de runtime"** | ⚠️ **CONFLICTO DIRECTO** |
| Separación Policy vs Execution | Canon §4.3 unifica todo en `FluxPolicyContext` | POLICY_CONTEXT_GUIDE separa en PolicyContext (datos) vs "Execution Policy" (decisiones) | ⚠️ **Separación conceptual distinta** |
| `tone`, `formality`, `useEmojis` | Plan H2.1 los pone en `FluxPolicyContext` | Guide §9 dice "no contiene estilo" | ⚠️ **Conflicto: ¿dónde vive el tono?** |

**Diagnóstico:** La `POLICY_CONTEXT_GUIDE.md` fue escrita con una filosofía más purista donde PolicyContext = "solo realidad autorizada" y todo lo demás (modo, delays, tono) pertenece a una "Execution Policy" separada que nunca se documentó. El Canon v8.2 y el Plan fusionan ambos conceptos en un solo `FluxPolicyContext`.

**Resolución necesaria:** Decidir si:
- **Opción A:** PolicyContext = puro (realidad) y se crea `ExecutionPolicy` para modo/tono/delays
- **Opción B:** PolicyContext unifica todo (como lo hace el Plan hoy)

**Recomendación:** **Opción B** (como está en el Plan). Actualizar sección 9 del Guide para reflejar que `FluxPolicyContext` incluye tanto realidad autorizada como configuración de ejecución. La separación conceptual es elegante pero añade complejidad innecesaria para el MVP.

---

#### `REFACTOR_MILESTONES.md` vs. `FLUXCORE_V8_IMPLEMENTATION_PLAN.md`

| Aspecto | Refactor Milestones | Implementation Plan v8.2 |
|---|---|---|
| Versión base | Canon v7.0 | Canon v8.2 |
| Hito 1 | PolicyContext (crear) | Proyectores Atómicos + Cola |
| Hito 2 | Extraer OpenAI Runtime | Infraestructura Cognición |
| Hito 3 | Descomponer Monolito | Runtime Asistentes Local |
| Hito 4 | Limpiar WES-170 | Runtime Fluxi/WES |
| Modelo de extensión | ExtensionHost | RuntimeGateway (eliminando ExtensionHost) |

**Diagnóstico:** `REFACTOR_MILESTONES.md` es el predecesor del plan v8.2. Los hitos NO coinciden ni en número ni en contenido. El enfoque es completamente diferente:
- **Milestones** asume que ExtensionHost sigue existiendo y se refactorizan extensions dentro de él
- **Plan v8.2** elimina ExtensionHost y construye RuntimeGateway desde cero

**Veredicto:** `REFACTOR_MILESTONES.md` está **OBSOLETO**. No debe consultarse para la implementación actual.

---

#### `SYSTEM_ARCHITECTURE_KB.md` vs. Canon Ecosystem

| Aspecto | SYSTEM_ARCHITECTURE_KB | Documentos Canon + Plan |
|---|---|---|
| Identidad del sistema | "WOS impulsado por evidencia lingüística" | "Fedatario de la realidad y motor de decisión" |
| Entidades cognitivas | User, WES, FluxCore Ext, Assistant, Fluxi | Canon define 3 runtimes soberanos |
| Authority model | "Inversión de Control Estricta" con ExtensionHost | RuntimeGateway reemplaza ExtensionHost |
| Runtime Flow | ExtensionHost → WES → AI | CognitionWorker → Dispatcher → RuntimeGateway |
| Domain model | Works, Slots, DecisionEvents, ExternalEffectClaims | ✅ Consistente con WES_CANON |

**Diagnóstico:** El `SYSTEM_ARCHITECTURE_KB.md` fue escrito **antes** del Kernel Soberano y antes de v8.2. Sus secciones 1-3 contradicen la arquitectura actual:
- Sección 2 asume `ExtensionHost` como orquestador → reemplazado
- Sección 3 describe un flujo centrado en `ExtensionHost` → obsoleto
- Secciones 4-7 (Domain Model, Contracts, ADRs, Persistence) siguen siendo mayormente correctas pero parcialmente cubiertas por otros documentos

**Veredicto:** `SYSTEM_ARCHITECTURE_KB.md` tiene contenido **parcialmente obsoleto**. Las secciones de dominio (4-7) tienen valor pero están dispersas entre WES_CANON y el Plan.

---

#### `EXECUTION_TRACE.md`

| Sección | Estado |
|---|---|
| §1 Certificación (Kernel) | ✅ Correcto, pero duplicado por ARCHITECTURE_MAP §2 |
| §2 Materialización (Projectors → MessageCore) | ⚠️ **OBSOLETO** — describe `messageCore.receive()` que fue eliminado de ChatProjector |
| §3 Delegación al runtime | ⚠️ **OBSOLETO** — describe `MessageDispatchService` y `ExtensionHost`, ambos reemplazados |
| §4 Estados operativos | ⚠️ Parcialmente obsoleto |
| §5 Próximos ajustes | ⚠️ Ya completados o superados |
| §6 Login vía Kernel | ✅ Correcto y actualizado |

**Veredicto:** Secciones 1-5 están **obsoletas** (describen el flujo pre-v8.2). Solo §6 tiene valor vigente.

---

#### `KERNEL_STATUS.md`

**Diagnóstico:** Documento de 42 líneas que reporta el estado del Kernel al momento de su activación (2026-02-14). Su contenido está completamente cubierto por:
- `AUDIT_KERNEL_PROJECTORS.md` (verificación detallada)
- `PROGRESS_LOG.md` HITO 0 (confirmación de completitud)

**Veredicto:** **OBSOLETO** — información absorbida por auditoría y changelog.

---

## 4. MAPA DE SOLAPAMIENTOS

### 4.1 Solapamiento Crítico: Flujo de Mensajes

El flujo end-to-end de un mensaje está documentado en **4 lugares**:

| Documento | Sección | Estado |
|---|---|---|
| `FLUXCORE_CANON.md` §4 | Flujo canónico (ley) | ✅ Vigente (autoridad) |
| `ARCHITECTURE_MAP.md` §2 | Diagrama ASCII detallado | ✅ Vigente (visual) |
| `EXECUTION_TRACE.md` §1-3 | Traza con paths de archivos | ❌ Obsoleto (pre-v8.2) |
| `SYSTEM_ARCHITECTURE_KB.md` §3 | Runtime Message Flow | ❌ Obsoleto (ExtensionHost) |

**Acción:** Eliminar las versiones obsoletas. CANON + ARCHITECTURE_MAP cubren todo.

### 4.2 Solapamiento Medio: Domain Model (Works/Slots/FSM)

| Documento | Cobertura |
|---|---|
| `FLUXCORE_WES_CANON.md` | Definición canónica de Works, Slots, SemanticContext |
| `SYSTEM_ARCHITECTURE_KB.md` §4 | Domain Model con Works, Slots, DecisionEvents |
| `FLUXCORE_V8_IMPLEMENTATION_PLAN.md` H4 | Tablas SQL + implementación de Works |

**Diagnóstico:** WES_CANON es la autoridad. KB §4 repite con menos detalle. Plan H4 es la ejecución.

**Acción:** WES_CANON + Plan H4 son suficientes. KB §4 es redundante.

### 4.3 Solapamiento Medio: PolicyContext

| Documento | Cobertura |
|---|---|
| `FLUXCORE_CANON.md` §4.3 | Definición canónica |
| `POLICY_CONTEXT_GUIDE.md` | Guía exhaustiva (428 líneas) |
| `REFACTOR_MILESTONES.md` H1 | Interfaz TypeScript (v7.0) |
| `FLUXCORE_V8_IMPLEMENTATION_PLAN.md` H2.1 | Interfaz TypeScript (v8.2) |

**Diagnóstico:** Policy Context Guide es la referencia completa. Canon lo define brevemente. Plan da la interfaz de implementación. Milestones es obsoleto.

**Acción:** POLICY_CONTEXT_GUIDE + definición en Canon + Plan son el trío necesario (sin contar Milestones obsoleto).

### 4.4 Solapamiento Bajo: Estado del Kernel

| Documento | Cobertura |
|---|---|
| `KERNEL_STATUS.md` | 42 líneas, activación 2026-02-14 |
| `AUDIT_KERNEL_PROJECTORS.md` §1 | Verificación detallada RFC-0001 |
| `PROGRESS_LOG.md` HITO 0 | Confirmación de completitud |

**Acción:** Eliminar `KERNEL_STATUS.md`, absorbido por Audit + Progress.

---

## 5. PLAN DE UNIFICACIÓN

### 5.1 Documentos a CONSERVAR sin cambios (11)

| Documento | Razón |
|---|---|
| `FLUXCORE_CANON.md` | Ley suprema. Intocable. |
| `FLUXCORE_KERNEL_FOUNDATION.md` | RFC-0001 congelado. |
| `FLUXCORE_SIGNAL_CANON.md` | Canon de señales, bien delimitado. |
| `FLUXCORE_ASISTENTES_CANON.md` | Canon de runtimes, bien delimitado. |
| `FLUXCORE_WES_CANON.md` | Canon de Fluxi, bien delimitado. |
| `FLUXCORE_V8_IMPLEMENTATION_PLAN.md` | Plan maestro vigente. |
| `MIGRATION_STRATEGY.md` | Plan de migración vigente. |
| `AUDIT_KERNEL_PROJECTORS.md` | Snapshot H0.1 (referencia). |
| `AUDIT_DATABASE_SCHEMA.md` | Snapshot H0.2 (referencia). |
| `AUDIT_RUNTIMES.md` | Snapshot H0.3 (referencia). |
| `AUDIT_FRONTEND.md` | Snapshot H0.4 (referencia). |

### 5.2 Documentos a CONSERVAR con correcciones (3)

#### `POLICY_CONTEXT_GUIDE.md`
- **Acción:** Actualizar sección 9 para reflejar que `FluxPolicyContext` (Plan H2.1) unifica realidad autorizada + configuración de ejecución.
- **Agregar nota:** "La interfaz de implementación actual (`FluxPolicyContext`) unifica los dominios descriptivos documentados aquí con configuración de ejecución (modo, delays, tono). Ver `FLUXCORE_V8_IMPLEMENTATION_PLAN.md` H2.1 para la interfaz TypeScript vigente."

#### `PROGRESS_LOG.md`
- **Acción:** Mantener actualizado como changelog vivo.

#### `ARCHITECTURE_MAP.md`
- **Acción:** Mantener actualizado. Absorber la traza de login de EXECUTION_TRACE §6.

### 5.3 Documentos a DEPRECAR (4)

| Documento | Razón | Acción |
|---|---|---|
| `REFACTOR_MILESTONES.md` | Obsoleto. Basado en Canon v7.0. Hitos no coinciden con Plan v8.2. ExtensionHost ya no existe. | Agregar header `⛔ DEPRECADO — Superado por FLUXCORE_V8_IMPLEMENTATION_PLAN.md` |
| `EXECUTION_TRACE.md` | §1-5 obsoletos (pre-v8.2, describe MessageDispatchService eliminado). §6 (Login) debe migrarse a ARCHITECTURE_MAP. | Migrar §6 → ARCHITECTURE_MAP §5. Luego marcar como deprecado. |
| `KERNEL_STATUS.md` | Completamente cubierto por AUDIT_KERNEL_PROJECTORS + PROGRESS_LOG H0. | Agregar header deprecado. |
| `SYSTEM_ARCHITECTURE_KB.md` | §1-3 obsoletos (ExtensionHost). §4-7 parcialmente cubiertos por WES_CANON. ADRs (§6) tienen valor pero pueden migrar. | Migrar ADRs a CANON o Plan como apéndice. Deprecar documento completo. |

### 5.4 Documentos a conservar como referencia histórica sin cambios (1)

#### `AUDIT_SERVICES_TOOLS.md`
- Snapshot H0.5, referencia para implementación futura (H8).

---

## 6. MAPA DE TRAZABILIDAD FINAL

```
                    FLUXCORE_CANON.md
                    (Ley Suprema v8.2)
                         │
          ┌──────────────┼──────────────────┐
          │              │                  │
  KERNEL_FOUNDATION   SIGNAL_CANON    ASISTENTES_CANON
  (RFC-0001 Frozen)   (Señales)       (Runtimes AI)
                                            │
                         │                  │
                    WES_CANON          POLICY_CONTEXT_GUIDE
                    (Runtime Fluxi)    (Datos autorizados)
                         │
                         │
          ┌──────────────┴──────────────────┐
          │                                  │
   IMPLEMENTATION_PLAN              MIGRATION_STRATEGY
   (H0→H9 · Plan Maestro)           (H0.6 · Rollout)
          │
          │ genera
          │
   ┌──────┴────────────────────────────┐
   │  AUDITORÍAS (Snapshots H0)         │
   │  ├── AUDIT_KERNEL_PROJECTORS       │
   │  ├── AUDIT_DATABASE_SCHEMA         │
   │  ├── AUDIT_RUNTIMES                │
   │  ├── AUDIT_FRONTEND                │
   │  └── AUDIT_SERVICES_TOOLS          │
   └────────────────────────────────────┘
          │
          │ documenta avance
          │
   ┌──────┴────────────────────────────┐
   │  TRACKING (Vivos)                  │
   │  ├── PROGRESS_LOG.md    (changelog)│
   │  └── ARCHITECTURE_MAP.md (visual)  │
   └────────────────────────────────────┘

   ⛔ DEPRECADOS
   ├── REFACTOR_MILESTONES.md    (v7.0 → superado)
   ├── EXECUTION_TRACE.md        (pre-v8.2 → superado)
   ├── KERNEL_STATUS.md          (cubierto por audit+log)
   └── SYSTEM_ARCHITECTURE_KB.md (pre-Kernel → superado)
```

---

## 7. RESUMEN DE ACCIONES

### Inmediatas (antes de seguir implementando)

| # | Acción | Impacto |
|---|--------|---------|
| 1 | Agregar header `⛔ DEPRECADO` a `REFACTOR_MILESTONES.md` | Evita consultar hitos incorrectos |
| 2 | Agregar header `⛔ DEPRECADO` a `KERNEL_STATUS.md` | Evita datos desactualizados |
| 3 | Agregar header `⛔ DEPRECADO` a `SYSTEM_ARCHITECTURE_KB.md` | Evita flujo de mensajes obsoleto |
| 4 | Migrar `EXECUTION_TRACE.md` §6 (Login) a `ARCHITECTURE_MAP.md` | Preserva info valiosa |
| 5 | Agregar header `⛔ DEPRECADO` a `EXECUTION_TRACE.md` post-migración | Evita traza obsoleta |
| 6 | Actualizar `POLICY_CONTEXT_GUIDE.md` §9 con nota de unificación | Resuelve conflicto Canon vs Guide |

### Diferidas (al completar H7)

| # | Acción | Cuándo |
|---|--------|--------|
| 7 | Eliminar archivos deprecados del repo | Después de HITO 7 (legacy cleanup) |
| 8 | Migrar ADRs de SYSTEM_ARCHITECTURE_KB §6 a Canon o Plan | HITO 7 |
| 9 | Revisión final de trazabilidad de toda la documentación | HITO 7 |

---

## 8. REGLA DE ORO PARA NUEVOS DOCUMENTOS

> **Antes de crear un nuevo documento, verificar:**
> 1. ¿El contenido ya existe en un documento Canon? → No crear, referenciar.
> 2. ¿Es una decisión arquitectónica? → Agregarlo al Canon correspondiente.
> 3. ¿Es un snapshot de estado? → Crear como AUDIT con fecha y marcarlo como punto-en-tiempo.
> 4. ¿Es progreso? → Actualizar PROGRESS_LOG.md.
> 5. ¿Es un diagrama visual? → Actualizar ARCHITECTURE_MAP.md.
>
> **Total documentos meta:** Máximo 15 activos. Hoy: 15 activos + 4 deprecados.
