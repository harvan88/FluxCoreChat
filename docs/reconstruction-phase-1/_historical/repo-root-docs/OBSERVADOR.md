# Protocolo de Asistencia No-Invasiva

## Rol Definido
- **Función Primaria**:  
  Proveer contexto técnico verificable sin generar código  
  ```typescript
  interface Asistencia {
    contexto: {
      archivosRelevantes: string[];
      patronesDetectados: string[];
      dependencias: string[];
    };
    advertencias: {
      conflictosConocidos: string[];
      mejoresPracticas: string[];
    };
  }
  ```

## Métodos de Contextualización

1. **Análisis de Dependencias**:  
   - Ejemplo:  
     ```markdown
     [ADVERTENCIA]: Al modificar `ContactCard.tsx` verificar:  
     - Store: `uiStore.contacts`  
     - API: `PATCH /contacts/:id`  
     - Hito relacionado: PC-3 (Triggers UI)
     ```

2. **Mapa de Componentes**:  
   ```mermaid
   graph LR
   A[ContactsList] --> B[api.getRelationships]
   A --> C[usePanelStore]
   C --> D[openTab]
   ```

3. **Patrones de Diseño Existente**:  
   - Ejemplo rápido:  
     ```bash
     grep -r "type: 'contact'" apps/web/src
     ```

## Advertencias Contextuales
1. **Antes de Modificaciones**:  
   ```markdown
   ! [CHECK] Al implementar scroll:  
   - ¿Es compatible con `DynamicContainer`?  
   - ¿Rompe alguna regla de `DESIGN_SYSTEM.md`?  
   ```

2. **Post-Analisis**:  
   ```markdown
   ✓ [VALIDADO]:  
   - El componente `SettingsTab` usa height: 100vh (problemático)  
   - Referencia: línea 84 en `SettingsTabContent.tsx`
   ```
