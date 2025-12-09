# Plan de Continuación v2.0 - FluxCore

> **Fecha**: 2025-12-07  
> **Generado por**: Auditoría Estratégica HTP  
> **Objetivo**: Cerrar brechas críticas y llevar el proyecto a MVP funcional

---

## 1. RESUMEN EJECUTIVO

### Estado Actual vs Esperado

| Área | TOTEM Esperado | Estado Real | Brecha |
|------|----------------|-------------|--------|
| **Chat Core** | Mensajería completa | Funcional con mocks en UI | 🟡 30% |
| **Extensiones** | Framework + core-ai + appointments | Backend OK, UI parcial | 🟡 25% |
| **UI Chat** | Threads, edición, respuestas, estados | Solo mensajes básicos | 🔴 60% |
| **Flujos IA** | Sugerencias en tiempo real | WebSocket listo, sin AI real | 🟡 40% |
| **Offline-First** | IndexedDB + Sync | Hooks creados, sin integración | 🟡 35% |
| **Panel System** | VS Code-like con tabs | PanelStore listo, UI básica | 🟡 30% |

### Prioridades Estratégicas

```
1. CRÍTICO: Conectar ChatView con API real (no mocks)
2. ALTO:    Integrar AI service real para sugerencias
3. ALTO:    Completar funcionalidades chat (threads, reply, edit)
4. MEDIO:   UI para gestión de extensiones funcional
5. MEDIO:   Tests E2E para flujos críticos
```

---

## 2. ANÁLISIS DE BRECHAS POR ÁREA

### 2.1 Chat UI - Brechas Críticas

**Archivo**: `apps/web/src/components/chat/ChatView.tsx`

| Funcionalidad TOTEM | Estado | Impacto |
|---------------------|--------|---------|
| Cargar mensajes desde API | ❌ Usa mocks | CRÍTICO |
| Enviar mensajes a API | ❌ Solo local | CRÍTICO |
| WebSocket para tiempo real | ❌ No conectado | CRÍTICO |
| Editar mensaje propio | ❌ No existe | ALTO |
| Responder a mensaje específico | ❌ No existe | ALTO |
| Threads de conversación | ❌ No existe | MEDIO |
| Estados de mensaje (✓✓) | ❌ No existe | ALTO |
| Typing indicator | ❌ No existe | BAJO |
| Adjuntos (imágenes, archivos) | ❌ Solo botón | MEDIO |
| Reacciones/emojis | ❌ Solo botón | BAJO |

**Acciones Requeridas:**
1. Reemplazar `mockMessages` con llamada a `/conversations/:id/messages`
2. Conectar `handleSend` con `/messages` POST
3. Integrar `useWebSocket` para recibir mensajes en tiempo real
4. Añadir componente `MessageBubble` con soporte para estados
5. Añadir UI de reply-to y edit

### 2.2 Extension Framework - Brechas

| Componente TOTEM | Estado | Impacto |
|------------------|--------|---------|
| ExtensionHost service | ✅ Completo | - |
| ManifestLoader | ✅ Completo | - |
| PermissionValidator | ✅ Completo | - |
| ContextAccessService | ✅ Completo | - |
| extension_installations table | ✅ Completo | - |
| extension_contexts table | ❌ No existe | ALTO |
| UI ExtensionsPanel | ✅ Creado | - |
| UI ExtensionConfigPanel | ❌ No existe | MEDIO |
| Pre-install core-ai on account creation | ❌ No implementado | ALTO |

**Acciones Requeridas:**
1. Crear tabla `extension_contexts` para overlays
2. Hook de pre-instalación de core-ai en `accountService.create()`
3. Crear ExtensionConfigPanel para editar configuración

### 2.3 AI Integration - Brechas

| Funcionalidad TOTEM | Estado | Impacto |
|---------------------|--------|---------|
| ai.service conectado a Groq | ❌ Mock responses | CRÍTICO |
| WebSocket suggestion:ready | ✅ Implementado | - |
| AISuggestionCard | ✅ Creado | - |
| Modos suggest/auto/off | ✅ Via automation_rules | - |
| PromptBuilder con contexto | ✅ Implementado | - |
| Configuración por account | ❌ No hay UI | MEDIO |

**Acciones Requeridas:**
1. Configurar API key de Groq en `.env`
2. Conectar `ai.service.ts` con SDK Groq real
3. Crear UI para configurar modo IA por account

