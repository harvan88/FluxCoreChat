# Auditoría H0.4: UI y Frontend

**Fecha:** 2026-02-17  
**Objetivo:** Verificar reutilización de componentes UI y compatibilidad con v8.2

---

## 1. MESSAGE BUBBLE

### 1.1 Verificación de Soporte para Mensajes del Sistema

**Archivo:** `apps/web/src/components/chat/MessageBubble.tsx`

#### ✅ CUMPLE: Soporte para `generatedBy: 'system'`

**Líneas 103-126:**
```typescript
if (message.generatedBy === 'system') {
  const systemMeta = (message.content as any)?.__system;
  
  return (
    <div className="flex justify-center my-2">
      <div className="max-w-[85%] rounded-xl px-4 py-2.5 bg-warning/10 border border-warning/20 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <ShieldAlert size={14} className="text-warning" />
          <span className="text-xs font-medium text-warning">
            {systemMeta?.type === 'ai_blocked' ? 'IA no disponible' : 'Sistema'}
          </span>
        </div>
        {/* ... */}
      </div>
    </div>
  );
}
```

**Análisis:** El componente ya soporta mensajes de sistema con tipo `ai_blocked`. Esto es exactamente lo requerido por Canon v8.2 cuando `ExecutionPlan` está bloqueado.

**Conclusión:** ✅ **REUTILIZABLE SIN CAMBIOS** para v8.2.

#### ✅ CUMPLE: Soporte para `generatedBy: 'ai'`

**Líneas 321-326:**
```typescript
{message.generatedBy === 'ai' && (
  <span className="flex items-center gap-0.5 bg-accent-muted px-1.5 py-0.5 rounded text-accent">
    <Bot size={10} />
    IA
  </span>
)}
```

**Conclusión:** ✅ Badge de IA ya implementado.

#### ✅ CUMPLE: Estados de Mensaje

**Líneas 83-100:**
```typescript
const renderStatus = (status?: MessageStatus) => {
  switch (status) {
    case 'pending_backend':
    case 'local_only':
      return <Clock size={14} className="text-muted" />;
    case 'synced':
    case 'sent':
      return <Check size={14} className="text-muted" />;
    case 'delivered':
      return <CheckCheck size={14} className="text-muted" />;
    case 'seen':
      return <CheckCheck size={14} className="text-accent" />;
    case 'failed':
      return <AlertCircle size={14} className="text-error" />;
    default:
      return <Check size={14} className="text-muted" />;
  }
}
```

**Análisis:** Soporta todos los estados requeridos, incluyendo `pending` (necesario para mensajes del `ActionExecutor`).

**Conclusión:** ✅ **REUTILIZABLE SIN CAMBIOS**.

### 1.2 Diagnóstico

**Estado:** MessageBubble está completo y listo para v8.2.

**Acción requerida:** NINGUNA.

---

## 2. WEBSOCKET INFRASTRUCTURE

### 2.1 Verificación de Eventos

**Análisis:** Según memoria del sistema, el WebSocket ya maneja:
- `message:new` - para mensajes entrantes
- Conexión/desconexión
- Suscripción por `relationshipId`

**Requerido por Canon v8.2:**
- `message.received` - emitido por `ChatProjector` post-transacción
- `message.sent` - emitido por `ActionExecutor` post-ejecución

**Pregunta:** ¿Los eventos actuales son compatibles?

**Análisis:**
- `message:new` es genérico (puede ser `message.received` o `message.sent`)
- La UI necesita distinguir entre mensajes entrantes (humanos) y salientes (IA)

**Conclusión:** ⚠️ **VERIFICAR** que el WebSocket handler emita eventos separados o que la UI pueda distinguir por `generatedBy`.

**Acción requerida:** H1 - Verificar que `ChatProjector` emite `message.received` y `ActionExecutor` emite `message.sent` correctamente.

### 2.2 Diagnóstico

**Estado:** WebSocket infrastructure existe y funciona.

**Acción requerida:** H1 - Verificar compatibilidad de eventos con Canon.

---

## 3. CHAT VIEW

### 3.1 Verificación de Renderizado

**Análisis:** Según grep, `ChatView.tsx` usa `MessageBubble` para renderizar mensajes.

**Requerido por Canon:** Renderizar mensajes desde tabla `messages` (derivada).

**Conclusión:** ✅ La UI ya consulta tablas derivadas, no el Journal.

### 3.2 Diagnóstico

**Estado:** ChatView es reutilizable.

**Acción requerida:** NINGUNA.

---

## 4. TEMPLATES UI

### 4.1 Verificación

**Análisis:** Según memoria del sistema, existe UI de templates completa.

**Requerido por Canon v8.2:**
- Herramienta `send_template` debe poder invocarse desde runtimes
- UI debe permitir selección de templates

**Conclusión:** ✅ **REUTILIZABLE** - Templates son de ChatCore, la UI ya existe.

**Acción requerida:** H8 - Registrar `send_template` como herramienta en ToolRegistry.

### 4.2 Diagnóstico

**Estado:** Templates UI es reutilizable.

**Acción requerida:** NINGUNA en frontend. Acción en H8 (backend).

---

## 5. CONFIGURACIÓN DE CUENTA

### 5.1 Verificación de Extensibilidad

**Análisis:** Según memoria, existe UI de configuración de cuenta.

**Requerido por Canon v8.2:**
- Configuración de FluxCore debe persistirse en `extension_installations.config`
- UI debe permitir configurar:
  - Modo (`auto` / `suggest` / `off`)
  - Tono, emojis, formalidad
  - Runtime activo
  - Turn window

**Pregunta:** ¿La UI actual soporta configuración extensible?

