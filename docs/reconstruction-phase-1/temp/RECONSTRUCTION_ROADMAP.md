# Derrotero de Reconstrucción - Fase 1
# Orden Lógico de Intervención

**Fecha:** 2026-03-18  
**Última actualización:** 2026-03-18 17:22  
**Metodología:** SYSTEM_REFACTORING_METHODOLOGY (5 Fases)  
**Nivel de Rigor:** 🔴 Máximo (Tema 1 y 2) / 🟢 Básico (Tema 3)  

---

## 🎯 Los Tres Temas

| # | Tema | Documento Fuente | Dominio | Riesgo | Estado |
|---|------|------------------|---------|--------|--------|
| **T3** | Avatar Access (URLs públicas) | `AVATAR_ACCESS_ANALYSIS.md` | Assets / UX | 🟢 Bajo | ✅ **COMPLETADO** (2026-03-19) |
| **T1** | Packages Types Refactoring | `PLAN_REFACTORING_PACKAGES_TYPES.md` | Tipos / Schema | 🟢 Bajo | ✅ **COMPLETADO** (2026-03-19) |
| **T1** | Arquitectura de Pilares del Runtime | `PILLAR_ARCHITECTURE.md` | FluxCore cognitivo | 🔴 Alto | 🔄 En diseño |
| **T2** | Runtime Pipeline + Signal Hub | `RUNTIME_PIPELINE_MANIFESTO.md` | Telemetría / Extensibilidad | 🟡 Medio | ⏳ Espera T1 |

---

## 📐 Orden Lógico: T3 → T1(Packages) → T1(Pilares) → T2

### ¿Por qué este orden?

```
T3 (Avatar)     ──→  T1 (Packages Types)  ──→  T1 (Pilares del Runtime)  ──→  T2 (Pipeline + Signal Hub)
│                    │                              │                              │
│ Independiente      │ Limpieza de tipos            │ Refactoring estructural      │ Se construye SOBRE T1
│ Sin dependencias   │ Sin impacto en runtime       │ Limpia acceso a pilares      │ Necesita el runtime limpio
│ Victoria rápida    │ Victoria rápida              │ es el corazón del cambio     │ para observarlo correctamente
└────────────────    └──────────────────────────    └──────────────────────────    └──────────────────────────
```

---

## ✅ Tema 3: Avatar Access — COMPLETADO

Implementado: URLs públicas directas (Modelo WhatsApp) en `account-avatar.presenter.ts`.  
Resultado: Avatars visibles en ConversationsList y perfiles públicos.

---

## ✅ Tema 1: Packages Types Refactoring — COMPLETADO

Limpiados tipos duplicados en `packages/types`.  
Resultado: Schema DB como fuente de verdad única, eliminados tipos no utilizados.

---

## 🏗️ Corrección Arquitectónica Fundamental: El Modelo de Pilares

> **Actualización 2026-03-18:** La visión original ("runtime solo declara, sistema ejecuta") fue corregida por una comprensión más profunda de la arquitectura.

### ❌ Modelo Anterior (incorrecto)
```
Runtime → DECLARA que necesita RAG → Sistema EJECUTA RAG → devuelve resultado al runtime
```
Problema: Requiere back-and-forth complejo. El runtime "pide permiso" al sistema.

### ✅ Modelo de Pilares (correcto)
```
Runtime → USA ragService directamente (pilar) → procesa resultado → RETORNA ExecutionAction[]
```

### La Metáfora del Edificio

Los **runtimes son pisos** de un edificio. Los **pilares** son columnas compartidas que sostienen todo el edificio:

