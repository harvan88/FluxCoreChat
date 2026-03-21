---
id: "instructions-subsystem"
type: "subsystem"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/fluxcore/instructions"
---

# Subsistema de Instrucciones - FluxCore

**Fecha:** 2026-03-19  
**Versión:** v8.3  
**Componente Principal:** `apps/web/src/components/fluxcore/instructions/InstructionDetail.tsx`  
**Componente de Listado:** `apps/web/src/components/fluxcore/instructions/InstructionsView.tsx`  
**Esquema BD:** `packages/db/src/schema/fluxcore-instructions.ts`

---

## 🚨 **PROBLEMAS CRÍTICOS IDENTIFICADOS**

### 1. **Inconsistencia Schema vs UI de Asistentes**
- **Problema:** Schema diseñado para múltiples instrucciones por asistente pero UI de asistentes solo usa la primera
- **Impacto:** Funcionalidad del schema no aprovechada, diseño arquitectónico confuso
- **Evidencia:** `fluxcore-assistant-instructions.ts:5` vs `AssistantDetail.tsx:198`

### 2. **Campos de Gobernanza en Ubicación Incorrecta**
- **Problema:** `tone`, `language`, `useEmojis` definidos en `modelConfig` pero UI de asistentes los guarda en `timingConfig`
- **Impacto:** Inconsistencia entre datos guardados y esperados
- **Evidencia:** `fluxcore-assistants.ts:49` vs `AssistantDetail.tsx:496-527`

**Acción requerida:** Coordinar con equipo de asistentes para definir dirección arquitectónica.

---

## 🎯 1. Definición y Propósito

Las **Instrucciones** en FluxCore son **plantillas de prompts** que contienen las directivas de comportamiento para las IA. Son entidades independientes que pueden ser reutilizadas por múltiples asistentes (relación N:M).

**Invariantes Fundamentales:**
- **Entidad Independiente:** Las instrucciones viven separadas de los asistentes
- **Reutilización:** Una misma instrucción puede ser usada por múltiples asistentes
- **Versionado:** Cada instrucción tiene versiones (`current_version_id`)
- **Gestión Centralizada:** Pueden ser gestionadas independientemente de cualquier asistente

---

## 📋 2. Interfaz de Listado (`InstructionsView.tsx`)

Vista principal que muestra todas las instrucciones disponibles en el sistema.

### 2.1 Elementos Visuales por Instrucción
- **Nombre y Descripción:** Título y contenido resumido de la instrucción
- **Estado:** Indicadores visuales de estado (activo, inactivo, gestionado)
- **Consumidores:** Lista de asistentes que usan esta instrucción
- **Metadatos:** Fecha de creación, última modificación

### 2.2 Acciones Disponibles
- **Abrir Editor:** Click en la instrucción abre `InstructionDetail.tsx`
- **Crear Nueva:** Botón para crear nueva instrucción desde cero
- **Duplicar:** Opción para copiar instrucción existente

---

## ⚙️ 3. Interfaz de Edición (`InstructionDetail.tsx`)

Editor completo con tres modalidades de visualización y gestión de estado.

### 3.1 Modos Especiales
- **Instrucción Gestionada (`isManaged`):** 
  - Si la instrucción es del sistema (ej. generada del perfil del negocio), la UI muestra un banner azul
  - Bloquea la edición del nombre
  - Delega su modificación a la sección de "Perfil" del sistema
  - **✅ VERIFICADO:** Banner azul condicional y bloqueo de inputs cuando `isManaged` es true
  - **Evidencia en código:** `InstructionDetail.tsx:147-153` - renderizado condicional del banner azul
  - **Evidencia en código:** `InstructionDetail.tsx:183-184` - `!isManaged && onNameChange(e.target.value)` bloquea edición
  - **Evidencia en código:** `InstructionDetail.tsx:192` - `disabled={isManaged}` deshabilita input del nombre
  - **Evidencia en código:** `InstructionDetail.tsx:286-287` - `!isManaged && onContentChange` y `readOnly={isManaged}` bloquean contenido

### 3.2 Las Tres Modalidades de Vista (Core)
El panel superior ofrece tres botones (tabs) para interactuar con la instrucción:

#### 💻 **Código (`viewMode === 'code'`)**
- El entorno de trabajo raw
- Editor de texto sin formato (Markdown)
- Donde el operador redacta directivas de IA, reglas de comportamiento y uso de variables
  - **✅ VERIFICADO:** `textarea` con `onChange={(e) => !isManaged && onContentChange(e.target.value)}`
  - **Evidencia en código:** `InstructionDetail.tsx:283-289` - textarea completo con manejo de cambios

