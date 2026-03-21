---
id: "documentation-strategy-layers"
type: "core"
status: "draft"
criticality: "high"
location: "docs/reconstruction-phase-1/exhaustive-mapping/DOCUMENTATION_STRATEGY_LAYERS.md"
---

# 🎯 Estrategia de Documentación por Capas (FluxCore)

**Propósito:** Metodología estratificada para documentar sistemas complejos manejando tanto la visión atómica (código) como la sistémica (arquitectura)
**Estado:** 📝 DRAFT - Para revisión y validación
**Fecha:** 2026-03-21

---

## 🧩 **Problema Fundamental**

### **Tensión Natural:**
- **Visión Atómica:** Componentes individuales, código fuente, implementación
- **Visión Sistémica:** Arquitectura completa, flujos, interconexiones
- **Realidad:** Ambas son necesarias y se alimentan mutuamente

### **Riesgos de un Enfoque Único:**
- **Solo atómico:** Pierdes el contexto y el propósito
- **Solo sistémico:** Sin detalles implementables
- **Todo junto:** Abrumador, difícil de mantener, inconsistente

---

## 🏗️ **Estrategia de 4 Capas**

### **🔍 CAPA 1: Descubrimiento Atómico (Baseline)**
**Propósito:** Mapear todo lo que existe sin interpretación

#### **Qué se documenta:**
- **Componentes UI:** Todos los React components detectados
- **Componentes Backend:** Todos los servicios, rutas, utilidades
- **Entidades DB:** Todas las tablas, relaciones, schemas
- **Hooks y Utils:** Todas las funciones compartidas

#### **Nivel de detalle:**
- **Nombre y ubicación:** `apps/web/src/components/monitor/DocumentationQualityPanel.tsx`
- **Tipo:** React Component / Service / Hook / Utility
- **Dependencias directas:** Import statements
- **Props/Interfaces:** Qué recibe/qué devuelve
- **Ubicación física:** Path exacto

#### **Características:**
- **Automatizado:** Scripts que escanean el código
- **No interpretativo:** Solo hechos objetivos
- **Baseline:** Referencia inicial de "qué existe"
- **Actualizable:** Se regenera automáticamente

---

### **🌐 CAPA 2: Conexiones e Interdependencias**
**Propósito:** Entender cómo los componentes se relacionan entre sí

#### **Qué se documenta:**
- **Flujos de datos:** Component A → Component B → Component C
- **Jerarquías:** Parent-child relationships
- **Consumo de servicios:** Quién usa qué API
- **Estados compartidos:** Context providers, stores
- **Eventos y callbacks:** Quién dispara, quién escucha

#### **Nivel de detalle:**
- **Mapas de flujo:** Visualizaciones de conexiones
- **Cadenas de llamada:** Call stacks reales
- **Dependencias circulares:** Problemas arquitectónicos
- **Puntos críticos:** Single points of failure

#### **Características:**
- **Semi-automatizado:** Scripts + validación manual
- **Relacional:** Enfocado en relaciones, no en componentes
- **Arquitectónico:** Revela la estructura real del sistema

---

### **🎯 CAPA 3: Subsistemas Funcionales**
**Propósito:** Agrupar componentes por propósito de negocio

#### **Qué se documenta:**
- **Subsistemas identificados:** FluxCore, ChatCore, Auth, etc.
- **Propósito de cada subsistema:** Qué problema resuelve
- **Componentes clave:** Cuáles son los pilares
- **Interacciones entre subsistemas:** Cómo colaboran
- **Casos de uso completos:** User journeys end-to-end

#### **Nivel de detalle:**
- **Definiciones canónicas:** Qué ES cada subsistema
- **Límites y responsabilidades:** Qué hace y qué NO hace
- **Interfaces públicas:** Cómo interactúa con otros
- **Métricas de salud:** Cómo medir su funcionamiento

#### **Características:**
- **Interpretativo:** Requiere entendimiento del dominio
- **Funcional:** Orientado a valor de negocio
- **Estratégico:** Guía decisiones arquitectónicas

---

### **📋 CAPA 4: Operación y Mantenimiento**
**Propósito:** Guía práctica para desarrolladores

#### **Qué se documenta:**
- **Cómo modificar:** Guías paso a paso
- **Cómo extender:** Patrones para agregar funcionalidad
- **Cómo depurar:** Troubleshooting común
- **Cómo optimizar:** Performance y mejores prácticas
- **Cómo migrar:** Cambios breaking changes

#### **Nivel de detalle:**
- **Tutoriales prácticos:** Step-by-step guides
- **Ejemplos reales:** Code snippets funcionales
- **Decisiones arquitectónicas:** Por qué se hizo así
- **Trade-offs:** Ventajas y desventajas de decisiones

