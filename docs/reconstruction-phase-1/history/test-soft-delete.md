---
id: "test-soft-delete"
type: "core"
status: "wip"
criticality: "medium"
location: "apps/api/src/db/test-soft-delete.ts"

# 🎯 SISTEMA DE CAPAS - EVOLUCIÓN DE DOCUMENTACIÓN
layers:
  discovery:           # Capa 1: Descubrimiento Atómico
    status: "complete"
    completed_date: "2026-03-22"
    confidence: 100
    notes: "Componente detectado automáticamente por script de Discovery"
  
  connections:         # Capa 2: Conexiones e Interdependencias
    status: "pending"
    confidence: 0
  
  subsystem:          # Capa 3: Subsistemas Funcionales
    status: "pending"
    confidence: 0
  
  operations:          # Capa 4: Operación y Mantenimiento
    status: "pending"
    confidence: 0

# 📊 Métricas de Evolución
evolution:
  current_layer: 1
  total_layers: 4
  completion_percentage: 25
  last_updated: "2026-03-22"
  next_milestone: "connections"
---

# 🤖 test-soft-delete

**Ubicación:** `apps/api/src/db/test-soft-delete.ts`
**Tipo Detectado:** `core`
**Tamaño Lógico:** `173 líneas`


## 🎯 Propósito
Módulo, servicio o funcionalidad core del backend. (Descubierto automáticamente).
Ruta exacta: `apps/api/src/db/test-soft-delete.ts`

## 🏗️ Arquitectura
*La arquitectura detallada y su integración dentro del ecosistema se resolverá en la Capa 2 y 3.*

## 🔗 Dependencias Directas Mapeadas
- `../services/message-deletion.service`
- `../services/message.service`
- `@fluxcore/db`
- `drizzle-orm`


---

*(Nota: Este documento ha sido generado mecánicamente como parte del levantamiento atómico de la fase 1 de descubrimiento. Requiere revisión para avanzar en el grado de madurez hacia las siguientes capas de arquitectura).*
