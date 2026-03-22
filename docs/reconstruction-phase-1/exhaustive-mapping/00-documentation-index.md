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

### 🤖 2. Backend Landscape – El motor del sistema

### Servicios Críticos (183 detectados)
- **Servicios documentados:** 4/183 (2.2%)
- **Última actualización:** viernes, 21 de marzo de 2026, 16:55
- **Validador automático:** Scripts de escaneo de servicios
- **Reporte en tiempo real:** Backend Monitor Panel

#### 🎯 **Subsistemas Documentados (100%)**
```
🤖 AI Response Pipeline (FluxCore)
├── COGNITIVE_DISPATCHER_SERVICE.md       # ✅ Orquestador principal
├── FLUX_POLICY_CONTEXT_SERVICE.md        # ✅ Resolución de políticas
├── AUTOMATION_CONTROLLER_SERVICE.md     # ✅ Control de modos
└── AI_RESPONSE_PUBLIC_PROFILE_SOLUTION.md # ✅ Solución completa

� Policy & Automation (FluxCore)
├── AUTOMATION_RULES_SCHEMA.md           # 📋 Definición de reglas
├── FLUXCORE_ACCOUNT_POLICIES.md         # 📋 Políticas de cuenta
└── [Policy Resolution Engine]             # 📋 Motor de políticas

💾 Database Layer (FluxCore)
├── CONVERSATIONS_SCHEMA.md              # 📋 Conversaciones y visitors
├── RELATIONSHIPS_SCHEMA.md             # 📋 Relaciones entre actores
└── [ACTORS_SCHEMA.md]                    # 📋 Entidades del sistema
```

#### Servicios Individuales
```
02-backend-landscape/
├── COGNITIVE_DISPATCHER_SERVICE.md    # ✅ Dispatcher principal (modificado 2026-03-21)
├── FLUX_POLICY_CONTEXT_SERVICE.md       # ✅ Resolución de políticas (modificado 2026-03-22)
├── AUTOMATION_CONTROLLER_SERVICE.md    # ✅ Control de modos (extendido 2026-03-21)
├── AI_RESPONSE_PUBLIC_PROFILE_SOLUTION.md # ✅ Solución completa (creado 2026-03-21)
├── RELATIONSHIPS_ROUTES.md              # ✅ API de relaciones (creado 2026-03-22)
├── ACCOUNTS_ROUTES.md                    # ✅ API de cuentas y búsqueda (creado 2026-03-22)
└── [Pendientes 177 servicios]...
```

#### ✅ **Subsistemas Completamente Documentados**
```
🎯 AI RESPONSE PIPELINE (100% completo)
├── COGNITIVE_DISPATCHER_SERVICE.md     # ✅ Orquestador con soporte visitors
├── FLUX_POLICY_CONTEXT_SERVICE.md      # ✅ Detección inteligente de visitors
├── AUTOMATION_CONTROLLER_SERVICE.md    # ✅ Reglas específicas + globales
└── AI_RESPONSE_PUBLIC_PROFILE_SOLUTION.md # ✅ Solución completa y validada

📊 Métricas del Subsistema:
- Servicios backend: 4/4 documentados (100%)
- Problema crítico resuelto: ✅ IA no respondía en perfiles públicos
- Arquitectura unificada: ✅ Misma fuente de verdad para todos
- Estado real: ✅ Reflejado honestamente con logs y tests
- Total documentación: 45KB de contenido técnico
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

### 🎯 **Logros Recientes (2026-03-22)**
- ✅ **2/2 subsistemas** con análisis crítico y problemas identificados
- ✅ **2 problemas críticos** resueltos:
  - IA no respondía en perfiles públicos
  - Error 500 en ContactsList por visitor actors
- ✅ **Refactor de Perfil de Negocio:** ai_include_* fields unificados
- ✅ **Arquitectura unificada** para todos los modos de automatización
- ✅ **Sistema de Contactos** completamente funcional

### 📊 **Estado General de Documentación**
- **Subsistemas documentados:** 2/2 (100%)
- **Servicios backend documentados:** 6/183 (3.3%)
- **Problemas críticos resueltos:** 2
- **Análisis arquitectónico:** Completo con solución implementada
- **Prioridades establecidas:** Por impacto real del sistema

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
- [x] ✅ Completar documentación de 2 subsistemas principales
- [ ] Documentar siguientes 10 servicios backend críticos
- [ ] Crear estructura para `02-backend-landscape/`
- [ ] Mapear endpoints principales

### Corto plazo (2 semanas)
- [ ] Completar Backend Landscape (meta: 25% servicios)
- [ ] Iniciar Database Landscape
- [ ] Crear primeros flujos end-to-end
- [ ] Documentar servicios críticos (ChatView, MessageBubble, etc.)
- [ ] Implementar mejoras arquitectónicas identificadas

### Largo plazo (1 mes)
- [ ] 100% Backend Landscape documentado
- [ ] Database Landscape completo
- [ ] Flujos end-to-end mapeados
- [ ] Implementar correcciones arquitectónicas críticas
- [ ] Mantener actualización continua con cambios del sistema

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
