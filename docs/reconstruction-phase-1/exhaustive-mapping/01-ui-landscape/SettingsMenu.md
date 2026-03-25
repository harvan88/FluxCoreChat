---
id: "settings-menu"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/settings/SettingsMenu.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Acoplado a Tabs-Context del `usePanelStore`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Indice Vertical Principal de Configuraciones" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Filtrado Basado en Permisos (Credits), Extractor Activo de TabStore" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ SettingsMenu

## 🎯 Propósito
La brújula (Índice lateral) de la interfaz de Ajustes Universales. Sirve como listado de opciones (Perfil, Cuentas, Privacidad, Kernel). **NO** dibuja los paneles, únicamente invoca el store de layout (`openTab`) enviando qué panel debería dibujarse a la derecha.

## 📦 Estado y Datos
**Guardaespaldas de Facturación:**
- Vigila asiduamente el JSON del Login (`useAuthStore`). Comprueba si la llave estática de Scopes dice `user?.systemAdminScopes?.['*']` o `credits` para mutar visualmente el Menú impidiendo que empelados sin rango vean la pestaña de Créditos del workspace.

## 🔄 Flujos de Interacción
1. **Radar de Pestaña Activa:** Es extremadamente introspectivo. Se pone a escanear `layout.containers.tabs` de todo el estado global para descubrir si alguna pestaña "Settings" está activa en el port, y solo sí lo está, prende su estado `active` remarcando la pastilla al usuario en SidebarNavList.

## 💡 Ejemplo de Uso
```tsx
import { SettingsMenu } from '../../components/settings/SettingsMenu';

// Renderizado usual dentro del Sidebar izquierdo en modo Settings
<SettingsMenu />
```
