---
id: "subsystems-overview"
type: "subsystem"
status: "stable"
criticality: "high"
location: "docs/reconstruction-phase-1/exhaustive-mapping/01-ui-landscape/SUBSYSTEMS.md"
---

# 🎯 Subsistemas de FluxCoreChat

**Fecha:** 2026-03-19  
**Propósito:** Vista arquitectónica completa de los subsistemas principales  
**Metodología:** UI-First → Backend → Database → Integración  
**Estado:** 4 subsistemas documentados con análisis crítico

---

## 📊 **Overview General**

### **Arquitectura de Subsistemas**
```
FluxCoreChat
├── ChatCore (Dominio Humano)
│   └── 📝 Subsistema de Plantillas
└── FluxCore (Dominio IA)
    ├── 🤖 Subsistema de Asistentes
    ├── 📋 Subsistema de Instrucciones
    └── 🔍 Subsistema RAG
```

### **Métricas Generales**
- **Subsistemas principales:** 4 documentados
- **Dominios:** 2 (ChatCore + FluxCore)
- **Componentes UI totales:** 167 detectados
- **Componentes documentados:** 9/167 (5.4%)
- **Problemas críticos:** 12 identificados
- **Estado general:** ⚠️ Funcional con inconsistencias críticas

---

## 🤖 **1. Subsistema de Asistentes (FluxCore)**

### **Propósito Principal**
Configuraciones cognitivas (`RuntimeConfig`) que definen cómo una IA debe comportarse. Cada asistente representa una personalidad específica con su propia instrucción, herramientas, y reglas de automatización.

### **Componentes Principales**
- **`AssistantList.tsx`** - Vista principal de todos los asistentes
- **`AssistantDetail.tsx`** - Editor detallado de configuración
- **Vector Stores UI** - Gestión de bases de conocimiento

### **Características Clave**
- **Runtime Soberano:** Local (FluxCore) vs OpenAI (OpenAI Assistants API)
- **SOLO UNA Instrucción:** Cada asistente vincula exactamente UNA instrucción
- **MÚLTIPLES Bases de Conocimiento:** Puede vincular múltiples Vector Stores
- **MÚLTIPLES Herramientas:** Inyección de ToolConnections según capacidades

### **Estado Actual**
- **⚠️ Funcional con inconsistencias críticas**
- **Problemas:** UI vs BD en campos de gobernanza, contradicción schema vs implementación
- **Documentación:** `ASSISTANTS_SUBSYSTEM.md`

### **Métricas del Subsistema**
- **Componentes UI:** 2 principales + N vector stores
- **Problemas críticos:** 2 identificados
- **Complejidad:** Alta (configuración cognitiva)
- **Impacto:** Crítico (comportamiento de la IA)

---

## 📋 **2. Subsistema de Instrucciones (FluxCore)**

### **Propósito Principal**
Plantillas de prompts que contienen directivas de comportamiento para las IA. Son entidades independientes que pueden ser reutilizadas por múltiples asistentes (relación N:M).

### **Componentes Principales**
- **`InstructionsView.tsx`** - Listado de todas las instrucciones
- **`InstructionDetail.tsx`** - Editor de instrucción individual

### **Características Clave**
- **Entidad Independiente:** Viven separadas de los asistentes
- **Reutilización:** Una instrucción puede ser usada por múltiples asistentes
- **Versionado:** Cada instrucción tiene versiones (`current_version_id`)
- **Gestión Centralizada:** Pueden ser gestionadas independientemente

### **Estado Actual**
- **⚠️ Funcional con problemas arquitectónicos**
- **Problemas:** Schema diseñado para múltiples instrucciones por asistente pero UI solo usa la primera
- **Documentación:** `INSTRUCTIONS_SUBSYSTEM.md`

### **Métricas del Subsistema**
- **Componentes UI:** 2 principales
- **Problemas críticos:** 2 identificados
- **Complejidad:** Media (plantillas de prompts)
- **Impacto:** Alto (comportamiento de la IA)

---

## 🔍 **3. Subsistema RAG (FluxCore)**

### **Propósito Principal**
Sistema que permite a las IA acceder a conocimiento externo vectorizado para enriquecer sus respuestas con información contextual relevante.

### **Componentes Principales**
- **`RAGConfigSection.tsx`** - Configuración de parámetros RAG
- **Vector Stores UI** - Gestión de bases vectoriales
- **Chunking/Embedding UI** - Configuración de procesamiento

### **Características Clave**
- **Dual Backend:** Local (pgvector) vs OpenAI (OpenAI Vector Stores)
- **Configuración Granular:** Cada Vector Store tiene su propia configuración RAG
- **Soberanía de Datos:** Documentos vectorizados bajo control del account
- **Procesamiento Inteligente:** Chunking, embedding y retrieval configurables