```
┌─────────────────────────────────────────────────────────────────┐
│                        EDIFICIO FLUXCORE                        │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │AsistentesLocal│  │AsistentesOpenAI│  │    Fluxy    │  ...      │
│  │  (Piso 1)    │  │   (Piso 2)   │  │  (Piso 3)  │            │
│  │              │  │              │  │             │            │
│  │ Soberano:    │  │ Soberano:    │  │ Soberano:   │            │
│  │ • Prompt ✅   │  │ • Prompt ✅   │  │ • Prompt ✅  │            │
│  │ • Cognición ✅│  │ • Cognición ✅│  │ • Cognición✅│            │
│  │ • Usa pilares│  │ • Usa pilares│  │ • Usa pilares│           │
│  │ • Retorna    │  │ • Retorna    │  │ • Retorna   │            │
│  │   actions ✅  │  │   actions ✅  │  │   actions ✅ │            │
│  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘            │
│         │                 │                 │                    │
│  ═══════╪═════════════════╪═════════════════╪════════════════    │
│         │   PILARES COMPARTIDOS (columnas del edificio)          │
│         │                 │                 │                    │
│  ┌──────┴─────────────────┴─────────────────┴──────────────┐    │
│  │  🏛️ llmClient    │  🏛️ ragService   │  🏛️ templateService │    │
│  │  (acceso a LLM)  │  (knowledge base)│  (plantillas)      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ═══════════════════════════════════════════════════════════    │
│                   SISTEMA FLUXCORE (fundación)                   │
│                                                                 │
│  • Certificación Kernel (CognitionGateway)                      │
│  • Proyección a ChatCore (ChatProjector)                        │
│  • Telemetría (triggerSignalId)                                 │
│  • Entrega de acciones al usuario                               │
│                                                                 │
│  ❌ NO construye prompts                                         │
│  ❌ NO procesa cognitivamente                                    │
│  ❌ NO toma decisiones                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Principios del Modelo de Pilares

1. **Cada piso es soberano** — No pide permiso a otros pisos ni al sistema
2. **Los pilares son compartidos** — Todos los pisos los usan bajo reglas claras
3. **El runtime RESUELVE** — No "declara y espera", invoca pilares y construye respuesta
4. **El output es `ExecutionAction[]`** — El runtime decide QUÉ hacer, el sistema lo ENTREGA y CERTIFICA
5. **El runtime NO tiene efectos secundarios** — No envía mensajes, no certifica, no proyecta

### ¿Cuál es la violación REAL entonces?

**❌ No es:** "El runtime ejecuta RAG" (eso está BIEN — es un pilar)  
**✅ Es:** "El runtime hace `fetch('http://localhost:3000/...')` en lugar de usar un servicio inyectado"

| Aspecto | Violación REAL | Corrección |
|---------|---------------|------------|
| RAG access | `fetch()` a endpoint HTTP | `ragService.search()` inyectado como pilar |
| LLM access | `import { llmClient }` directo | `services.llmClient` inyectado como pilar |
| Prompt building | `import { promptBuilder }` directo | Internalizar en el runtime (cada piso construye sus propios) |
| Tool calling loop | **NO es violación** — el runtime lo maneja soberanamente | Mantener, solo cambiar cómo accede al pilar |

---

## 🔴 Tema 1: Arquitectura de Pilares del Runtime

### Clasificación Metodológica
- **Rigor:** 🔴 Máximo
- **Complejidad:** Media-Alta — Inyección de servicios, internalización de prompt building
- **Dependencias:** T3 completado ✅
- **Tiempo estimado:** 2-4 sesiones (reducido — el refactoring es menor de lo pensado)

### Estado del Análisis

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Modelo arquitectónico | ✅ **CORREGIDO** | Modelo de Pilares (no "declara y espera") |
| Violaciones identificadas | ✅ Cerrado | `fetch()` HTTP, imports directos |
| Contrato RuntimeAdapter | ✅ Cerrado | `handleMessage(input) → ExecutionAction[]` |
| Tool calling loop | ✅ **RESUELTO** | Se mantiene en el runtime (es soberano), solo se limpia acceso al pilar |
| Flujo OpenAI Assistants | ✅ Cerrado | Usa su propia API como pilar (soberano) |

### Dudas Técnicas Abiertas

| # | Pregunta | Impacto | Estado |
|---|----------|---------|--------|
| T1.1 | ~~Tool calling loop~~ | ~~Bloqueante~~ | ✅ **RESUELTO** — El loop se queda en el runtime. Solo se corrige acceso al pilar (fetch → servicio). |
| T1.2 | **¿Patrón de inyección de pilares?** ¿`RuntimeInput.services`? ¿Constructor? ¿`PillarRegistry`? | 🟡 Medio | ⚠️ **ABIERTA** — Preferencia inicial: `RuntimeInput.services` (stateless, testeable) |
| T1.3 | **¿`promptBuilder` se internaliza en AsistentesLocal?** ¿Se copia la lógica? ¿Se mueve el archivo? | 🟡 Medio | ⚠️ **ABIERTA** — Inspeccionar si tiene lógica genérica o específica |
| T1.4 | **¿Qué pasa con el `ActionExecutor`?** ¿Se simplifica ahora que el runtime es soberano? | 🟡 Medio | ⚠️ **ABIERTA** — Inspeccionar rol actual |
| T1.5 | **¿El modo `suggest` afecta este refactoring?** | 🟢 Bajo | ⚠️ **ABIERTA** — Verificar |
| T1.6 | **`triggerSignalId` en `RuntimeInput` — ¿T1 o T2?** | 🟡 Medio | ⚠️ **ABIERTA** — Se recomienda incluirlo en T1 para preparar T2 |
| T1.7 | **¿Templates como pilar?** Cuando LLM decide "enviar template X", ¿el runtime resuelve contenido via pilar o solo declara templateId? | 🟡 Medio | ⚠️ **NUEVA** |
| T1.8 | **¿Hay más pilares futuros** además de RAG, Templates, LLMClient? | 🟢 Bajo | ⚠️ **NUEVA** |

### Sub-fases Propuestas (dentro de T1) — ACTUALIZADAS

```
T1-A: Cartografía de código actual
  └─ Inspeccionar asistentes-local.runtime.ts REAL
  └─ Inspeccionar cognitive-dispatcher.service.ts REAL
  └─ Inspeccionar ActionExecutor REAL
  └─ Inspeccionar promptBuilder — ¿genérico o específico?
  └─ Mapear TODOS los callers/consumers
  └─ Cerrar dudas T1.2 a T1.8

