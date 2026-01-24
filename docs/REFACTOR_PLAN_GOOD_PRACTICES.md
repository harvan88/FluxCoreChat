# Auditoría de Calidad y Plan de Refactorización FluxCore

**Fecha:** 2026-01-23
**Estado Actual:** Funcional pero Frágil (Monolito Lógico)

## 1. Diagnóstico de Problemas (Code Smells)

### A. Backend: "God Objects"
Actualmente, dos archivos concentran el 90% de la lógica de FluxCore:
- `apps/api/src/routes/fluxcore.routes.ts`: **~1425 líneas**.
- `apps/api/src/services/fluxcore.service.ts`: **~1420 líneas**.

**Riesgos:**
1.  **Violación de SRP (Single Responsibility Principle):** Un solo archivo cambia por razones dispares (arreglar un bug de Assistant afecta al archivo de Vector Stores).
2.  **Colisiones de Código:** Múltiples desarrolladores (o agentes) editando el mismo archivo causan conflictos y errores de sintaxis (como los vistos hoy).
3.  **Testabilidad Nula:** Es casi imposible escribir tests unitarios aislados para "crear asistente" sin cargar todo el servicio gigante.

### B. Frontend: Lógica Acoplada
Componentes como `OpenAIVectorStoresView.tsx` manejan:
1.  Peticiones HTTP (`fetch`).
2.  Gestión de estado local compleja.
3.  Logica de negocio (Sync decisions).
4.  Renderizado de UI.

**Riesgos:**
- Difícil de reutilizar lógica en otras partes.
- Renderizados innecesarios.
- Componentes "pesados" difíciles de leer.

---

## 2. Arquitectura Propuesta: Modular y Composable

El objetivo es pasar de una estructura "por tipo de archivo" a una **estructura por dominio**.

### Backend Refactoring

Estructura de carpetas propuesta:

```text
apps/api/src/
├── modules/
│   ├── fluxcore/
│   │   ├── assistants/
│   │   │   ├── assistants.controller.ts  <-- Manejo de HTTP Request/Response
│   │   │   ├── assistants.service.ts     <-- Lógica de negocio pura
│   │   │   └── assistants.schema.ts      <-- Validaciones Zod/Elysia
│   │   ├── vector-stores/
│   │   │   ├── vector-stores.controller.ts
│   │   │   ├── vector-stores.service.ts
│   │   │   └── vector-stores-sync.service.ts <-- Lógica OpenAI aislada
│   │   └── tools/
│   │       ├── tools.service.ts
│   │       └── ...
```

**Ventajas:**
- **Archivos pequeños (< 300 líneas):** Fáciles de leer y mantener.
- **Aislamiento:** Un error en Vector Stores no rompe Assistants.
- **Escalabilidad:** Fácil agregar nuevos dominios.

### Frontend Refactoring

Implementar patrón **Container/Presentational** + **Custom Hooks**.

1.  **Hooks (Lógica):**
    - `hooks/fluxcore/useVectorStores.ts`
    - `hooks/fluxcore/useOpenAISync.ts`
2.  **Componentes (UI Pura):**
    - `components/fluxcore/vector-stores/VectorStoreList.tsx`
    - `components/fluxcore/vector-stores/VectorStoreCard.tsx`
3.  **Vistas (Orquestadores):**
    - `views/VectorStoresView.tsx` (Solo conecta Hooks con Componentes).

---

## 3. Hoja de Ruta (Roadmap)

1.  **Paso 1 (Prioritario):** Dividir `fluxcore.service.ts` en 3 servicios independientes (`AssistantsService`, `VectorStoresService`, `ToolsService`). Mantener un archivo `index.ts` que los exporte para no romper imports actuales masivamente.
2.  **Paso 2:** Extraer controladores de `fluxcore.routes.ts`.
3.  **Paso 3:** Implementar Hooks en Frontend.

Esta refactorización transformará FluxCore en un sistema de **grado empresarial**.