### **Estado Actual**
- **⚠️ Funcional con configuración fragmentada**
- **Problemas:** Inconsistencia UI vs schema en RAG config, configuración fragmentada
- **Documentación:** `RAG_SUBSYSTEM.md`

### **Métricas del Subsistema**
- **Componentes UI:** 1 principal + N vector stores
- **Problemas críticos:** 2 identificados
- **Complejidad:** Alta (vectorización y búsqueda)
- **Impacto:** Alto (calidad de respuestas de la IA)

---

## 📝 **4. Subsistema de Plantillas (ChatCore)**

### **Propósito Principal**
Herramientas para personas que permiten tener mensajes predefinidos al alcance de la mano en el chat. Diseñadas para que los usuarios puedan reutilizar contenido rápidamente, incluyendo archivos adjuntos y variables dinámicas.

### **Componentes Principales**
- **`TemplateManager.tsx`** - Gestión CRUD principal
- **`TemplateEditor.tsx`** - Editor con preview en tiempo real
- **`TemplateQuickPicker.tsx`** - Selector rápido en chat
- **`TemplateAssetPicker.tsx`** - Gestión de archivos adjuntos
- **`FluxCoreTemplateConfig.tsx`** - Configuración de uso por IA

### **Características Clave**
- **UI-First:** Diseñadas para personas, no para IA
- **Variables Dinámicas:** Sistema de `{{variable}}` con validación
- **Assets Completos:** Gestión de imágenes, documentos, archivos
- **Configuración IA:** Control granular de uso automatizado

### **Estado Actual**
- **⚠️ Funcional pero viola FluxCore Canon v8.3**
- **Problemas:** Runtime ejecuta directamente, ActionExecutor no implementado, sin mediación del Kernel
- **Documentación:** `TEMPLATES_SUBSYSTEM.md`

### **Métricas del Subsistema**
- **Componentes UI:** 5 principales
- **Problemas críticos:** 4 identificados
- **Complejidad:** Media (gestión de contenido)
- **Impacto:** Alto (productividad del usuario)

---

## 🔄 **Interacciones entre Subsistemas**

### **Flujo de Configuración IA**
```
Instrucciones ←→ Asistentes ←→ Vector Stores (RAG)
     ↓              ↓              ↓
   Prompts     Personalidades     Conocimiento
```

### **Flujo de Usuario Humano**
```
Plantillas ←→ Chat ←→ Usuario
     ↓           ↓
  Contenido   Conversación
```

### **Flujo Híbrido (IA + Humano)**
```
Plantillas ←→ IA ←→ Asistentes ←→ Instrucciones ←→ RAG
     ↓         ↓       ↓           ↓           ↓
  Contenido  Uso IA  Personalidad  Prompts    Conocimiento
```

---

## 📈 **Métricas de Calidad por Subsistema**

### **Asistentes Subsystem**
- **Documentación:** ✅ Completa
- **Problemas críticos:** ❌ 2 inconsistencias
- **Funcionalidad:** ✅ Operativa
- **Arquitectura:** ⚠️ Necesita corrección

### **Instructions Subsystem**
- **Documentación:** ✅ Completa
- **Problemas críticos:** ❌ 2 problemas de diseño
- **Funcionalidad:** ✅ Operativa
- **Arquitectura:** ⚠️ Necesita definición

### **RAG Subsystem**
- **Documentación:** ✅ Completa
- **Problemas críticos:** ❌ 2 inconsistencias
- **Funcionalidad:** ✅ Operativa
- **Arquitectura:** ⚠️ Necesita expansión

### **Templates Subsystem**
- **Documentación:** ✅ Completa
- **Problemas críticos:** ❌ 4 violaciones del Canon
- **Funcionalidad:** ✅ Operativa
- **Arquitectura:** ❌ No alineada con FluxCore

---

## 🚨 **Problemas Críticos Consolidados**

### **Nivel 1: Violaciones del FluxCore Canon v8.3**
1. **Templates Runtime:** Ejecuta directamente (viola Invariante 11)
2. **ActionExecutor:** No implementado (solo TODO H3)
3. **Sin Kernel:** Comunicación directa Runtime→ChatCore
4. **Sin Certificación:** No hay validación ni auditoría

### **Nivel 2: Inconsistencias de Diseño**
5. **Asistentes UI vs BD:** Campos de gobernanza en lugar incorrecto
6. **Instructions Schema vs UI:** Múltiples instrucciones soportadas pero UI usa solo una
7. **RAG UI vs Schema:** Rangos inconsistentes en configuración

