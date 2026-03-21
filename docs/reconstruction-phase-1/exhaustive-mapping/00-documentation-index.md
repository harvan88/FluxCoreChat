---
id: "documentation-index"
type: "core"
status: "stable"
criticality: "high"
location: "docs/reconstruction-phase-1/exhaustive-mapping/00-documentation-index.md"
---

# Índice Maestro de Documentación Exhaustiva

**Fecha:** 2026-03-19  
**Propósito:** Punto de entrada único para navegar toda la documentación del sistema  
**Metodología:** UI-first → Backend → Database → Flows completos

---

## � 0. Snapshot Dinámico de Calidad

### 📊 Estado Actual del Sistema
- **Documento:** [00-documentation-quality-snapshot.md](./00-documentation-quality-snapshot.md)
- **Propósito:** Memoria matemática actualizada automáticamente para contexto de la IA
- **Contenido:** Métricas exactas, componentes sin documentar, tendencias, recomendaciones

---

## �🎨 1. UI Landscape – Lo que ve el usuario

### Componentes React (167 detectados)
- **Componentes documentados:** 9/167 (5.4%)
- **Última validación:** jueves, 19 de marzo de 2026, 18:10:00
- **Validador automático:** Ejecutar `bun run scripts/validate-documentation-coverage.ts`
- **Reporte en tiempo real:** `DocumentationQualityPanel` en el monitor del sistema

#### 🎯 **Subsistemas Documentados (100%)**
```
🤖 Asistentes Subsystem (FluxCore)
├── ASSISTANTS_SUBSYSTEM.md       # ✅ Configuraciones cognitivas
├── ASSISTANT_LIST.md             # 📋 Listado principal
└── ASSISTANT_DETAIL.md            # 📝 Editor detallado

📋 Instructions Subsystem (FluxCore)
├── INSTRUCTIONS_SUBSYSTEM.md      # ✅ Plantillas de prompts
├── INSTRUCTIONS_VIEW.md           # 📋 Listado de instrucciones
└── INSTRUCTION_DETAIL.md           # 📝 Editor de instrucción

🔍 RAG Subsystem (FluxCore)
├── RAG_SUBSYSTEM.md               # ✅ Acceso a conocimiento externo
├── RAG_CONFIG_SECTION.md          # 📋 Configuración RAG
└── [Vector Stores UI]              # 📋 Gestión de bases vectoriales

📝 Templates Subsystem (ChatCore)
├── TEMPLATES_SUBSYSTEM.md         # ✅ Herramientas para personas
├── TEMPLATE_MANAGER.md             # 📋 Gestión CRUD principal
├── TEMPLATE_EDITOR.md              # 📝 Editor visual con preview
├── TEMPLATE_QUICK_PICKER.md        # 📋 Selector rápido en chat
├── TEMPLATE_ASSET_PICKER.md        # 📋 Gestión de archivos adjuntos
└── FLUXCORE_TEMPLATE_CONFIG.md     # 📋 Configuración IA para plantillas
```

#### Componentes Individuales
```
01-ui-landscape/
├── APP.md                    # ✅ App.tsx – Layout principal y routing
├── MAIN.md                   # ✅ main.tsx – Entry point React
├── LAZY.md                   # ✅ lazy.tsx – Lazy loading helper
├── SUBSYSTEMS.md              # 🎯 Índice maestro de subsistemas
├── UI_COMPONENTS_MAP.md        # 📋 Mapa completo de componentes
├── USE_CHAT_HOOK.md            # 📋 Hook principal de chat (559 líneas)
├── APP_LAYOUT_ROUTING.md       # 📋 Layout y routing detallado
└── [Pendientes 158 componentes]...
```

#### Componentes pendientes (orden de prioridad)
```
❌ AccountDeletionModal.md
❌ AccountDeletionWizard.md
❌ AccountsSection.md
❌ AccountSwitcher.md
❌ AssetBrowser.md
❌ AuthPage.md
❌ ResetPasswordPage.md
❌ ActivityIndicator.md
❌ AssetPreview.md
❌ AssetUploader.md
❌ AttachmentPanel.md
❌ AudioRecorderPanel.md
❌ CameraCaptureModal.md
❌ ChatComposer.md
❌ ChatOptionsMenu.md
❌ ChatView.md
❌ EmojiPanel.md
❌ FileUploader.md
❌ MessageBubble.md
❌ ParticipantsActivityBar.md
❌ StandardComposer.md
❌ UnifiedChatView.md
❌ WelcomeView.md
❌ ConnectionIndicator.md
❌ ThemeToggle.md
❌ ContactDetails.md
❌ ContactsList.md
... [y 135 más]
```