### 2.4 Offline-First - Brechas

| Componente TOTEM | Estado | Impacto |
|------------------|--------|---------|
| IndexedDB schema | ✅ Creado | - |
| SyncManager | ✅ Creado | - |
| SyncQueue | ✅ Creado | - |
| useOfflineFirst hook | ✅ Creado | - |
| Integración con ChatView | ❌ No conectado | ALTO |
| Optimistic updates | ❌ No implementado | MEDIO |
| Reconexión automática | ❌ No probado | MEDIO |

**Acciones Requeridas:**
1. Integrar `useOfflineFirst` en ChatView
2. Persistir mensajes localmente antes de enviar
3. Sincronizar al reconectar

---

## 3. PLAN DE HITOS PRIORIZADOS

### Hito V2-1: Chat Funcional Real
**Prioridad**: CRÍTICA  
**Duración**: 3-4 horas  
**Valor**: Chat funciona end-to-end

| Tarea | Descripción | Tiempo |
|-------|-------------|--------|
| V2-1.1 | Cargar mensajes desde API en ChatView | 30m |
| V2-1.2 | Enviar mensajes a API desde ChatView | 30m |
| V2-1.3 | Integrar useWebSocket para tiempo real | 45m |
| V2-1.4 | Crear MessageBubble component con estados | 45m |
| V2-1.5 | Mostrar status de mensaje (✓✓) | 30m |
| V2-1.6 | Verificación E2E: enviar/recibir mensaje | 30m |

**Criterios de Éxito:**
- [ ] Usuario puede enviar mensaje que persiste en BD
- [ ] Usuario recibe mensajes en tiempo real via WebSocket
- [ ] Estados de mensaje visibles (sent, delivered, seen)

---

### Hito V2-2: AI Sugerencias Reales
**Prioridad**: ALTA  
**Duración**: 2-3 horas  
**Valor**: IA genera respuestas útiles

| Tarea | Descripción | Tiempo |
|-------|-------------|--------|
| V2-2.1 | Configurar Groq API key en .env | 10m |
| V2-2.2 | Conectar ai.service con SDK Groq | 45m |
| V2-2.3 | WebSocket trigger para generar sugerencia | 30m |
| V2-2.4 | Integrar flujo en ChatView | 30m |
| V2-2.5 | Test: mensaje entrante → sugerencia IA | 30m |

**Criterios de Éxito:**
- [ ] Mensaje entrante genera sugerencia de IA real
- [ ] Sugerencia aparece en AISuggestionCard
- [ ] Aprobar sugerencia envía mensaje marcado como IA

---

### Hito V2-3: Funcionalidades Chat Avanzadas
**Prioridad**: ALTA  
**Duración**: 3-4 horas  
**Valor**: UX profesional de chat

| Tarea | Descripción | Tiempo |
|-------|-------------|--------|
| V2-3.1 | Reply-to: Responder a mensaje específico | 1h |
| V2-3.2 | Edit: Editar mensaje propio | 45m |
| V2-3.3 | Delete: Eliminar mensaje propio | 30m |
| V2-3.4 | Typing indicator | 45m |
| V2-3.5 | Scroll to message on reply | 30m |

**Criterios de Éxito:**
- [ ] Usuario puede responder a mensaje específico
- [ ] Usuario puede editar/eliminar mensaje propio
- [ ] Indicador de escritura funciona

---

### Hito V2-4: Extension Framework Completo
**Prioridad**: MEDIA  
**Duración**: 2-3 horas  
**Valor**: Extensiones funcionan end-to-end

| Tarea | Descripción | Tiempo |
|-------|-------------|--------|
| V2-4.1 | Crear schema extension_contexts | 30m |
| V2-4.2 | Pre-instalar core-ai en nuevas cuentas | 30m |
| V2-4.3 | Crear ExtensionConfigPanel component | 1h |
| V2-4.4 | Integrar ExtensionsPanel en sidebar | 30m |
| V2-4.5 | Test: instalar/configurar extensión | 30m |

**Criterios de Éxito:**
- [ ] Nueva cuenta tiene core-ai preinstalada
- [ ] Usuario puede ver y configurar extensiones
- [ ] Configuración de extensión persiste

---