### **Nivel 3: Fragmentación Funcional**
8. **RAG Config:** UI solo expone subset de configuración
9. **Templates Variables:** Validación insuficiente de sintaxis
10. **Assets Integration:** Gestión fragmentada entre subsistemas

---

## 🎯 **Roadmap de Corrección por Prioridad**

### **Prioridad CRÍTICA (Inmediato)**
1. **Implementar ActionExecutor:** Ejecutor autorizado de Effect Actions
2. **Corregir Runtime Templates:** Devolver ExecutionAction, no ejecutar directamente
3. **Implementar Kernel:** Certificación y mediación de acciones

### **Prioridad ALTA (Esta semana)**
4. **Corregir Asistentes UI vs BD:** Mover campos de gobernanza a lugar correcto
5. **Definir Instructions Architecture:** Decidir dirección N:M vs 1:N
6. **Unificar RAG UI vs Schema:** Alinear rangos y configuración

### **Prioridad MEDIA (Próxima semana)**
7. **Expandir RAG UI:** Exponer configuración completa
8. **Mejorar Templates Variables:** Validación avanzada
9. **Integrar Assets Cross-Subsystems:** Gestión unificada

---

## 📊 **Dashboard de Subsistemas**

### **Estado General**
| Subsistema | Componentes | Problemas | Estado | Prioridad |
|-------------|-------------|-----------|--------|-----------|
| 🤖 Asistentes | 2 + N | 2 críticos | ⚠️ Funcional | Alta |
| 📋 Instrucciones | 2 | 2 críticos | ⚠️ Funcional | Alta |
| 🔍 RAG | 1 + N | 2 críticos | ⚠️ Funcional | Media |
| 📝 Plantillas | 5 | 4 críticos | ❌ No canónico | Crítica |

### **Métricas de Progreso**
- **Subsistemas documentados:** 4/4 (100%)
- **Subsistemas funcionales:** 4/4 (100%)
- **Subsistemas alineados:** 1/4 (25%)
- **Problemas críticos totales:** 12
- **Problemas resueltos:** 0/12

---

## 🔄 **Integración con Documentación de Componentes**

### **Referencias Cruzadas**
- **SUBSYSTEMS.md** ←→ Componentes individuales
- **UI_COMPONENTS_MAP.md** ←→ Mapeo por subsistema
- **00-documentation-index.md** ←→ Métricas de subsistemas

### **Estructura de Archivos**
```
01-ui-landscape/
├── SUBSYSTEMS.md                    # 🎯 Índice maestro (este archivo)
├── ASSISTANTS_SUBSYSTEM.md          # 🤖 Subsistema completo
├── INSTRUCTIONS_SUBSYSTEM.md        # 📋 Subsistema completo
├── RAG_SUBSYSTEM.md                 # 🔍 Subsistema completo
├── TEMPLATES_SUBSYSTEM.md           # 📝 Subsistema completo
├── UI_COMPONENTS_MAP.md             # 📋 Mapeo por subsistema
├── components/                      # 📦 Componentes individuales
│   ├── ASSISTANT_LIST.md
│   ├── ASSISTANT_DETAIL.md
│   ├── INSTRUCTION_VIEW.md
│   ├── INSTRUCTION_DETAIL.md
│   ├── RAG_CONFIG_SECTION.md
│   ├── TEMPLATE_MANAGER.md
│   ├── TEMPLATE_EDITOR.md
│   ├── TEMPLATE_QUICK_PICKER.md
│   ├── TEMPLATE_ASSET_PICKER.md
│   └── FLUXCORE_TEMPLATE_CONFIG.md
└── 00-documentation-index.md       # 📚 Índice general
```

---

## 🎯 **Conclusión**

Los subsistemas de FluxCoreChat están **funcionales pero con inconsistencias críticas** que afectan la arquitectura general. La documentación por subsistemas proporciona una visión estratégica que permite:

1. **Priorizar correcciones** basadas en impacto arquitectónico
2. **Entender interacciones** entre dominios ChatCore y FluxCore
3. **Planificar refactorización** con conocimiento completo del terreno
4. **Mantener contexto** durante desarrollo y mantenimiento

**Estado Actual:** ⚠️ **FUNCIONAL PERO REQUIERE ALINEACIÓN ARQUITECTÓNICA**

**Próximos Pasos:**
1. Implementar correcciones críticas del FluxCore Canon
2. Resolver inconsistencias de diseño en cada subsistema
3. Expandir funcionalidades fragmentadas
4. Alinar toda la arquitectura con los principios del FluxCore Canon v8.3

---

**Este documento sirve como el mapa estratégico para entender y mejorar la arquitectura completa de FluxCoreChat.**
