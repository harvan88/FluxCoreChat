# Arquitectura de Modos de IA: Plan de Unificación de Nomenclatura (v8.9) - FINALIZADO ✅

Este documento confirma la **Unificación Total** de los términos de modos de IA en FluxCore. Se ha eliminado la capa de traducción en favor de un lenguaje único y limpio en todo el sistema.

---

## 🛠️ Acciones Realizadas

### 1. Unificación en Base de Datos
*   **Schema**: Se actualizó `packages/db/src/schema/automation-rules.ts` para que `AutomationMode` sea `'auto' | 'suggest' | 'off'`.
*   **Default**: El valor por defecto de la columna `mode` cambió de `'supervised'` a `'suggest'`.

### 2. Refactor de Backend
*   **AutomationControllerService**: Migrado completamente a la nueva nomenclatura. Se implementó el método `getRelationshipMode` para dar soporte a la jerarquía de resolución.
*   **FluxPolicyContextService**: Se implementó la resolución jerárquica (Relationship Rules > Account Policy). Se eliminaron las traducciones/mapeos.
*   **WebSockets**: El `ws-handler.ts` ahora procesa eventos usando `evaluation.mode === 'auto'`.
*   **Rutas**: Actualización de validaciones en `automation.routes.ts` y `fluxcore.routes.ts`.

### 3. Refactor de Frontend
*   **Hooks**: `useAutomation.ts` y `useAssistantMode.ts` operan con los nuevos valores.
*   **Componentes de Conversación**: 
    *   Se creó `ConversationRowAIStatus.tsx`.
    *   `ConversationsList.tsx` ahora muestra y permite cambiar el modo de IA de forma independiente para cada chat (Relationship), respetando la jerarquía.
*   **Settings**: `AutomationSection.tsx` actualizado para usar los nuevos términos en la creación de reglas.

### 4. Limpieza de Deuda Técnica
*   Eliminación de múltiples archivos y variables "Legacy" identificados en el análisis.
*   Corrección de lints en `FluxPolicyContextService` y `ConversationsList`.

---

## 🏁 Estado Actual
El sistema ahora opera bajo una **línea recta de igualdad**:

`DB (auto) ➔ Service (auto) ➔ PolicyContext (auto) ➔ Frontend (auto)`

Se han unificado los términos y se ha habilitado el control granular por conversación que era el requerimiento subyacente.