#### ✅ **Subsistemas Completamente Documentados**
```
🎯 TEMPLATES SUBSYSTEM (100% completo)
├── TEMPLATES_SUBSYSTEM.md       # ✅ Overview y arquitectura
├── TEMPLATE_MANAGER.md          # ✅ Gestión CRUD principal
├── TEMPLATE_EDITOR.md           # ✅ Editor visual con preview
├── TEMPLATE_QUICK_PICKER.md     # ✅ Selector rápido en chat
├── TEMPLATE_ASSET_PICKER.md     # ✅ Gestión de archivos adjuntos
└── FLUXCORE_TEMPLATE_CONFIG.md  # ✅ Configuración IA para plantillas

📊 Métricas del Subsistema:
- Componentes UI: 5/5 documentados (100%)
- Principio UI-First: ✅ Aplicado
- Testing incluido: ✅ Casos de prueba
- Estado real: ✅ Reflejado honestamente
- Total documentación: 93KB de contenido
```

---

## ⚙️ 2. Backend Landscape – Procesamiento de datos

*Módulos cognitivos (FluxCore) mapeados:*

```
02-backend-landscape/
├── KERNEL_CORE.md                     # ✅ Kernel - Unión de mundos ChatCore/FluxCore
├── TOOLS_SUBSYSTEM.md                 # ✅ Tools - ChatCore vs FluxCore (doble sistema)
├── RUNTIMES_SUBSYSTEM.md              # ✅ Runtimes - Local vs OpenAI (ambos soberanos)
├── fluxcore/
│   ├── ASISTENTES_LOCAL_RUNTIME.md   # ✅ Runtime local de asistentes
│   ├── ASISTENTES_OPENAI_RUNTIME.md  # ✅ Runtime OpenAI de asistentes
│   ├── COGNITION_GATEWAY.md          # ✅ Gateway de cognición
│   ├── COGNITION_WORKER.md           # ✅ Worker de procesamiento cognitivo
│   ├── COGNITIVE_DISPATCHER.md       # ✅ Dispatcher de eventos cognitivos
│   └── RUNTIME_GATEWAY.md            # ✅ Gateway de runtime
├── ENDPOINTS_DIRECTORY.md            # 📋 Directorio de endpoints REST
├── SERVICES_DIRECTORY.md             # 📋 Directorio de servicios backend
├── WEBSOCKET_HANDLERS.md             # 📋 Manejo de WebSocket
├── MIDDLEWARE_CHAIN.md               # 📋 Auth, CORS, etc.
└── PIPELINES_DIRECTORY.md            # 📋 Workers, schedulers
```

---

## 🗄️ 3. Database Landscape – Persistencia

*Base de datos completa:*

```
03-database-landscape/
├── SCHEMAS_DIRECTORY.md              # ✅ Todos los schemas Drizzle (15 tablas)
├── TABLE_RELATIONSHIPS.md            # ✅ Relaciones entre tablas (N:M, FKs)
├── MIGRATIONS_HISTORY.md             # ✅ Historial de migraciones (62 archivos)
└── INDEXES_CONSTRAINTS.md            # ✅ Índices y constraints de performance
```

---

## 🔄 4. End-to-End Flows – Flujos completos

*Flujos cognitivos:*

```
04-end-to-end-flows/
├── fluxcore/
│   └── COGNITIVE_PIPELINE_FLOW.md     # ✅ Flujo cognitivo completo
├── MESSAGE_LIFECYCLE.md              # 📋 Mensaje desde input hasta persistencia
├── AI_RESPONSE_FLOW.md               # 📋 Prompt → LLM → Response
├── AUTHENTICATION_FLOW.md            # 📋 Login → JWT → Validación
├── REALTIME_UPDATES.md               # 📋 WebSocket broadcasting
└── FILE_UPLOAD_FLOW.md               # 📋 Avatar upload, etc.
```

*Por implementar (Generales):*

```
04-end-to-end-flows/
├── MESSAGE_LIFECYCLE.md            # Mensaje desde input hasta persistencia
├── AUTHENTICATION_FLOW.md          # Login → JWT → Validación
├── REALTIME_UPDATES.md             # WebSocket broadcasting
└── FILE_UPLOAD_FLOW.md             # Avatar upload, etc.
```

