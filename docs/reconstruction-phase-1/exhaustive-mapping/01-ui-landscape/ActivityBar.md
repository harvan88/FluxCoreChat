---
id: "activity-bar"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/layout/ActivityBar.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Habla con Hook de Extensiones para popular UI Dinámica" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Totem Canónico Izquierdo (Barra de Navegación VSCode-like)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Manejo de estados Collapsed/Expanded, Lógica Live de Créditos" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🗿 ActivityBar

## 🎯 Propósito
Es el "Totem" o mástil izquierdo omnipresente en el Dashboard (inspirado 100% estructuralmente en VS Code). Combina herramientas base estáticas (Mensajes, Contactos, Configuración) y en una hazaña de extensibilidad, inyecta botones dinámicamente según los plugins/extensiones que la Cuenta haya instalado.

## 📦 Estado y Datos
**El Polimorfismo del Totem:**
- Tiene dos variables reactivas claves traídas del `useUIStore`: `activeActivity` (que ilumina de azul la pastilla) y `activityBarExpanded` (que decide si pintar `w-52` ancho gordo con texto, o `w-14` delgado solo con iconos).
- Reacciona en vivo para mostrar el contador de saldo de Premium (Tokens) llamando vía `setInterval` cada minuto a `api.getCreditsBalance`.

## 🔄 Flujos de Interacción
1. **Inyección de Extensiones (`extensionActivities`):** Recorre el array gigante de `installations`. Si una extensión declara `manifest.ui.sidebar`, extrae su ícono de sistema y se lo incrusta en el medio visual de los botones pre-empacados de la PWA.
2. **Entrada privilegiada a observabilidad:** Cuenta con una validación explícita `selectedAccountId === '3e94...b02d'`. Si la cuenta coincide, el botón de monitoring abre un tab de tipo `monitoring` con identidad `monitoring-kernel` y título `Kernel Console`, que funciona como puerta de entrada a la superficie activa de observabilidad.

## Dependencias
- **Depende de:** `useUIStore`, `usePanelStore`, `api.getCreditsBalance` y el sistema de extensiones instaladas.
- **Es usado por:** `Layout.tsx` como eje izquierdo permanente del shell principal.

## 💡 Ejemplo de Uso
```tsx
// Dentro del Root Layout
<div className="flex h-screen">
  <ActivityBar />
  <MainContent />
</div>
```
