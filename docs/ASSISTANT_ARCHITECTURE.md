# Arquitectura de Asistentes FluxCore

Este documento describe la arquitectura de los dos tipos de asistentes soportados por FluxCore y sus flujos de respuesta.

## Tipos de Asistentes

### 1. Asistente Local FluxCore (`runtime: 'local'`)

**Características:**
- Instrucciones almacenadas en la base de datos local (`fluxcore_instructions`)
- Vector stores locales con embeddings propios
- Usa Chat Completions API (OpenAI/Groq compatible)
- Soporte para múltiples providers con fallback

**Flujo de respuesta:**
```
Usuario envía mensaje
    ↓
ai.service.processMessage()
    ↓
fluxcoreService.resolveActiveAssistant() → obtiene composición
    ↓
composition.assistant.runtime === 'local'
    ↓
FluxCoreExtension.onMessage() → Chat Completions API
    ↓
Respuesta generada
```

**Archivos clave:**
- `apps/api/src/services/fluxcore.service.ts` - Gestión de asistentes locales
- `extensions/fluxcore/src/index.ts` - FluxCoreExtension con Chat Completions
- `apps/api/src/services/ai.service.ts` - Orquestación del flujo

---

### 2. Asistente OpenAI (`runtime: 'openai'`)

**Características:**
- Instrucciones almacenadas directamente en OpenAI (256K chars max)
- Vector stores nativos de OpenAI con file_search
- Usa OpenAI Assistants API (threads/runs)
- Aprovecha tools nativos de OpenAI (code_interpreter, file_search)

**Flujo de respuesta:**
```
Usuario envía mensaje
    ↓
ai.service.processMessage()
    ↓
fluxcoreService.resolveActiveAssistant() → obtiene composición
    ↓
composition.assistant.runtime === 'openai'
composition.assistant.externalId existe
    ↓
openaiSync.runAssistantWithMessages() → Assistants API
    ↓
1. Crear thread con mensajes
2. Crear run con assistant_id
3. Polling hasta completion
4. Obtener respuesta del thread
    ↓
Respuesta generada
```

**Archivos clave:**
- `apps/api/src/services/openai-sync.service.ts` - Threads & Runs API
- `apps/api/src/services/ai.service.ts` - Detección de runtime y routing
- `apps/web/src/components/editors/OpenAIAssistantEditor.tsx` - Editor dedicado

---

## Componentes de UI

### OpenAIAssistantEditor

Editor dedicado para instrucciones de asistentes OpenAI con:
- Auto-save cada 2 segundos
- Sincronización con OpenAI al guardar
- Indicador de estado de sincronización
- Referencia al asistente vinculado en el footer
- Límite de 256K caracteres

### ExpandedEditor

Editor genérico para instrucciones locales con:
- Vista código/preview
- Contador de tokens
- Acciones de copiar/descargar

---

## Base de Datos

### Tabla `fluxcore_assistants`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | ID local |
| account_id | uuid | Cuenta propietaria |
| name | varchar | Nombre del asistente |
| description | text | Descripción (512 chars para OpenAI) |
| external_id | varchar | ID en OpenAI (asst_xxx) |
| runtime | varchar | 'local' o 'openai' |
| status | varchar | 'draft', 'active', 'disabled' |
| model_config | jsonb | Configuración del modelo |

### Diferencias por Runtime

| Aspecto | Local | OpenAI |
|---------|-------|--------|
| Instrucciones | `fluxcore_instructions` + `fluxcore_assistant_instructions` | Directamente en OpenAI |
| Vector Stores | `fluxcore_vector_stores` (backend='local') | `fluxcore_vector_stores` (backend='openai') |
| Tools | `fluxcore_tool_definitions` + `fluxcore_tool_connections` | Configurados en OpenAI |
| API | Chat Completions | Assistants API (threads/runs) |

---

## Límites de OpenAI

| Campo | Límite |
|-------|--------|
| instructions | 256,000 caracteres |
| description | 512 caracteres |
| name | 256 caracteres |
| vector_store_ids | Máximo 1 por asistente |
| file_search | Máximo 10,000 archivos |

---

## Verificación de Flujo

Para verificar que un asistente OpenAI está funcionando correctamente:

1. **Activar el asistente** - El asistente debe tener `status: 'active'`
2. **Verificar externalId** - Debe existir un `external_id` válido (asst_xxx)
3. **Verificar logs** - Buscar en consola:
   - `[ai-service] Assistant runtime: openai`
   - `[ai-service] 🚀 Usando flujo de OpenAI Assistants API`
   - `[ai-service] ✓ Respuesta de OpenAI Assistants API recibida`

Para asistentes locales:
   - `[ai-service] Assistant runtime: local`
   - `[ai-service] 📦 Usando flujo local FluxCore (Chat Completions)`
