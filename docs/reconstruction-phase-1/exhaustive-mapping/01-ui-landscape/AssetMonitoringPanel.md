---
id: "asset-monitoring-panel"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/monitor/AssetMonitoringPanel.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Dependencia estricta de `useAssetMonitorStore` y `api.getStats` global" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Monitor Maestro de Carga Binaria (Archivos y Multimedia)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "JSON Blob Downloading en Memoria, Copia Multi-Fallback al SO" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📦 AssetMonitoringPanel

## 🎯 Propósito
Es el "Observador de Archivos" centralizado dentro del Monitoring Hub. Rastrea en una gigantesca cuadrícula de datos cada PDF, Imagen o Binario que la organización haya intentado subir, descargar o borrar mostrándo un Dashboard estelar estilo S3 (Amazon) del estado del Storage.

## 📦 Estado y Datos
**Burbujas Métricas en Vivo (`stats`):**
Crea 4 Cartas Supremas arribas. Calcula en JS puros el Size en Bytes transformándolo (`formatBytes()`) a lecturas humanas `250 MB`, y suma cuantos estatus están estancados en `pending` o si han fallado las políticas CORS de subida `access_denied`.

## 🔄 Flujos de Interacción
1. **Fabricador Sintético de Archivos (`handleDownload`):** Convierte arreglos de Memoria (`filteredLogs`) en un archivo físico construyendo objetos Blob, creando una URL Transitoria de Falso Host (ObjectURL) y simulando un Clic Mágico Ancla `<a>` para dispararle la descarga real al Navegador Web (`asset-logs.json`).
2. **Sistema Copy-Catch de Titanio (`handleCopy` / `copyViaFallback`):** Utiliza 3 estrategias brutales para asegurar que los Logs se copien: `navigator.clipboard` moderno -> API obsoleto `execCommand('copy')` con Textareas fantasmas. Si el Browser tiene denegado Portapapeles, igual lo vulnera temporalmente.

## 💡 Ejemplo de Uso
```tsx
// Exclusivo de Monitoring Hub
openTab('dashboard', { view: 'AssetMonitoringPanel' })
```
