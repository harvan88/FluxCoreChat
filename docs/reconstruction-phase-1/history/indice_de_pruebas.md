# Índice de Pruebas y Scripts (FluxCore Phase 1)

Este documento centraliza los scripts necesarios para realizar pruebas deterministas en el pipeline cognitivo y el kernel.

## 🧹 Limpieza y Preparación (Clean Slate)
Antes de cada prueba, el historial de conversación debe ser purgado para evitar sesgos de memoria.
- **Script**: `scripts/clear-conversation.ts`
- **Propósito**: Limpieza determinista del historial. Elimina mensajes, trazas, sugerencias y el estado operativo de Fluxi/WES (Works y Contexto Semántico), manteniendo vivos los participantes y el registro maestro de la conversación.

## 🕵️‍♂️ Auditoría del RAG (Vector Search)
Herramientas para verificar la integridad física de los vectores y assets.
- **Script**: `scripts/inspect-residual-chunks.ts`
- **Propósito**: Muestra los chunks vectorizados asociados a la cuenta de la IA.
- **Script**: `scripts/list-vs-files.ts`
- **Propósito**: Lista archivos vinculados a un Vector Store y su estado de procesamiento.

## 🧠 Auditoría Inteligente del Kernel (Cognitive Pipeline)
Pruebas integrales de la Fase 1 (Router) y Fase 2 (RAG).
- **Script**: `scripts/test-rag-conversation.ts`
- **Propósito**: Simula un mensaje de usuario y genera un reporte forense completo de las decisiones del cerebro de la IA.

## 🛡️ Soberanía Operativa y Auditoría de Acceso
Pruebas para verificar la visibilidad de Fluxi sobre la cuenta de soporte.
- **Script**: `apps/api/src/scratch/generate-sovereignty-report.ts`
- **Propósito**: Genera un reporte Markdown detallado sobre las instrucciones, plantillas y herramientas que Fluxi ve de forma soberana para la cuenta de soporte.

## 🛡️ Sovereign Shield
- **Migración**: `packages/db/migrations/053_sovereign_shield_v2.sql`
- **Script de aplicación**: `packages/db/apply-shield.ts`
- **Propósito**: Protección contra borrados masivos y habilitación de borrado granular por cuenta.

---
*Última actualización: 2026-04-24T21:00 (Fase de Reconstrucción)*