#### **Características:**
- **Práctico:** Enfocado en acción
- **Vivo:** Se actualiza con el uso real
- **Contextual:** Conoce el día a día del desarrollo

---

## 🔄 **Flujo de Trabajo Iterativo**

### **📅 FASE 1: Descubrimiento Atómico (1 semana)**
1. **Ejecutar scripts de escaneo**
2. **Generar baseline completo**
3. **Validar cobertura:** ¿Detectamos todo?
4. **Crear índice maestro**

**Output:** Lista completa de todos los componentes existentes

---

### **📅 FASE 2: Mapeo de Conexiones (2 semanas)**
1. **Analizar dependencias** usando herramientas estáticas
2. **Mapear flujos principales**
3. **Identificar cuellos de botella**
4. **Documentar arquitectura emergente**

**Output:** Mapas de interconexiones y diagramas de flujo

---

### **📅 FASE 3: Definición de Subsistemas (2 semanas)**
1. **Agrupar componentes por propósito**
2. **Definir límites y responsabilidades**
3. **Crear documentación canónica**
4. **Validar con stakeholders**

**Output:** Definiciones oficiales de subsistemas

---

### **📅 FASE 4: Guías Operativas (1 semana)**
1. **Crear tutoriales basados en problemas reales**
2. **Documentar patrones de uso**
3. **Escribir guías de troubleshooting**
4. **Establecer métricas de mantenimiento**

**Output:** Guías prácticas para desarrolladores

---

### **🔄 CICLO CONTINUO: Actualización y Refinación**
**Cada 2 semanas:**
- **Regenerar Capa 1** (nuevos componentes)
- **Actualizar Capa 2** (nuevas conexiones)
- **Refinar Capa 3** (cambios en subsistemas)
- **Mejorar Capa 4** (lecciones aprendidas)

---

## 🎯 **Ejemplo Práctico: DocumentationQualityPanel**

### **Capa 1 (Atómico):**
```
Component: DocumentationQualityPanel
Location: apps/web/src/components/monitor/DocumentationQualityPanel.tsx
Type: React Component
Props: { metrics: DocumentationMetrics }
Imports: useState, useEffect, CopyButton
Size: 559 lines
```

### **Capa 2 (Conexiones):**
```
DocumentationQualityPanel
├── Consume: /api/fluxcore/documentation/quality
├── Renderiza: CopyButton component
├── Actualiza: documentation-quality.service.ts
└── Dispara: toggleSection events
```

### **Capa 3 (Subsistema):**
```
FluxCore Monitoring Subsystem
├── Propósito: Visibilidad del estado del sistema
├── Componente clave: DocumentationQualityPanel
├── Interfaz: Dashboard de métricas en tiempo real
└── Valor: Permite tomar decisiones informadas sobre documentación
```

### **Capa 4 (Operación):**
```
Cómo agregar una nueva métrica:
1. Agregar campo en DocumentationMetrics interface
2. Actualizar service para calcular nueva métrica
3. Añadir visualización en el panel
4. Probar con datos reales
```

---

## 🛠️ **Herramientas y Automatización**

### **Para Capa 1:**
- **AST scanners:** Analizan código fuente
- **File watchers:** Detectan cambios
- **Dependency graphs:** Mapean imports

### **Para Capa 2:**
- **Static analysis:** Encuentra dependencias
- **Call graph generators:** Mapean flujos
- **Visualization tools:** Crean diagramas

### **Para Capa 3:**
- **Domain analysis:** Entendimiento de negocio
- **Stakeholder interviews:** Validación de propósito
- **Architecture decision records:** Documentación de decisiones

### **Para Capa 4:**
- **User feedback:** Problemas reales
- **Analytics:** Uso del sistema
- **Performance metrics:** Datos objetivos

---

## 🏷️ **Sistema de Etiquetado por Capas (Frontmatter Evolution)**

### **� Schema de Frontmatter Multi-Capa:**

