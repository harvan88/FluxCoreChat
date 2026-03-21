---
id: "assistants-subsystem"
type: "subsystem"
status: "stable"
criticality: "high"
location: "apps/web/src/components/fluxcore/assistants"
---

# Subsistema de Asistentes - FluxCore

**Fecha:** 2026-03-19  
**Versión:** v8.3  
**Componente Principal:** `apps/web/src/components/fluxcore/assistants/AssistantDetail.tsx`  
**Componente de Listado:** `apps/web/src/components/fluxcore/assistants/AssistantList.tsx`  
**Esquema BD:** `packages/db/src/schema/fluxcore-assistants.ts`

---

## 🚨 **PROBLEMAS CRÍTICOS IDENTIFICADOS**

### 1. **Inconsistencia UI vs BD en Campos de Gobernanza**
- **Problema:** UI guarda `tone`, `language`, `useEmojis` en `timingConfig` pero schema los define en `modelConfig`
- **Impacto:** Datos guardados en lugar incorrecto, posibles pérdidas de configuración
- **Evidencia:** `AssistantDetail.tsx:496-527` vs `fluxcore-assistants.ts:49`

### 2. **Contradicción Schema vs Implementación**
- **Problema:** Schema soporta múltiples instrucciones por asistente pero UI solo usa la primera
- **Impacto:** Funcionalidad del schema no aprovechada, confusión arquitectónica
- **Evidencia:** `fluxcore-assistant-instructions.ts:5` vs `AssistantDetail.tsx:198`

**Acción requerida:** Definir dirección arquitectónica y corregir inconsistencias antes de producción.

---

## 🎯 1. Definición y Propósito

Los **Asistentes** en FluxCore son **configuraciones cognitivas** (`RuntimeConfig`) que definen cómo una IA debe comportarse. Cada asistente representa una personalidad específica con su propia instrucción, herramientas, y reglas de automatización.

**Invariantes Fundamentales:**
- **Runtime Soberano:** Cada asistente puede ejecutarse en `local` (FluxCore) o `openai` (OpenAI Assistants API)
- **SOLO UNA Instrucción:** Cada asistente puede vincular **exactamente UNA** instrucción (no múltiples)
- **MÚLTIPLES Bases de Conocimiento:** Puede vincular múltiples `Vector Stores` simultáneamente
- **MÚLTIPLES Herramientas:** Puede inyectar múltiples `ToolConnections` según capacidades

---

## 📋 2. Interfaz de Listado (`AssistantList.tsx`)

Vista principal que muestra todos los asistentes de la cuenta con información clave:

### 2.1 Elementos Visuales por Asistente
- **Nombre y Descripción:** Texto principal del asistente
- **Indicadores Visuales:** Íconos diferenciadores (OpenAI vs Bot genérico)
- **Estado Activo:** Punto verde (🟢) denota el asistente activo de la cuenta
- **Métricas:** Tamaño en disco (`sizeBytes`), tokens usados, última modificación

### 2.2 Acciones Disponibles
- **Abrir Editor:** Click en el asistente abre `AssistantDetail.tsx`
- **Activar/Desactivar:** Botón para cambiar estado del asistente

---

## ⚙️ 3. Interfaz de Edición (`AssistantDetail.tsx`)

Interfaz rica estructurada en **Secciones Colapsables (`CollapsibleSection`)** que se habilitan/deshabilitan según el runtime.

### 3.1 Cabecera y Nombre
- **Edición Inline:** Nombre editable directamente con autoguardado (`onBlur`)
- **Píldora de Runtime:** Indicador visual del runtime seleccionado
- **External ID (Solo OpenAI):** Banner obligatorio para ingresar `asst_xxxx` de platform.openai.com

### 3.2 Configuración Inicial
- **Sistema de Instrucciones:** **SOLO UNA instrucción por asistente**. La UI lee `assistant.instructionIds?.[0]`. Permite seleccionar existente o crear nueva (abre editor en pestaña separada). La instrucción vinculada se muestra como Badge con botón X para desvincular.
  - **⚠️ INCONSISTENCIA IDENTIFICADA:** El schema `fluxcore-assistant-instructions.ts` comenta "Permite componer un asistente con múltiples instrucciones ordenadas" y tiene soporte para `order` y múltiples registros, pero la UI actualmente solo usa `instructionIds?.[0]` (la primera).
  - **Evidencia en código:** Schema soporta N:M pero `AssistantDetail.tsx:198` solo lee el primer ID: `const currentId = assistant.instructionIds?.[0];`
  - **Decisión arquitectónica requerida:** O habilitar múltiples instrucciones en UI o simplificar schema a una sola instrucción
- **Base de Conocimiento:** Permite vincular **MÚLTIPLES** `Vector Stores`. Si runtime es OpenAI, filtra solo bases compatibles (`vs.backend === 'openai'`).
- **Herramientas (Tools):** Permite inyectar múltiples `ToolConnections`. Oculta herramientas legacy (`hiddenToolNames = new Set(['Búsqueda en archivos'])`).

### 3.3 Proveedor IA y Modelo (Solo Runtime Local)
- **Empresa proveedora:** Select entre `openai` y `groq`
- **Modelo disponible:** Dinámico según proveedor (gpt-4o, etc. para OpenAI; modelos Groq para Groq)
- **Oculto para OpenAI:** Esta sección se oculta si runtime es OpenAI

### 3.4 Tiempo de Espera (TimingConfig)
- **Segundos de espera:** Input numérico para delay artificial
- **Smart Delay:** Checkbox que deshabilita input manual y confía en `CognitionWorker`

