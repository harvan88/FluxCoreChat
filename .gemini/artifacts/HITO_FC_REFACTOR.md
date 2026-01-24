# 🏗️ Hito FC-REFACTOR: Refactorización de Arquitectura FluxCore

**Fecha de inicio:** 2026-01-24
**Estado:** ⬜ EN PROGRESO (Fase 3)
**Objetivo:** Refactorizar los monolitos de FluxCore sin cambiar funcionalidad ni estética

---

## 📊 Resumen Ejecutivo

### Problema Identificado
Los componentes principales de FluxCore son **monolitos** que dificultan mantenibilidad:

| Componente | Líneas Originales | Estado | Responsabilidades |
|------------|------------------|--------|-------------------|
| `AssistantsView.tsx` | 1,289 | ✅ Refactorizado (~140) | Composición de activos |
| `InstructionsView.tsx` | 807 | ⬜ Pendiente | Gestión de Prompts |
| `VectorStoresView.tsx` | 622 | ⬜ Pendiente | Configuración RAG |
| `OpenAIVectorStoresView.tsx` | 726 | ⬜ Pendiente | Proxy OpenAI |

### Resultados a la fecha
- ✅ **Separación de Concernimientos**: Lógica movida a Business Hooks.
- ✅ **Reutilización**: Creada librería de componentes `shared` y `detail`.
- ✅ **Escalabilidad**: El core ahora es modular y tipado.

---

## 🎯 Fases del Hito

### Fase 1: Infraestructura Base ✅ COMPLETADA

- ✅ Tipos centralizados en `types/fluxcore/`.
- ✅ Utilidades en `lib/fluxcore/`.
- ✅ Hooks básicos en `hooks/fluxcore/`.

### Fase 2: Componentes Compartidos ✅ COMPLETADA (2026-01-24)

- ✅ Creados componentes: `StatusBadge`, `EmptyState`, `LoadingState`, `EntityActions`, `DetailHeader`, `EditableName`, `IdCopyable`.
- ✅ Sistema de barrel exports implementado.

### Fase 3: Refactorización de Vistas ⬜ EN PROGRESO

#### 3.1 AssistantsView.tsx ✅ COMPLETADO (2026-01-24)
- **Logro:** Reducción del 90% en líneas de código del monolito.
- **Hooks creados:** `useAssistants`, `useInstructions`, `useVectorStores`, `useTools`.
- **Componentes creados:** `AssistantList`, `AssistantDetail`, `ResourceSelector`, `RuntimeSelectorModal`.
- **Estado:** 100% Funcional, Build OK, Push OK (Commit `7cd1946`).

#### 3.2 InstructionsView.tsx ⬜ PENDIENTE
- **Objetivo:** Reducir de 807 líneas a <200 líneas.
- **Acción:** Mover lógica a `useInstructions` y desglosar en componentes de módulo.

---

## ✅ Criterios de Aceptación por Fase

### Fase 1 & 2 ✅ COMPLETADAS

### Fase 3 ⬜ EN PROGRESO
- [x] AssistantsView reducido a 140 líneas.
- [ ] InstructionsView reducido a <200 líneas.
- [ ] VectorStoresView reducido a <200 líneas.
- [x] Build exitoso (`bun run build`).
- [ ] 0 cambios visuales.

---

## 📍 ESTADO ACTUAL Y PRÓXIMOS PASOS

### Última actualización: 2026-01-24T12:55

**Estado actual:**
- ✅ Fase 1, 2 y 3.1 completadas con éxito.
- ✅ **Build OK** realizado tras la gran refactorización de Asistentes.
- ✅ **Git Commit & Push OK** ejecutado.

**Próximo paso:**
> Iniciar refactorización de `InstructionsView.tsx`.
> Usaremos el hook `useInstructions.ts` (ya existente) y crearemos `InstructionList.tsx` e `InstructionDetail.tsx`.

---

## 📁 Archivos Clave Creados (Fase 3.1)

```
apps/web/src/
├── hooks/fluxcore/
│   ├── useAssistants.ts
│   ├── useInstructions.ts
│   ├── useVectorStores.ts
│   └── useTools.ts
└── components/fluxcore/
    ├── assistants/
    │   ├── AssistantList.tsx
    │   ├── AssistantDetail.tsx
    │   ├── RuntimeSelectorModal.tsx
    │   └── index.ts
    └── forms/
        └── ResourceSelector.tsx
```
