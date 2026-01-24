# 🏗️ Hito FC-REFACTOR: Refactorización de Arquitectura FluxCore

**Fecha de inicio:** 2026-01-24
**Estado:** 📋 Documentado, iniciando Fase 1
**Objetivo:** Refactorizar los monolitos de FluxCore sin cambiar funcionalidad ni estética

---

## 📊 Resumen Ejecutivo

### Problema Identificado
Los componentes principales de FluxCore son **monolitos** que dificultan mantenibilidad:

| Componente | Líneas | Responsabilidades | Riesgo |
|------------|--------|-------------------|--------|
| `AssistantsView.tsx` | 1,289 | 14+ | 🔴 Alto |
| `InstructionsView.tsx` | 807 | 9+ | 🟠 Medio-Alto |
| `VectorStoresView.tsx` | 622 | 7+ | 🟡 Medio |
| `OpenAIVectorStoresView.tsx` | 726 | 6+ | 🟠 Medio-Alto |
| `OpenAIAssistantConfigView.tsx` | 622 | 5+ | 🟡 Medio |

### Objetivo
- ✅ Mantener funcionalidad exacta (0 regresiones)
- ✅ Mantener estética exacta (0 cambios visuales)
- ✅ Mejorar mantenibilidad y escalabilidad
- ✅ Crear componentes reutilizables
- ✅ Centralizar tipos y utilidades

---

## 🎯 Fases del Hito

### Fase 1: Infraestructura Base (Sin cambios visuales) ⬜ EN PROGRESO

**Prioridad:** Alta
**Riesgo:** Bajo
**Estimación:** 2-3 días

#### 1.1 Sistema de Tipos Centralizado ✅ COMPLETADO

```
Creado: src/types/fluxcore/
├── index.ts                    # Re-exports
├── assistant.types.ts          # Interface Assistant, AssistantCreate, etc.
├── instruction.types.ts        # Interface Instruction
├── vectorStore.types.ts        # Interface VectorStore, VectorStoreFile
├── tool.types.ts               # Interface Tool, ToolDefinition
└── common.types.ts             # Status, Visibility, ApiResponse
```

**Tareas:**
| ID | Tarea | Estado | Archivo |
|----|-------|--------|---------|
| FC-REF-101 | Crear carpeta `types/fluxcore/` | ✅ | - |
| FC-REF-102 | Crear `common.types.ts` con tipos compartidos | ✅ | `types/fluxcore/common.types.ts` |
| FC-REF-103 | Crear `assistant.types.ts` desde AssistantsView | ✅ | `types/fluxcore/assistant.types.ts` |
| FC-REF-104 | Crear `instruction.types.ts` desde InstructionsView | ✅ | `types/fluxcore/instruction.types.ts` |
| FC-REF-105 | Crear `vectorStore.types.ts` desde VectorStoresView | ✅ | `types/fluxcore/vectorStore.types.ts` |
| FC-REF-106 | Crear `tool.types.ts` | ✅ | `types/fluxcore/tool.types.ts` |
| FC-REF-107 | Crear `index.ts` con barrel exports | ✅ | `types/fluxcore/index.ts` |

#### 1.2 Utilidades Compartidas ✅ COMPLETADO

```
Creado: src/lib/fluxcore/
├── formatters.ts               # formatSize, formatDate, formatTokens
├── constants.ts                # PROVIDER_MODELS, MAX_CHARS, etc.
└── index.ts                    # Re-exports
```

**Tareas:**
| ID | Tarea | Estado | Archivo |
|----|-------|--------|---------|
| FC-REF-110 | Crear carpeta `lib/fluxcore/` | ✅ | - |
| FC-REF-111 | Extraer `formatSize()` a formatters.ts | ✅ | `lib/fluxcore/formatters.ts` |
| FC-REF-112 | Extraer `formatDate()` a formatters.ts | ✅ | `lib/fluxcore/formatters.ts` |
| FC-REF-113 | Extraer `PROVIDER_MODELS` a constants.ts | ✅ | `lib/fluxcore/constants.ts` |
| FC-REF-114 | Extraer `MAX_CHARS` a constants.ts | ✅ | `lib/fluxcore/constants.ts` |

#### 1.3 Custom Hooks Base ✅ COMPLETADO