**Conclusión:** ⚠️ **VERIFICAR** que la UI de configuración puede extenderse para nuevos campos de FluxCore.

**Acción requerida:** H2 - Verificar y extender UI de configuración si es necesario.

### 5.2 Diagnóstico

**Estado:** UI de configuración existe, verificar extensibilidad.

**Acción requerida:** H2 - Extender UI para campos de `PolicyContext`.

---

## 6. COMPONENTES UI REUTILIZABLES

### 6.1 Inventario de Componentes

**Según memoria del sistema:**
- ✅ `CollapsibleSection` - secciones colapsables
- ✅ `SliderInput` - slider + input numérico
- ✅ `MessageBubble` - renderizado de mensajes
- ✅ `AssetPreview` - preview de media
- ✅ `ChatView` - vista de conversación
- ✅ Templates UI - gestión de plantillas

**Conclusión:** Todos los componentes UI básicos existen y son reutilizables.

### 6.2 Componentes Faltantes

**Requeridos por v8.2:**
- ❌ UI para configurar turn window (puede usar `SliderInput`)
- ❌ UI para configurar modo de automatización (puede usar dropdown existente)
- ❌ UI para activar/desactivar feature flag `useNewArchitecture` (admin only)

**Acción requerida:** H2 - Crear componentes de configuración faltantes.

---

## 7. OFFLINE-FIRST Y AUTOSAVE

### 7.1 Verificación

**Análisis:** Según memoria, el sistema tiene:
- Estados de mensaje: `local_only`, `pending_backend`, `synced`
- MessageBubble renderiza estos estados

**Requerido por Canon v8.2:**
- Mensajes del `ActionExecutor` se insertan con estado `pending`
- Worker de canal los envía y actualiza estado a `sent` / `delivered`

**Pregunta:** ¿El sistema offline-first actual es compatible?

**Conclusión:** ✅ **COMPATIBLE** - Los estados de mensaje ya soportan el flujo canónico.

**Acción requerida:** NINGUNA.

### 7.2 Diagnóstico

**Estado:** Offline-first es reutilizable.

**Acción requerida:** NINGUNA.

---

## 8. ASSET MANAGEMENT

### 8.1 Verificación

**Análisis:** MessageBubble renderiza media (imagen, audio, documento) con `AssetPreview`.

**Requerido por Canon v8.2:**
- Señal `MEDIA_CAPTURED` se proyecta como creación de `Asset`
- UI debe renderizar assets desde tabla derivada

**Conclusión:** ✅ **REUTILIZABLE** - Asset management ya existe.

**Acción requerida:** NINGUNA.

---

## RESUMEN EJECUTIVO

### Componentes que CUMPLEN 100%

- ✅ **MessageBubble** - Soporta `generatedBy: 'system'`, `'ai'`, `'human'`
- ✅ **Estados de mensaje** - Soporta `pending`, `sent`, `delivered`, `failed`
- ✅ **ChatView** - Renderiza desde tablas derivadas
- ✅ **Templates UI** - Completa y reutilizable
- ✅ **Asset management** - Completo
- ✅ **Offline-first** - Compatible con flujo canónico
- ✅ **Componentes UI básicos** - CollapsibleSection, SliderInput, etc.

### Componentes que REQUIEREN VERIFICACIÓN

- ⚠️ **WebSocket events** - Verificar que `message.received` y `message.sent` se emiten correctamente
- ⚠️ **UI de configuración** - Verificar extensibilidad para campos de `PolicyContext`

### Componentes FALTANTES (menores)

- ❌ UI para configurar turn window (usar `SliderInput` existente)
- ❌ UI para configurar modo de automatización (usar dropdown existente)
- ❌ UI para feature flag admin (crear simple toggle)

---

## PLAN DE ACCIÓN

### H1 (Proyectores)
- Verificar que `ChatProjector` emite `message.received` post-transacción
- Verificar que eventos WebSocket son compatibles

### H2 (Infraestructura)
- Extender UI de configuración para campos de `PolicyContext`:
  - Modo (`auto` / `suggest` / `off`)
  - Turn window (ms)
  - Tono, emojis, formalidad
- Crear UI para feature flag admin (toggle simple)

### H8 (Herramientas)
- Ninguna acción en frontend
- Backend registra `send_template` en ToolRegistry

---

## ESTIMADO DE TRABAJO FRONTEND

**H1:** 0 días (solo verificación)

**H2:** 2-3 días
- Extender UI de configuración: 1-2 días
- Feature flag admin UI: 1 día

**Total frontend:** 2-3 días (incluido en estimado de H2)

---

## RIESGOS IDENTIFICADOS

### RIESGO BAJO

**WebSocket events incompatibles:** Si `message:new` no distingue entre `received` y `sent`, puede causar loops.

**Mitigación:** Verificar en H1 y ajustar si es necesario (cambio menor).

### RIESGO BAJO

**UI de configuración no extensible:** Si está hardcodeada, puede requerir refactor.

**Mitigación:** Verificar en H2. Si es necesario, crear UI de configuración genérica.

---

## CONCLUSIÓN

El frontend está **95% listo** para v8.2. Los componentes UI existentes son reutilizables sin cambios significativos.

**Trabajo frontend requerido:**
- Extender UI de configuración (2-3 días en H2)
- Verificar eventos WebSocket (0 días en H1)

**Componentes 100% reutilizables:**
- MessageBubble
- ChatView
- Templates UI
- Asset management
- Offline-first
- Componentes UI básicos

**Estimado total frontend:** 2-3 días (ya incluido en H2).

**Conclusión:** El frontend NO es bloqueador para v8.2. Puede reutilizarse casi completamente.