### 3.5 Configuración de Modelo
- **Temperatura:** 0 a 2
- **Top P:** 0 a 1
- **Tokens máximos:** Hasta 8192
- **Formato de respuesta:** Texto vs JSON

### 3.6 Automatización y Gobernanza (CONEXIÓN REAL)
- **Modo de respuesta:** `auto`, `suggest` o `off`. **CONECTADO REALMENTE** al backend via `useAssistantMode` hook:
  - Flujo: UI → `useAssistantMode.setMode()` → `api.setAssistantMode()` → `PATCH /fluxcore/assistants/active-mode` → BD `fluxcore_assistants.timingConfig.mode` → `FluxPolicyContextService` → `CognitiveDispatcher`
  - Múltiples controles UI conectados: `AIStatusHeader` (global), `AIStatusIndicator` + `FluxCoreComposer` (per-conversación)
- **Tono:** Neutral, Formal, Casual. ✅ **CORREGIDO - Ahora guarda en `assistant.modelConfig.tone`**
- **Idioma:** Español, Inglés, etc. ✅ **CORREGIDO - Ahora guarda en `assistant.modelConfig.language`**
- **Usar emojis:** Checkbox que guarda en `assistant.modelConfig.useEmojis` ✅ **CORREGIDO - Ahora en modelConfig**

### 3.7 Acciones del Footer
- **Activar Asistente:** Botón con confirmación (solo si estado no es 'active')
- **Copiar Config Activa:** Botón que genera JSON completo de configuración actual
- **Eliminar Asistente:** `DoubleConfirmationDeleteButton` que cierra pestaña, actualiza lista y elimina de BD

---

## 🛠️ 4. Sistema de Herramientas (Tools)

### 4.1 Modelo de Datos
Tres tablas en `fluxcore-tools.ts`:
- **`fluxcore_tool_definitions`:** Plantillas del sistema (slug, name, schema, authType)
- **`fluxcore_tool_connections`:** Conexiones por cuenta (authConfig, status, lastUsedAt)
- **`fluxcore_assistant_tools`:** Relación N:M (isEnabled)

### 4.2 Inyección en Runtimes
- **AsistentesLocal:** Declara herramientas dinámicamente (`SEARCH_KNOWLEDGE_TOOL`, `SEND_TEMPLATE_TOOL`) según vectorStores/plantillas
- **AsistentesOpenAI:** FluxCore declara functions a OpenAI Assistants API, intercepta `requires_action` y ejecuta localmente

### 4.3 Ejecución Real
- **`search_knowledge`:** Llama a Query Service interno con pgvector cosine search (NO accede BD directamente)
- **`send_template`:** Usa `templateRegistryService` para buscar y formatear plantillas autorizadas
- **Soberanía:** Las herramientas se ejecutan en dominio FluxCore, el LLM solo solicita su uso

### 4.4 Impacto en el Prompt Final
Las herramientas disponibles se inyectan en el System Prompt, afectando directamente lo que la IA puede decidir hacer.

---

## 🗄️ 5. Reflejo en la Base de Datos

Tabla `fluxcore_assistants`:
- **`modelConfig`:** JSONB con `provider`, `model`, `temperature`, `responseFormat` y también `tone`, `language`, `useEmojis`
  - **⚠️ ERROR CRÍTICO IDENTIFICADO:** La documentación anterior mencionaba `tone`, `language`, `useEmojis` en `timingConfig`, pero el schema los define en `modelConfig`. La UI también los guarda incorrectamente en `timingConfig`.
  - **Evidencia en código:** `fluxcore-assistants.ts:49` define `AssistantModelConfig & { tone?: string; language?: string; useEmojis?: boolean }`
- **`timingConfig`:** JSONB con `responseDelaySeconds`, `smartDelay`, `mode`
  - **Nota:** No contiene `tone`, `language`, `useEmojis` a pesar de que la UI los guarda aquí
- **Relaciones:** Tablas puente para instrucciones y vector stores (N:M)

---

## 🔄 6. Flujo End-to-End

1. **Creación:** Usuario crea asistente → UI valida → POST `/fluxcore/assistants` → BD
2. **Configuración:** Usuario edita campos → `onUpdate` con estrategia 'immediate'/'debounce' → PATCH `/fluxcore/assistants/:id`
3. **Activación:** Usuario hace clic "Activar" → PATCH `/fluxcore/assistants/:id/status` → BD → Eventos
4. **Ejecución:** `CognitionWorker` → `CognitiveDispatcher` → `RuntimeGateway` → Runtime específico
5. **Eliminación:** Usuario confirma eliminación → DELETE `/fluxcore/assistants/:id` → BD → UI actualizada

---

## 📚 7. Dependencias Clave

- **UI:** `CollapsibleSection`, `Checkbox`, `DoubleConfirmationDeleteButton`
- **Hooks:** `useAssistantMode`, `useAssistants`
- **Servicios Backend:** `assistants.service.ts`, `flux-policy-context.service.ts`
- **Runtimes:** `asistentes-local.runtime.ts`, `asistentes-openai.runtime.ts`
- **Schema:** `fluxcore-assistants.ts`, `fluxcore-tools.ts`

---

## 🎭 8. Comportamientos Especiales

- **Autoguardado Real:** Cada modificación se guarda inmediatamente con feedback visual
- **Filtrado Inteligente:** Las bases de conocimiento y herramientas se filtran según compatibilidad
- **Validación de Estado:** Botón de activación deshabilitado hasta que se cumplan requisitos
- **Copia de Configuración:** Exportación JSON completa para trazabilidad y debugging
