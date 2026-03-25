---
id: "settings-panel"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/settings/SettingsPanel.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Despachador universal de configuraciones (Profile, Automation, etc)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Menu Raíz de Preferencias de la Aplicación" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "State simple tipo Drill-down menu" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 SettingsPanel

## 🎯 Propósito
El HUB orquestador de toda configuración interna del usuario. Presenta una interfaz Drill-down (Estilo iOS) donde se inyecta por defecto un menú de raíces jerárquicas ("Perfil", "Aparencia") y al interactuar, rutea su estado interno para renderizar o encajar las pantallas submódulos (ej: ProfileSection). Su ventaja es limpiar la complejidad sin usar React Router puro.

## 📦 Estado y Datos
**Estado Navigador Fijo:**
- Su espina dorsal es la constante de estado `activeSection` que oscila entre distintos strings duros encriptados en tipo (ej: `'menu' | 'profile' | 'accounts'`). 

## 🔄 Flujos de Interacción
1. **Renderer Mutante:** Usa un patrón `renderContent` bajo declaración Switch Case. Si presiono "Perfil", retorna un SubComponente delegando el boton onBack para rebobinar un paso atras seteando `setActiveSection('menu')`.
2. **Contexto de Sesión Fija:** Muestra información perpetua encima bajo cualquier switch state (Foto miniatura del usuario, Alias actual, tipo de cuenta) absorbiendo `activeAccount` de Zustand global.

## 💡 Ejemplo de Uso
```tsx
import { SettingsPanel } from '../../components/settings/SettingsPanel';

// Usually rendered as an isolated tab or modal view
<SettingsPanel />
```