#### 👁️ **Vista Previa (`viewMode === 'preview'`)**
- Renderiza el Markdown ingresado usando `react-markdown` y `rehype-sanitize`
- Permite validar formato, listas, negritas de forma cómoda
- Vista previa visual para el humano
  - **✅ VERIFICADO:** Importa `ReactMarkdown`, `remarkGfm`, `rehypeSanitize`
  - **Evidencia en código:** `InstructionDetail.tsx:3-5` - imports de librerías de markdown

#### ✨ **Vista Final / IA (`Vista final (IA)`)**
- **Propósito crítico:** No es simple preview visual, es simulación técnica
- **Cómo funciona:** 
  - Requiere que el usuario elija **qué asistente** usará de contexto (si hay varios vinculados)
  - Hace request al backend (`onRequestPromptPreview`)
  - Inyecta perfiles, dependencias y reglas de gobernanza reales
  - Devuelve **el prompt final exacto (System Prompt ensamblado)** que leerá el LLM
  - **✅ VERIFICADO:** Botón con texto "Vista final (IA)" y manejo de `onRequestPromptPreview`
  - **Evidencia en código:** `InstructionDetail.tsx:220-222` - botón con Sparkles icon, línea 133: `onRequestPromptPreview?.(single.id, single.name)`

### 3.3 Gestión de Variables y Contexto
- **Variables Dinámicas:** El editor soporta placeholders que serán reemplazados
- **Contexto de Asistente:** La vista final (IA) selecciona qué asistente proporciona contexto
- **Inyección Real:** El backend inyecta datos reales del asistente seleccionado

### 3.4 Autoguardado y Estado
- **Autoguardado Real:** Cada modificación se guarda inmediatamente via `onUpdate` con estrategia `'immediate'` o `'debounce'`
  - **✅ VERIFICADO:** Usa hook `useAutoSave` con `AUTOSAVE_DELAY_MS = 500` 
  - **Evidencia en código:** `InstructionsView.tsx:160-184` implementa `useAutoSave` con delay de 500ms
  - **Evidencia en código:** `InstructionDetail.tsx:47` recibe `lastAutosave` prop y línea 117-127 formatea mensaje de estado
- **Estado de Guardado:** UI muestra estado comparando `lastAutosave` con tiempo actual
  - **✅ VERIFICADO:** Función `formatAutosaveInfo()` muestra "Autoguardado hace unos segundos", "Autoguardado hace 5 min", etc.
  - **Evidencia en código:** `InstructionDetail.tsx:117-127` - lógica completa de formateo de tiempo
- **Feedback Visual:** Indicadores de "Guardando...", "Guardado", "Error al guardar"
  - **✅ VERIFICADO:** UI muestra "Guardando cambios..." cuando `isAutoSaving` es true
  - **Evidencia en código:** `InstructionDetail.tsx:387-391` - renderizado condicional de estado

### 3.5 Eliminación y Navegación
- **Botón Eliminar:** `DoubleConfirmationDeleteButton` que requiere doble confirmación
  - **✅ VERIFICADO:** Componente importado y usado en ambos `InstructionDetail.tsx` y `InstructionList.tsx`
  - **Evidencia en código:** `InstructionDetail.tsx:6` importa componente, línea 395 lo usa con `onConfirm={onDelete}`
  - **Evidencia en código:** `InstructionList.tsx:82` lo usa en acciones móviles con `onDelete(row.id)`
- **Impacto en Asistentes:** Al eliminar, se desvincula automáticamente de todos los asistentes
  - **✅ VERIFICADO:** Schema define `onDelete: 'cascade'` en relación N:M
  - **Evidencia en código:** `fluxcore-assistant-instructions.ts:19` - `{ onDelete: 'cascade' }`
- **Navegación Independiente:** Se puede acceder desde múltiples puntos:
  - **✅ VERIFICADO:** `InstructionsView.tsx` es el orquestador principal
  - **Evidencia en código:** `InstructionsView.tsx:15-16` importa y renderiza `InstructionDetail` y `InstructionList`
  - Lista de instrucciones (`InstructionsView.tsx`)
  - Desde asistente (botón en Badge de instrucción vinculada)
  - Búsqueda global de instrucciones

---

## 🔗 4. Relación con Asistentes (N:M)

### 4.1 Modelo de Datos
- **Tabla Principal:** `fluxcore_instructions`
- **Tabla de Versiones:** `fluxcore_instruction_versions`
- **Tabla Puente:** `fluxcore_assistant_instructions` (relación N:M)

### 4.2 Flujo de Vinculación
1. **Creación:** Usuario crea instrucción → se guarda en `fluxcore_instructions`
2. **Vinculación:** Usuario selecciona instrucción en asistente → se crea registro en `fluxcore_assistant_instructions`
3. **Desvinculación:** Usuario hace clic en X en Badge → se elimina registro puente
4. **Eliminación:** Instrucción eliminada → todos los registros puente se eliminan en cascada

