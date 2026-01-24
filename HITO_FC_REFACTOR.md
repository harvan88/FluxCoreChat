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

### Fase 2: Componentes Compartidos ⬜ PENDIENTE

**Prioridad:** Alta
**Riesgo:** Bajo
**Estimación:** 2-3 días
**Dependencia:** Fase 1 completada

#### 2.1 Componentes de Presentación

```
Crear: src/components/fluxcore/shared/
├── StatusBadge.tsx             # Badge de estado unificado
├── EmptyState.tsx              # Estado vacío reutilizable
├── LoadingState.tsx            # Estado de carga
├── EntityActions.tsx           # Acciones comunes
└── index.ts
```

#### 2.2 Componentes de Detalle

```
Crear: src/components/fluxcore/detail/
├── DetailHeader.tsx            # Header de vista detalle
├── EditableName.tsx            # Input con auto-save
├── IdCopyable.tsx              # ID con click-to-copy
└── index.ts
```

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
├── types/fluxcore/              # ← NUEVO
│   ├── index.ts
│   ├── assistant.types.ts
│   ├── instruction.types.ts
│   ├── vectorStore.types.ts
│   └── common.types.ts
│
├── lib/fluxcore/                # ← NUEVO
│   ├── formatters.ts
│   ├── constants.ts
│   └── index.ts
│
├── hooks/fluxcore/              # ← NUEVO
│   ├── useAutoSave.ts
│   ├── useClipboard.ts
│   └── index.ts
│
└── components/fluxcore/
    ├── shared/                  # ← NUEVO
    ├── detail/                  # ← NUEVO
    ├── components/              # Existente ✅
    └── views/                   # Existente ✅ (a refactorizar)
```

---

## ✅ Criterios de Aceptación por Fase

### Fase 1
- [ ] Tipos centralizados en `types/fluxcore/`
- [ ] Utilidades en `lib/fluxcore/`
- [ ] Hooks básicos en `hooks/fluxcore/`
- [ ] Build exitoso (`bun run build`)
- [ ] Sin cambios en archivos existentes de views
- [ ] 0 regresiones funcionales

### Fase 2
- [ ] Componentes compartidos creados
- [ ] Al menos 3 componentes de presentación
- [ ] Build exitoso
- [ ] Componentes visualmente idénticos a originales

### Fase 3
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

## 📋 Guía de Verificación Manual

### Después de cada cambio:
1. [ ] `bun run build` pasa sin errores
2. [ ] El servidor dev funciona (`bun run dev`)
3. [ ] La vista de Asistentes carga correctamente
4. [ ] La vista de Instrucciones carga correctamente
5. [ ] La vista de Vector Stores carga correctamente
6. [ ] CRUD funciona (crear, editar, eliminar)
7. [ ] Auto-save funciona en asistentes
8. [ ] Copy ID funciona
9. [ ] Navegación entre tabs funciona

---

## 📍 ESTADO ACTUAL Y PRÓXIMOS PASOS

### Última actualización: 2026-01-24T11:55

**Estado actual:**
- ✅ Análisis completo documentado en `.gemini/artifacts/ANALISIS_ARQUITECTURA_FLUXCORE.md`
- ✅ Protocolo de programación recuperado: `2. PROTOCOLO_PROGRAMACION.md`
- ✅ **Fase 1 COMPLETADA** - Infraestructura base creada:
  - ✅ Tipos centralizados en `types/fluxcore/` (5 archivos)
  - ✅ Utilidades en `lib/fluxcore/` (3 archivos)
  - ✅ Custom hooks en `hooks/fluxcore/` (4 archivos)
- ✅ Build exitoso verificado
- 📋 Fase 2 lista para iniciar (Componentes Compartidos)

**Próximo paso:**
> Iniciar Fase 2: Crear componentes compartidos (`StatusBadge`, `EmptyState`, `LoadingState`, etc.)

**Para continuar desde otra sesión:**
```bash
# Verificar estado del proyecto
cd FluxCoreChat
bun run build

# Revisar documentación:
# - .gemini/artifacts/HITO_FC_REFACTOR.md  (este archivo)
# - .gemini/artifacts/ANALISIS_ARQUITECTURA_FLUXCORE.md

# Continuar desde Fase 2
```

**Archivos creados en esta sesión:**
```
apps/web/src/
├── types/fluxcore/
│   ├── common.types.ts         # 133 líneas - Tipos compartidos
│   ├── assistant.types.ts      # 117 líneas - Tipos de asistentes
│   ├── instruction.types.ts    # 68 líneas - Tipos de instrucciones
│   ├── vectorStore.types.ts    # 131 líneas - Tipos de vector stores
│   ├── tool.types.ts           # 91 líneas - Tipos de herramientas
│   └── index.ts                # 93 líneas - Barrel export
│
├── lib/fluxcore/
│   ├── formatters.ts           # 153 líneas - Funciones de formateo
│   ├── constants.ts            # 160 líneas - Constantes centralizadas
│   └── index.ts                # 48 líneas - Barrel export
│
└── hooks/fluxcore/
    ├── useAutoSave.ts          # 100 líneas - Hook de auto-save
    ├── useClipboard.ts         # 94 líneas - Hook de portapapeles
    ├── useEntitySelection.ts   # 117 líneas - Hook de selección
    └── index.ts                # 19 líneas - Barrel export
```

---

## 📚 Referencias

- **Análisis completo:** `.gemini/artifacts/ANALISIS_ARQUITECTURA_FLUXCORE.md`
- **Especificación:** `FLUX CORE.md`
- **Plan maestro:** `1. EXECUTION_PLAN.md`
- **Protocolo:** `2. PROTOCOLO_PROGRAMACION.md`
