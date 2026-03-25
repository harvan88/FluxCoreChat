---
id: "system-monitor"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/monitor/SystemMonitor.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Queries a REST (Diagnostic), IndexedDB native Dexie API" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Centro Clandestino de Diagnóstico PWA vs DB" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Auto-refresh a 5s, Cálculo Diffs de sincronización offline" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🩺 SystemMonitor

## 🎯 Propósito
Vista de nivel Administrador brutalmente exhaustiva para evaluar la vitalidad de todo el orquestamiento FluxCore. Compara continuamente si la base de datos local HTML5 (`IndexedDB` en Dexie) de PWA está atrasada matemáticamente en número de filas y registros contra las tripas del cluster `PostgreSQL` alojado en el Backend de verdad.

## 📦 Estado y Datos
- **Estados Poli-Dimensionales:** Mantiene en memoria el conteo de tablas locales `db.messages.count()`, latencia de red `responseTimeMs`, cola de sincronización rota `pendingSync` y la disponibilidad de rutas API desprotegidas. 

## 🔄 Flujos de Interacción
1. **Intervalo Automático Agresivo:** Contiene un pulso forzado `setinterval(refresh, 5000)` golpeando a ambos sistemas cada 5 segundos para animar en vivo las gráficas y badges (Útil para debugear conexiones Socket fantasma o caídas LTE).
2. **Tabla de Diff (Diff Table):** Computa un `pgCount - idbCount` para emitir visuales de advertencia (`⚠ Sync needed`) si tu navegador cacheado falló subiendo o bajando mensajes al servidor real.

## 💡 Ejemplo de Uso
```tsx
<Route path="/monitor" element={<SystemMonitor />} />
```
