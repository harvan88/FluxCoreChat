---
id: "layout"
type: "smart-component"
status: "stable"
criticality: "critical"
location: "apps/web/src/components/layout/Layout.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Integra ToastStack, Sidebar, ActivityBar, ViewPort, Stores" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Bóveda Principal (Shell) del IDE vs Mobile Drawer" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Mutación absoluta dependiendo de useMediaQuery y Stores de UI" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 Layout

## 🎯 Propósito
Es el "Shell Component" maestro de toda la aplicación. Establece de forma definitiva el patrón estructural tipo VS Code o IDE de escritorio. Es responsable de interceptar el tamaño de la pantalla y mutar agresivamente su código subyacente entre dos arquitecturas totalmente distintas: Un GridLayout de columnas fijas en Desktop, frente a un Drawer asincrónico (Menú Hambuguesa) y encabezado fijo en formato Mobile.

## 📦 Estado y Datos
**Sensor Perimetral Ciego:**
- Usa `useIsMobile()` (basado en medias queries nativas) y lo dispara violentamente hacia el store Redux/Zustand global `setIsMobile(isMobileViewport)` permitiendo que otros nodos hijos más profundos entiendan la mutación física de pantalla sin heredar Props.

## 🔄 Flujos de Interacción
1. **Dicotomía de Layout (Desktop vs Mobile):** Si el hook dictamina que el usuario goza de pixeles, vomita un string inmutable flex (`ActivityBar + Sidebar + ViewPort`) impidiendo scroll en el body (`h-screen overflow-hidden`). Si padece de espacio en Mobile, esconde la ActivityBar convirtiéndola en un Listado Drawer que nace de un botón Hambuguesa superpuesto (`z-50`).
2. **Inyector Atmosférico (Temas):** Acapara la carga del `useThemeStore` y clava de forma imperativa en `document.documentElement` el atributo final (`data-theme="dark/light"`) rigiendo todo el árbol DOM por debajo.
3. **Listener Ciego de Cuenta:** Dispone de un EventListener vacío esperando `account:changed`, probando que funciona como ancla para forzar un re-tree cuando el usuario salta de perfiles radicalmente distintos, permitiendo a react descartar estados viejos de variables.

## 💡 Ejemplo de Uso
```tsx
import { Layout } from '../../components/layout/Layout';

// Dentro de App.tsx / Router
<ProtectedRoute>
  <Layout />
</ProtectedRoute>
```