---

## ⚙️ 5. Configuration State – Configuración

*Configuración completa:*

```
05-configuration-state/
├── ENVIRONMENT_VARIABLES.md          # ✅ Variables .env y configuración
├── FEATURE_FLAGS.md                  # ✅ Control de funcionalidades
├── RUNTIME_CONFIGS.md                # 📋 Configuraciones por cuenta
└── SYSTEM_STATE.md                   # 📋 Estado global en memoria
```

---

## 📊 6. Métricas Actuales

### Estado de documentación UI
- **Score General:** 5.4%
- **Componentes totales:** 167
- **Documentados:** 9
- **Issues críticos:** 158
- **Subsistemas completos:** 1 (Templates)

### Top 6 componentes documentados
1. � **Templates Subsystem** - 100% (5 componentes)
2. � **App** - 85.0%
3. 🥉 **main** - 78.0%
4. 🥉 **lazy** - 78.0%
5. 🥉 **Assistants Subsystem** - 75.0%
6. 🥉 **Instructions Subsystem** - 72.0%

### 🎯 **Logros Recientes**
- ✅ **4/4 subsistemas** con análisis crítico y problemas identificados
- ✅ **12 problemas críticos** priorizados por impacto arquitectónico
- ✅ **Visión estratégica** completa de la arquitectura del sistema
- ✅ **Roadmap claro** para correcciones y mejoras

### 📊 **Estado General de Documentación**
- **Subsistemas documentados:** 4/4 (100%)
- **Componentes UI documentados:** 9/167 (5.4%)
- **Problemas críticos identificados:** 12
- **Análisis arquitectónico:** Completo y detallado
- **Prioridades establecidas:** Por impacto y urgencia real del código

---

## 🚀 7. Cómo Usar Esta Documentación

### Para desarrolladores
1. **Buscar componente:** Ir a `01-ui-landscape/` y buscar el `.md` del componente
2. **Entender flujos:** Revisar `04-end-to-end-flows/` para ver datos completos
3. **Validar cambios:** Ejecutar `bun run validate-docs` para asegurar calidad

### Para arquitectos
1. **Visión general:** Empezar por este índice
2. **Backend:** Ir a `02-backend-landscape/` para APIs y servicios
3. **Database:** Ir a `03-database-landscape/` para schemas y relaciones

### Para QA/Testing
1. **Flujos completos:** Usar `04-end-to-end-flows/` para diseñar tests
2. **Configuración:** Revisar `05-configuration-state/` para setup de ambientes

---

## 📋 8. Próximos Pasos

### Inmediato (esta semana)
- [x] ✅ Completar documentación de 4 subsistemas principales
- [ ] Documentar siguientes 10 componentes UI críticos
- [ ] Crear estructura para `02-backend-landscape/`
- [ ] Mapear endpoints principales

### Corto plazo (2 semanas)
- [ ] Completar UI Landscape (meta: 25% componentes)
- [ ] Iniciar Backend Landscape
- [ ] Crear primeros flujos end-to-end
- [ ] Documentar ChatView (componente más crítico)
- [ ] Corregir problemas críticos identificados en subsistemas

### Largo plazo (1 mes)
- [ ] 100% UI Landscape documentado
- [ ] Backend Landscape completo
- [ ] Database Landscape completo
- [ ] Flujos end-to-end mapeados
- [ ] Implementar correcciones arquitectónicas críticas

---

## 🔗 9. Referencias Cruzadas

- **Validación automática:** `scripts/validate-documentation-coverage.ts`
- **Dashboard en vivo:** `DocumentationQualityPanel` (monitor del sistema)
- **Plantilla canónica:** Ver `APP.md`, `MAIN.md`, `LAZY.md` como ejemplos
- **Roadmap completo:** `EXHAUSTIVE_DOCUMENTATION_ROADMAP.md`

---

**Nota:** Este índice se actualiza automáticamente cuando se agregan nuevos documentos. La fuente de verdad para el estado actual es el `VALIDATION_REPORT.md` generado por el script de validación.

**Última actualización:** jueves, 19 de marzo de 2026, 18:10:00  
**Próximo objetivo:** Corregir problemas críticos del subsistema de Templates  
**Métrica actual:** 5.4% de cobertura (9/167 componentes)  
**Estado arquitectónico:** 4/4 subsistemas documentados con 12 problemas críticos identificados
