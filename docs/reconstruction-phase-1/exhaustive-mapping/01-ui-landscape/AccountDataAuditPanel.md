---
id: "account-data-audit-panel"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/monitor/AccountDataAuditPanel.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Consume la API Rest `api.getAccountDataReferences`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Panel de Auditoría de Borrado de Cuentas (GDPR)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Escaneo total de base de datos de FKs, Formateo de Querys SQL fantasma (Copy)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🕵️‍♂️ AccountDataAuditPanel

## 🎯 Propósito
(Panel de Monitoreo Root). Se encarga de rastrear "fantasmas" (Datos Huérfanos) luego de que una compañía elimina su cuenta. Provee a los Administradores un escáner que le pregunta a la Database: *"¿Cuántas filas a lo largo de TODAS tus decenas de tablas todavía tienen el viejo account_id amarrado?"*

## 📦 Estado y Datos
**Grid de Memoria y Portapapeles (`references[]`):**
- Acumulador principal de objetos `ReferenceRow` que guardan dinámicamente: el Nombre de la Tabla (`messages, vector_stores`), la Columna, y el conteo escandaloso de Filas residuales.

## 🔄 Flujos de Interacción
1. **Generador Mágico de SQL (`handleCopySql`):** Si encuentra, por ejemplo, 50 rows en la tabla `files`, ofrece un asombroso botoncito para el DBA. Al clickearlo, fabrica en memoria el string `SELECT * FROM "files" WHERE "account_id" = 'uuid';` y lo avienta al portapapeles invisible del SO permitiendo arreglos manuales acelerados.

## 💡 Ejemplo de Uso
```tsx
// Usado unicamente como tab dentro del Monitoring Hub
openTab('dashboard', { title: 'Account Data Audit', context: { view: 'audit' } });
```