```
Creado: src/hooks/fluxcore/
├── index.ts                    # Re-exports
├── useAutoSave.ts              # Debounce save logic
├── useClipboard.ts             # Copy with feedback
└── useEntitySelection.ts       # Patrón común de selección
```

**Tareas:**
| ID | Tarea | Estado | Archivo |
|----|-------|--------|---------|
| FC-REF-120 | Crear carpeta `hooks/fluxcore/` | ✅ | - |
| FC-REF-121 | Crear `useAutoSave.ts` | ✅ | `hooks/fluxcore/useAutoSave.ts` |
| FC-REF-122 | Crear `useClipboard.ts` | ✅ | `hooks/fluxcore/useClipboard.ts` |
| FC-REF-123 | Crear `useEntitySelection.ts` | ✅ | `hooks/fluxcore/useEntitySelection.ts` |
| FC-REF-124 | Crear `index.ts` con exports | ✅ | `hooks/fluxcore/index.ts` |

---

### Fase 2: Componentes Compartidos ✅ COMPLETADO (2026-01-24)

**Prioridad:** Alta
**Riesgo:** Bajo
**Estimación:** 2-3 días
**Dependencia:** Fase 1 completada

#### Cierre de Hito (Protocolo HTP):
- [x] **Pruebas Exitosas:** `bun run build` exitoso.
- [x] **Lint fixes:** Corregidos errores en `EditableName.tsx` y `DetailHeader.tsx`.
- [x] **Checkpoint:** Commit y Push realizados (`3977796`).
- [x] **Documentación:** Componentes documentados y centralizados.

#### 2.1 Componentes de Presentación ✅ COMPLETADO

```
Creado: src/components/fluxcore/shared/
├── StatusBadge.tsx             # Badge de estado unificado
├── EmptyState.tsx              # Estado vacío reutilizable
├── LoadingState.tsx            # Estado de carga
├── EntityActions.tsx           # Acciones comunes
└── index.ts
```

**Tareas:**
| ID | Tarea | Estado | Archivo |
|----|-------|--------|---------|
| FC-REF-201 | Crear `StatusBadge.tsx` | ✅ | `shared/StatusBadge.tsx` |
| FC-REF-202 | Crear `EmptyState.tsx` | ✅ | `shared/EmptyState.tsx` |
| FC-REF-203 | Crear `LoadingState.tsx` | ✅ | `shared/LoadingState.tsx` |
| FC-REF-204 | Crear `EntityActions.tsx` | ✅ | `shared/EntityActions.tsx` |
| FC-REF-205 | Crear barrel export `shared/index.ts` | ✅ | `shared/index.ts` |

#### 2.2 Componentes de Detalle ✅ COMPLETADO

```
Creado: src/components/fluxcore/detail/
├── DetailHeader.tsx            # Header de vista detalle
├── EditableName.tsx            # Input con auto-save
├── IdCopyable.tsx              # ID con click-to-copy
└── index.ts
```

**Tareas:**
| ID | Tarea | Estado | Archivo |
|----|-------|--------|---------|
| FC-REF-210 | Crear `EditableName.tsx` | ✅ | `detail/EditableName.tsx` |
| FC-REF-211 | Crear `IdCopyable.tsx` | ✅ | `detail/IdCopyable.tsx` |
| FC-REF-212 | Crear `DetailHeader.tsx` | ✅ | `detail/DetailHeader.tsx` |
| FC-REF-213 | Crear barrel export `detail/index.ts` | ✅ | `detail/index.ts` |

---

### Fase 3: Refactorización de Vistas ⬜ PENDIENTE

**Prioridad:** Alta
**Riesgo:** Alto
**Estimación:** 3-5 días
**Dependencia:** Fases 1 y 2 completadas

Esta fase requiere:
- Tests E2E antes de comenzar
- Branch separado
- Screenshots comparativos

---

## 📁 Estructura de Carpetas Objetivo