```yaml
---
id: "component-name"
type: "core" | "subsystem" | "ui-component" | "backend-service"
status: "stable" | "wip" | "needs_review" | "draft"
criticality: "high" | "medium" | "low"
location: "path/to/component"

# 🎯 SISTEMA DE CAPAS - EVOLUCIÓN DE DOCUMENTACIÓN
layers:
  discovery:           # Capa 1: Descubrimiento Atómico
    status: "complete" | "partial" | "pending" | "not_applicable"
    completed_date: "2026-03-21"
    confidence: 95     # 0-100: qué tan completo está esta capa
    notes: "Componente detectado automáticamente"
  
  connections:         # Capa 2: Conexiones e Interdependencias
    status: "complete" | "partial" | "pending" | "not_applicable"
    completed_date: "2026-03-22"
    confidence: 80
    dependencies_mapped: 5
    notes: "Conexiones principales mapeadas, falta validar edge cases"
  
  subsystem:          # Capa 3: Subsistemas Funcionales
    status: "complete" | "partial" | "pending" | "not_applicable"
    completed_date: "2026-03-25"
    confidence: 90
    subsystem: "FluxCore Monitoring"
    purpose_validated: true
    notes: "Integrado en subsistema de monitoreo"
  
  operations:          # Capa 4: Operación y Mantenimiento
    status: "complete" | "partial" | "pending" | "not_applicable"
    completed_date: "pending"
    confidence: 30
    guides_count: 1
    notes: "Falta crear guía de troubleshooting"

# 📊 Métricas de Evolución
evolution:
  current_layer: 3     # Última capa completada
  total_layers: 4
  completion_percentage: 75
  last_updated: "2026-03-21"
  next_milestone: "operations"
  
# 🔗 Relaciones con otros componentes
relationships:
  depends_on: ["documentation-quality.service.ts", "CopyButton.tsx"]
  used_by: ["MonitoringDashboard.tsx"]
  similar_to: ["QualityPanelLegacy.tsx"]
---
```

### **🎯 Estados por Capa:**

#### **🔍 Capa 1 (Discovery):**
- **`complete`**: Componente detectado y catalogado
- **`partial`**: Detectado pero falta información básica
- **`pending`**: Componente existe pero no analizado
- **`not_applicable`**: No aplica (ej: documentos conceptuales)

#### **🌐 Capa 2 (Connections):**
- **`complete`**: Todas las dependencias mapeadas
- **`partial`**: Dependencias principales mapeadas
- **`pending`**: No se han mapeado conexiones
- **`not_applicable`**: Componente aislado

#### **🎯 Capa 3 (Subsystem):**
- **`complete`**: Integrado en definición de subsistema
- **`partial`**: Subsistema identificado pero no validado
- **`pending`**: No asignado a subsistema
- **`not_applicable`**: Componente utilitario

#### **📋 Capa 4 (Operations):**
- **`complete`**: Guías completas de uso/mantenimiento
- **`partial`**: Guías básicas disponibles
- **`pending`**: Sin guías prácticas
- **`not_applicable`**: Componente interno

---

## 🔄 **Flujo de Evolución por Componente**

### **📈 Ejemplo: DocumentationQualityPanel**

#### **Estado Inicial (solo Capa 1):**
```yaml
layers:
  discovery:
    status: "complete"
    completed_date: "2026-03-21"
    confidence: 100
    notes: "Detectado automáticamente"
  connections:
    status: "pending"
    confidence: 0
  subsystem:
    status: "pending"
    confidence: 0
  operations:
    status: "pending"
    confidence: 0
evolution:
  current_layer: 1
  completion_percentage: 25
```

#### **Estado Intermedio (Capas 1-2):**
```yaml
layers:
  discovery:
    status: "complete"
    completed_date: "2026-03-21"
    confidence: 100
  connections:
    status: "complete"
    completed_date: "2026-03-22"
    confidence: 85
    dependencies_mapped: 3
    notes: "API, CopyButton, hooks mapeados"
  subsystem:
    status: "pending"
  operations:
    status: "pending"
evolution:
  current_layer: 2
  completion_percentage: 50
  next_milestone: "subsystem"
```

#### **Estado Final (todas las capas):**
```yaml
layers:
  discovery:
    status: "complete"
    completed_date: "2026-03-21"
    confidence: 100
  connections:
    status: "complete"
    completed_date: "2026-03-22"
    confidence: 90
  subsystem:
    status: "complete"
    completed_date: "2026-03-25"
    confidence: 95
    subsystem: "FluxCore Monitoring"
  operations:
    status: "complete"
    completed_date: "2026-03-28"
    confidence: 85
    guides_count: 3
evolution:
  current_layer: 4
  completion_percentage: 100
```

---

## 🤖 **Automatización del Sistema de Capas**

### **📊 Scripts de Detección de Progreso:**

#### **1. Analizador de Capas (`layer-analyzer.ts`):**
```typescript
interface LayerProgress {
  layer: number;
  status: 'complete' | 'partial' | 'pending';
  confidence: number;
  completion_date?: string;
  blockers?: string[];
}

function analyzeLayerProgress(documentPath: string): LayerProgress[] {
  // Analiza frontmatter y contenido para determinar progreso
  // Retorna estado de cada capa
}
```