### Hito V2-5: Offline-First Integrado
**Prioridad**: MEDIA  
**Duración**: 2 horas  
**Valor**: App funciona sin conexión

| Tarea | Descripción | Tiempo |
|-------|-------------|--------|
| V2-5.1 | Integrar useOfflineFirst en ChatView | 45m |
| V2-5.2 | Persistir mensajes localmente | 30m |
| V2-5.3 | Sincronizar al reconectar | 30m |
| V2-5.4 | Test: enviar mensaje offline | 15m |

**Criterios de Éxito:**
- [ ] Mensajes se guardan localmente primero
- [ ] Mensajes offline se sincronizan al reconectar
- [ ] Estado de sync visible en UI

---

## 4. CRONOGRAMA SUGERIDO

```
DÍA 1 (4h):
├── V2-1: Chat Funcional Real (completo)
└── Commit + validación

DÍA 2 (4h):
├── V2-2: AI Sugerencias Reales (completo)
├── V2-3.1-3.2: Reply-to + Edit
└── Commit + validación

DÍA 3 (4h):
├── V2-3.3-3.5: Delete + Typing + Scroll
├── V2-4: Extension Framework
└── Commit + validación

DÍA 4 (3h):
├── V2-5: Offline-First
├── Testing E2E
└── Commit final + documentación
```

---

## 5. MÉTRICAS DE ÉXITO GLOBAL

### Para declarar MVP Funcional:

- [ ] Usuario puede registrarse y crear cuenta
- [ ] Usuario puede iniciar conversación
- [ ] **Mensajes persisten en BD y se reciben en tiempo real**
- [ ] **IA genera sugerencias reales basadas en contexto**
- [ ] Usuario puede responder/editar mensajes
- [ ] Extensiones son configurables
- [ ] App funciona offline y sincroniza

### Pruebas Mínimas Requeridas:

```bash
# Flujo completo E2E
1. Registrar usuario → OK
2. Crear cuenta → OK  
3. Crear relación → OK
4. Iniciar conversación → OK
5. Enviar mensaje → PERSISTE EN BD
6. Recibir mensaje → VIA WEBSOCKET
7. IA genera sugerencia → TEXTO REAL
8. Aprobar sugerencia → ENVÍA MENSAJE
9. Editar mensaje → ACTUALIZA EN BD
10. Ver estados → ✓✓ VISIBLE
```

---

## 6. RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| API Groq rate limits | Media | Fallback a mock, cache de respuestas |
| WebSocket desconexiones | Media | Reconexión automática ya implementada |
| IndexedDB incompatibilidad | Baja | Dexie.js maneja fallbacks |
| Conflictos de sync | Media | Backend prevalece (ya definido) |

---

## 7. ARCHIVOS CLAVE A MODIFICAR

### Prioridad 1: Chat Funcional

| Archivo | Cambio |
|---------|--------|
| `apps/web/src/components/chat/ChatView.tsx` | Conectar con API, WebSocket |
| `apps/web/src/hooks/useWebSocket.ts` | Integrar en ChatView |
| `apps/web/src/components/chat/MessageBubble.tsx` | CREAR: Componente de mensaje |

### Prioridad 2: AI Real

| Archivo | Cambio |
|---------|--------|
| `apps/api/src/services/ai.service.ts` | Conectar SDK Groq real |
| `apps/api/.env` | Añadir GROQ_API_KEY |
| `apps/api/src/websocket/ws-handler.ts` | Trigger AI en mensaje entrante |

### Prioridad 3: Extensiones

| Archivo | Cambio |
|---------|--------|
| `packages/db/src/schema/extension-contexts.ts` | CREAR: Schema overlays |
| `apps/api/src/services/account.service.ts` | Pre-instalar core-ai |
| `apps/web/src/components/extensions/ExtensionConfigPanel.tsx` | CREAR |

---

## 8. PRÓXIMOS PASOS INMEDIATOS

1. **Ejecutar V2-1.1**: Cargar mensajes desde API en ChatView
2. **Ejecutar V2-1.2**: Enviar mensajes a API
3. **Ejecutar V2-1.3**: Integrar WebSocket
4. **Commit checkpoint**: "feat(web): ChatView connected to API"

---

**Este plan prioriza valor de negocio sobre completitud técnica.**  
**Cada hito entrega funcionalidad visible al usuario.**

---

*Generado por Auditoría Estratégica HTP - 2025-12-07*
