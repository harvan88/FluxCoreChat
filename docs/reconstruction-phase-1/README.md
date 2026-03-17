# Reconstrucción de documentación — Fase 1

## Propósito

Esta carpeta contiene la reconstrucción activa de la arquitectura del sistema basada en el código actual y el esquema de base de datos del repositorio. Es la **fuente activa de verdad** para la documentación arquitectónica del sistema.

---

## 📁 Estructura Organizada

### 🏛️ [Core Definitions](./core/)
*Fundamentos y contratos transversales del sistema.*
- [`FLUXCORE_CANON_FINAL_v8.3.md`](./core/FLUXCORE_CANON_FINAL_v8.3.md) - **Constitución del Sistema**.
- [`canonical-definitions.md`](./core/canonical-definitions.md) - Definiciones canónicas.
- [`FLUXCORE_WES_CANON.md`](./core/FLUXCORE_WES_CANON.md) - Especificaciones del Sistema de Trabajo Transaccional.
- [`RUNTIME_SOVEREIGNTY_CANON.md`](./core/RUNTIME_SOVEREIGNTY_CANON.md) - Reglas de soberanía.
- [`WEBSOCKET_ARCHITECTURE.md`](./core/WEBSOCKET_ARCHITECTURE.md) - Infraestructura de tiempo real.
- [`CHATCORE_KERNEL_INTERSECTION.md`](./core/CHATCORE_KERNEL_INTERSECTION.md) - Fronteras del Kernel.
- [`system-flows.md`](./core/system-flows.md) - Flujos end-to-end.

### 🧩 [Modules & Components](./modules/)
*Documentación detallada por dominio funcional.*
- **ChatCore:** [`overview`](./modules/chatcore-overview.md), [`components`](./modules/chatcore-components.md), [`assets`](./modules/chatcore-assets.md).
- **Kernel:** [`overview`](./modules/kernel-overview.md), [`components`](./modules/kernel-components.md).
- **FluxCore:** [`overview`](./modules/fluxcore-overview.md), [`components`](./modules/fluxcore-components.md).

### 📡 [Telemetry & Pipeline](./telemetry/)
*Monitoreo y trazabilidad del Kernel.*
- [`IMPLEMENTATION_PIPELINE_TELEMETRY.md`](./telemetry/IMPLEMENTATION_PIPELINE_TELEMETRY.md) - **Live Pipeline (NUEVO)**.
- [`TELEMETRIA_IDEA_RECUPERADA.md`](./telemetry/TELEMETRIA_IDEA_RECUPERADA.md) - Visión conceptual.
- [`PIPELINE_VISUAL_TRAZABILIDAD.md`](./telemetry/PIPELINE_VISUAL_TRAZABILIDAD.md) - Mapa visual de trazas.

### ⚖️ [Governance & Methodology](./governance/)
*Reglas para el desarrollo y documentación.*
- [`documentation-governance.md`](./governance/documentation-governance.md) - Control documental.
- [`SYSTEM_REFACTORING_METHODOLOGY.md`](./governance/SYSTEM_REFACTORING_METHODOLOGY.md) - Guía maestra de refactoring.
- [`REFACTORING_METHODOLOGY_GUIDE.md`](./governance/REFACTORING_METHODOLOGY_GUIDE.md) - Casos específicos.

### 🔍 [Analysis & Audits](./analysis/)
*Diagnósticos y auditorías técnicas.*
- [`ANALYSIS_FLUXI_WES.md`](./analysis/ANALYSIS_FLUXI_WES.md) - Análisis de migración.
- [`AUDIT_FLUX_NEW_ARCHITECTURE.md`](./analysis/AUDIT_FLUX_NEW_ARCHITECTURE.md) - Auditoría estructural.
- [`CRISIS_IMPLEMENTACION_ANALYSIS.md`](./analysis/CRISIS_IMPLEMENTACION_ANALYSIS.md) - Post-mortem técnico.

### 📈 [Phases & Progress](./phases/)
*Histórico de construcción y bitácoras diarias.*
- [`FASE1` a `FASE4`](./phases/) - Reportes de avance.
- [`MIGRATION_FLUXI_*`](./phases/) - Planes de migración.

### 🛠️ [Specs](./specs/)
- [`KERNEL_CONSOLE_V4_SPECIFICATION.md`](./specs/KERNEL_CONSOLE_V4_SPECIFICATION.md) - Especificación de Consola Harvan.

---

## 🎯 Orden Sugerido de Lectura

1. `core/canonical-definitions.md`
2. `governance/SYSTEM_REFACTORING_METHODOLOGY.md`
3. `modules/chatcore-overview.md` | `kernel-overview.md` | `fluxcore-overview.md`
4. `telemetry/IMPLEMENTATION_PIPELINE_TELEMETRY.md`

**Última organización estructural:** 2026-03-16