T1-B: Diseño del contrato de pilares
  └─ Definir RuntimeServices (pilares inyectados)
  └─ Definir patrón de inyección
  └─ Definir si RuntimeInput se extiende con triggerSignalId
  └─ Documentar contrato en specs/

T1-C: Refactoring del runtime local
  └─ Internalizar promptBuilder en el runtime
  └─ Reemplazar fetch() HTTP → ragService inyectado (pilar)
  └─ Reemplazar import llmClient → services.llmClient (pilar)
  └─ Mantener tool calling loop (es soberano, no es violación)
  └─ Verificar template handling vía pilar

T1-D: Limpieza del Dispatcher / ActionExecutor
  └─ Dispatcher inyecta pilares en RuntimeInput.services
  └─ ActionExecutor recibe ExecutionAction[] limpias
  └─ CognitionGateway certifica TODAS las acciones
  └─ Flujo: Runtime (soberano) → ExecutionAction[] → Certificación → Entrega

T1-E: Validación end-to-end
  └─ Enviar mensaje → runtime procesa (usando pilares) → certifica → entrega
  └─ RAG funciona via pilar (no fetch HTTP)
  └─ Templates funciona via pilar
  └─ Suggest mode funciona
  └─ OpenAI runtime sigue funcionando (no debe romperse)
```

---

## 🟡 Tema 2: Runtime Pipeline + Signal Hub

### Clasificación Metodológica
- **Rigor:** 🔴 Máximo (por infraestructura transversal)
- **Complejidad:** Alta — Nuevo sistema de señales, extensión de DB, WebSocket routing
- **Dependencias:** T1 completado (runtime limpio para instrumentar)
- **Tiempo estimado:** 3-5 sesiones

### Estado del Análisis

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| 7 sub-nodos del runtime definidos | ✅ Cerrado | 4.1 a 4.7 con schemas TypeScript |
| Signal Hub architecture | ⚠️ Diseño conceptual | SignalRegistry + SignalBus + DynamicWebSocketRouter |
| Extensión ai_traces | ⚠️ Diseño conceptual | `sub_phase`, `sub_phase_data`, `violations` |
| RuntimeSubPhaseTracer | ⚠️ Diseño conceptual | Clase auxiliar para tracing |
| Sub-nodo 4.6 (Tool Execution) | ⚠️ **Revisión necesaria** | Con modelo de pilares, este sub-nodo ya NO es "violación" — es uso legítimo de pilar |

### Dudas Técnicas Abiertas

| # | Pregunta | Impacto | Para cerrar |
|---|----------|---------|-------------|
| T2.1 | **¿SignalRegistry + SignalBus se integra con event system existente?** | 🔴 Bloqueante | Inspeccionar infraestructura actual |
| T2.2 | **¿Señales a `ai_traces` existente o tabla nueva?** | 🟡 Medio | Inspeccionar schema |
| T2.3 | **¿DynamicWebSocketRouter reemplaza o coexiste?** | 🟡 Medio | Inspeccionar handlers |
| T2.4 | **¿Se puede empezar con Tracer sin todo SignalBus?** | 🟡 Medio | Decisión de alcance |
| T2.5 | **¿Sub-nodo 4.6 cambia con modelo de pilares?** Ya no es "violación" sino "uso de pilar" — ¿cambia el tracing? | 🟡 Medio | Depende de T1 |
| T2.6 | **¿Hay consumidores de señales reales hoy?** | 🟢 Bajo | Determina prioridad |

### Sub-fases Propuestas (dentro de T2)

```
T2-A: Cartografía de infraestructura existente
  └─ Inspeccionar event system actual
  └─ Inspeccionar WebSocket handlers
  └─ Inspeccionar ai_traces schema y uso
  └─ Cerrar dudas T2.1 a T2.6