### 4.3 Comportamiento de Impacto
- **Actualización:** Cambiar instrucción afecta a TODOS los asistentes vinculados
- **Versionado:** Los asistentes siempre usan `current_version_id` de la instrucción
- **Consistencia:** No hay duplicación de contenido, solo referencias

---

## 🗄️ 5. Reflejo en la Base de Datos

### 5.1 Tablas Principales
- **`fluxcore_instructions`:** Metadatos de la instrucción (nombre, descripción, estado)
- **`fluxcore_instruction_versions`:** Contenido real de cada versión (content, created_at)
- **`fluxcore_assistant_instructions`:** Relación N:M con orden y estado de habilitación

### 5.2 Campos Clave
- **`current_version_id`:** FK a la versión activa
- **`isManaged`:** Booleano que indica si es instrucción del sistema
- **`order`:** Orden de aparición cuando hay múltiples instrucciones (legacy, ahora solo se usa la primera)
- **`is_enabled`:** Control de habilitación por asistente

---

## 🔄 6. Flujo End-to-End

### 6.1 Creación de Instrucción
1. Usuario hace clic "Nueva Instrucción" → UI abre `InstructionDetail.tsx` vacío
2. Usuario edita nombre y contenido → Autoguardado crea registro en `fluxcore_instructions`
3. Se crea primera versión en `fluxcore_instruction_versions`
4. `current_version_id` apunta a la nueva versión

### 6.2 Edición y Versionado
1. Usuario modifica contenido → Autoguardado crea NUEVA versión
2. `current_version_id` se actualiza a la nueva versión
3. Todos los asistentes vinculados ven automáticamente la nueva versión

### 6.3 Vinculación a Asistente
1. Usuario en `AssistantDetail.tsx` selecciona instrucción → UI muestra Badge
2. Backend crea registro en `fluxcore_assistant_instructions`
3. Asistente ahora usa esta instrucción en su prompt

### 6.4 Eliminación
1. Usuario confirma eliminación → Backend elimina instrucción
2. BD elimina registros puente automáticamente (cascade)
3. Asistentes vinculados quedan sin instrucción (deben seleccionar otra)

---

## 📚 7. Dependencias Clave

- **UI:** `react-markdown`, `rehype-sanitize`, `DoubleConfirmationDeleteButton`
- **Hooks:** `useInstructions`, `useInstructionDetail`
- **Servicios Backend:** `instructions.service.ts`, `template-registry.service.ts`
- **Schema:** `fluxcore-instructions.ts`
- **Integración:** `AssistantDetail.tsx` (para selección de instrucciones)

---

## 🎭 8. Comportamientos Especiales

- **Instrucciones Gestionadas:** No se pueden editar directamente, se gestionan desde Perfil
- **Vista Final (IA):** Simulación real de cómo verá la IA el prompt completo
- **Impacto en Tiempo Real:** Cambios afectan inmediatamente a todos los asistentes vinculados
- **Autoguardado Inteligente:** Usa debounce para evitar guardar cada keystroke
- **Navegación Fluida:** Se puede acceder desde múltiples puntos del sistema

---

## 🚨 9. Problemas Identificados y Decisiones Arquitectónicas

### 9.1 Inconsistencia Schema vs UI
- **Problema:** El schema `fluxcore-assistant-instructions.ts` está diseñado para múltiples instrucciones por asistente (con `order`, `isEnabled`), pero la UI de asistentes solo usa la primera instrucción (`instructionIds?.[0]`)
- **Evidencia:** 
  - Schema: "Permite componer un asistente con múltiples instrucciones ordenadas"
  - UI: `AssistantDetail.tsx:198` - `const currentId = assistant.instructionIds?.[0];`
- **Decisión requerida:** Habilitar múltiples instrucciones en UI o simplificar schema a una sola

### 9.2 Campos de Gobernanza en Ubicación Incorrecta
- **Problema:** Los campos `tone`, `language`, `useEmojis` están definidos en `modelConfig` pero la UI los guarda en `timingConfig`
- **Impacto:** Inconsistencia entre lo que se guarda y lo que se espera leer
- **Acción requerida:** Mover UI a `modelConfig` o mover schema a `timingConfig`

### 9.3 Relación N:M Implementada Parcialmente
- **Problema:** Aunque la BD soporta relación N:M completa, la implementación actual usa solo una instrucción por asistente
- **Potencial perdido:** No se aprovecha la capacidad del schema para composición de instrucciones
- **Recomendación:** Definir dirección arquitectónica clara