```
src/
├── types/fluxcore/              # ✅ COMPLETADO
│   ├── index.ts
│   ├── assistant.types.ts
│   ├── instruction.types.ts
│   ├── vectorStore.types.ts
│   └── common.types.ts
│
├── lib/fluxcore/                # ✅ COMPLETADO
│   ├── formatters.ts
│   ├── constants.ts
│   └── index.ts
│
├── hooks/fluxcore/              # ✅ COMPLETADO
│   ├── useAutoSave.ts
│   ├── useClipboard.ts
│   └── index.ts
│
└── components/fluxcore/
    ├── shared/                  # ✅ COMPLETADO
    ├── detail/                  # ✅ COMPLETADO
    ├── components/              # Existente ✅
    └── views/                   # Existente ✅ (a refactorizar en Fase 3)
```

---

## ✅ Criterios de Aceptación por Fase

### Fase 1 ✅ COMPLETADA
- [x] Tipos centralizados en `types/fluxcore/`
- [x] Utilidades en `lib/fluxcore/`
- [x] Hooks básicos en `hooks/fluxcore/`
- [x] Build exitoso (`bun run build`)
- [x] Sin cambios en archivos existentes de views
- [x] 0 regresiones funcionales

### Fase 2 ✅ COMPLETADA
- [x] Componentes compartidos creados
- [x] Al menos 3 componentes de presentación
- [x] Build exitoso
- [x] Componentes visualmente idénticos a originales

### Fase 3 ⬜ PENDIENTE
- [ ] AssistantsView reducido a <300 líneas
- [ ] InstructionsView reducido a <200 líneas
- [ ] VectorStoresView reducido a <200 líneas
- [ ] Tests E2E pasando
- [ ] 0 cambios visuales

---

## 🐛 Bugs Conocidos a Corregir

| Bug | Archivo | Línea | Descripción |
|-----|---------|-------|-------------|
| FC-BUG-001 | AssistantsView.tsx | 553-556 | Código duplicado en deleteAssistantById |
| FC-BUG-002 | InstructionsView.tsx | 652 | Renderizado duplicado de deleteError |

---

## 📋 Guía de Verificación Manual (Fase 2)

### Verificación de Componentes:
1. [ ] **StatusBadge**: Muestra colores correctos (success=active, warning=disabled, etc.)
2. [ ] **EmptyState**: Muestra icono, título y botón de acción opcional.
3. [ ] **DetailHeader**: El nombre es editable y se guarda al Blur/Enter. El ID se copia al hacer clic.

---

## 📍 ESTADO ACTUAL Y PRÓXIMOS PASOS

### Última actualización: 2026-01-24T12:15

**Estado actual:**
- ✅ Análisis de arquitectura completo.
- ✅ Fase 1 (Infraestructura) completada.
- ✅ **Fase 2 (Componentes Compartidos) COMPLETADA.**
  - Creados 7 nuevos componentes en `shared/` y `detail/`.
  - Implementado sistema de barrel exports.
- 📋 Fase 3 lista para iniciar (Refactorización de Monolitos).

**Próximo paso:**
> Iniciar Fase 3: Refactorización de `AssistantsView.tsx`.
> Se requiere crear componentes específicos del módulo (`AssistantList.tsx`, `AssistantDetail.tsx`) y migrar lógica al hook `useAssistants.ts`.

**Para continuar desde otra sesión:**
```bash
# Verificar estado del proyecto
cd FluxCoreChat
bun run build

# Revisar documentación:
# - .gemini/artifacts/HITO_FC_REFACTOR.md  (este archivo)

# Continuar desde Fase 3
```

**Archivos creados en esta sesión (Fase 2):**
```
apps/web/src/components/fluxcore/
├── shared/
│   ├── StatusBadge.tsx         # 35 líneas
│   ├── EmptyState.tsx          # 45 líneas
│   ├── LoadingState.tsx        # 25 líneas
│   ├── EntityActions.tsx       # 65 líneas
│   └── index.ts                # 5 líneas
└── detail/
    ├── EditableName.tsx        # 55 líneas
    ├── IdCopyable.tsx          # 30 líneas
    ├── DetailHeader.tsx        # 75 líneas
    └── index.ts                # 4 líneas
```

---

## 📚 Referencias

- **Análisis completo:** `.gemini/artifacts/ANALISIS_ARQUITECTURA_FLUXCORE.md`
- **Especificación:** `FLUX CORE.md`
- **Plan maestro:** `1. EXECUTION_PLAN.md`
- **Protocolo:** `2. PROTOCOLO_PROGRAMACION.md`