T2-B: Implementación mínima (RuntimeSubPhaseTracer)
  └─ Extender ai_traces con sub_phase y violations
  └─ Crear RuntimeSubPhaseTracer básico (sin SignalBus)
  └─ Instrumentar AsistentesLocalRuntime (ya limpio por T1)
  └─ Validar que trazas aparezcan en BD

T2-C: Signal Hub Infrastructure
  └─ Crear SignalRegistry
  └─ Crear SignalBus
  └─ Migrar RuntimeSubPhaseTracer para usar SignalBus
  └─ Registrar señales de runtime

T2-D: WebSocket Integration
  └─ Crear DynamicWebSocketRouter
  └─ Auto-routing basado en SignalDefinition
  └─ Validar que frontend recibe señales en tiempo real

T2-E: Validación y documentación
  └─ Pipeline completo trazado de extremo a extremo
  └─ Dashboard muestra sub-nodos del runtime
  └─ Documentar API de extensibilidad del Signal Hub
```

---

## 📊 Vista Consolidada

```
                    ┌─────────────────────────────────────────────┐
                    │          DERROTERO DE RECONSTRUCCIÓN         │
                    └─────────────────────────────────────────────┘

  ┌─────────┐      ┌──────────────────────┐      ┌──────────────────────┐
  │  T3     │      │  T1                  │      │  T2                  │
  │ Avatar  │─────→│  Pilares del         │─────→│  Pipeline +          │
  │ Access  │      │  Runtime             │      │  Signal Hub          │
  └─────────┘      └──────────────────────┘      └──────────────────────┘
  ✅ COMPLETADO     🔄 En diseño                   ⏳ Espera T1
   ~1 sesión         ~2-4 sesiones                  ~3-5 sesiones

   Dudas: 0          Dudas: 7                      Dudas: 6
   (resuelto)        (T1.1 resuelto, 6 abiertas)   (dependen de T1)
```

---

## 📋 Próxima Acción Inmediata

### ~~Para T3~~ ✅ COMPLETADO

### Para T1 (ACTIVO — siguiente paso):
1. **T1-A: Cartografía** — Inspeccionar archivos REALES del runtime
2. **Cerrar dudas T1.2-T1.8** — Especialmente patrón de inyección de pilares
3. **Producir contrato de pilares** en `specs/`

### Para T2 (espera T1):
1. Solo se activa cuando T1-C esté completo
2. La cartografía T2-A puede hacerse en paralelo con T1-C/D

---

## 🔑 Principio Rector (Actualizado)

> **"Cada runtime es un piso soberano que resuelve autónomamente usando los pilares del edificio FluxCore. El sistema certifica y entrega — nunca decide."**

Siguiendo la metodología:
- **Soberanía:** El runtime invoca pilares directamente, no pide permiso
- **Claridad:** La violación es el CÓMO (fetch HTTP) no el QUÉ (usar RAG)
- **Incrementalidad:** Primero limpiar acceso a pilares (T1), después instrumentar (T2)
- **Backward compatibility:** T1 no rompe OpenAI runtime, T2 no rompe pipeline existente

---

*Documento vivo. Se actualiza conforme se cierran dudas técnicas y se completan fases.*