#### **2. Actualizador Automático (`layer-updater.ts`):**
```typescript
function updateLayerStatus(
  documentPath: string, 
  layer: number, 
  status: LayerStatus
): void {
  // Actualiza frontmatter con nuevo estado
  // Recalcula métricas de evolución
  // Guarda timestamp de actualización
}
```

#### **3. Reporte de Evolución (`evolution-report.ts`):**
```typescript
interface EvolutionReport {
  total_components: number;
  layer_distribution: {
    layer_1_complete: number;
    layer_2_complete: number;
    layer_3_complete: number;
    layer_4_complete: number;
  };
  bottleneck_layers: number[];
  next_priorities: string[];
}
```

---

## 🎯 **Dashboard de Evolución por Capas**

### **📈 Métricas del Sistema:**

#### **Progreso General:**
```
🔍 Capa 1 (Discovery):     ████████████████ 100% (167/167)
🌐 Capa 2 (Connections):   ████████░░░░░░░░░  60% (100/167)
🎯 Capa 3 (Subsystem):     ██████░░░░░░░░░░░  50% (83/167)
📋 Capa 4 (Operations):    ███░░░░░░░░░░░░░░  25% (42/167)
```

#### **Componentes por Estado de Evolución:**
- **🟢 Completos (4/4 capas):** 42 componentes
- **🟡 Avanzados (3/4 capas):** 83 componentes  
- **🟠 Básicos (2/4 capas):** 100 componentes
- **🔴 Iniciales (1/4 capas):** 167 componentes

#### **Cuellos de Botella:**
- **Capa 2:** 67 componentes esperando mapeo de conexiones
- **Capa 3:** 84 componentes sin asignación de subsistema
- **Capa 4:** 125 componentes sin guías operativas

---

## 🔄 **Flujo de Trabajo con Etiquetado**

### **📝 Paso 1: Creación Inicial**
```bash
# Script detecta nuevo componente
npm run detect-component --path "src/components/NewPanel.tsx"

# Genera documento con Capa 1 completa
docs/01-ui-landscape/NEW_PANEL.md
# → layers.discovery = "complete"
# → evolution.current_layer = 1
```

### **🔗 Paso 2: Mapeo de Conexiones**
```bash
# Analiza dependencias del componente
npm run map-connections --component "NewPanel"

# Actualiza a Capa 2
# → layers.connections = "complete"
# → evolution.current_layer = 2
```

### **🎯 Paso 3: Asignación de Subsistema**
```bash
# Asigna a subsistema existente o crea nuevo
npm run assign-subsystem --component "NewPanel" --subsystem "Monitoring"

# Actualiza a Capa 3
# → layers.subsystem = "complete"
# → evolution.current_layer = 3
```

### **📋 Paso 4: Guías Operativas**
```bash
# Genera guía basada en uso real
npm run generate-guide --component "NewPanel" --type "troubleshooting"

# Actualiza a Capa 4
# → layers.operations = "complete"
# → evolution.current_layer = 4
```

---

## 🎯 **Beneficios del Etiquetado por Capas**

### **✅ Visibilidad Clara:**
- **Sabes exactamente** dónde está cada componente
- **Puedes priorizar** basado en capas faltantes
- **Mides progreso** de manera objetiva

### **✅ Flujo Organizado:**
- **No te sientes abrumado** - trabajas por capas
- **Puedes parar** en cualquier punto y continuar después
- **Tienes hitos claros** de progreso

### **✅ Calidad Controlada:**
- **Cada capa tiene criterios claros** de "completado"
- **Evitas documentación incompleta**
- **Tienes métricas objetivas** de calidad

---

## 📊 **Métricas de Éxito del Sistema**

### **Indicadores Clave:**
- **Velocidad de evolución:** Tiempo promedio por capa
- **Calidad por capa:** Confidence score promedio
- **Cuellos de botella:** Capas con más pendientes
- **Adopción:** % componentes que avanzan capas

### **Alertas Automáticas:**
- **Componentes estancados:** Más de 2 semanas en misma capa
- **Capas críticas:** Muchos componentes pendientes en una capa
- **Calidad baja:** Confidence < 70% en alguna capa

---

**NOTA:** Este sistema de etiquetado permite que la documentación crezca de manera controlada, sabiendo siempre en qué punto está cada componente y qué necesita para avanzar.

---

## 🎯 **Próximos Pasos**

1. **Validar estrategia** con el equipo
2. **Priorizar subsistemas** críticos
3. **Comenzar con Capa 1** (descubrimiento)
4. **Iterar basado en feedback**

---

**NOTA:** Esta estrategia es un framework adaptable. Cada proyecto puede ajustar el peso de cada capa según sus necesidades específicas.
