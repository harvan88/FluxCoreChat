---
id: "theme-toggle"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/common/ThemeToggle.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Acoplado a zustand themeStore" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Variables CSS Night / Day" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tres Variantes de Renderizado" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🎨 ThemeToggle

## 🎯 Propósito
Centralizar la forma en que los usuarios mutan la apariencia de toda la interfaz (`claro`, `oscuro`, `sistema`). Su magia radica en tener **Variantes de UI**, lo que significa que el mismo código soporta renderizarse como un grupo de botones (Action bar), un Dropdown select o un simple botón estático de sol/luna, evitando replicar código de Zustand.

## 📦 Estado y Datos
**Zustand Binder:**
- Envuelve el store `useTheme()` extrayendo `theme`, `setTheme` y `resolvedTheme`. Este último descifra si 'sistema' significa verdaderamente dark o light en el SO del Cliente.

## 🔄 Flujos de Interacción
1. **Polimorfismo UI:** Usa el atributo estricto `variant`. Si declaras `'select'`, ignora los botones y vomita un HTML5 `<select>` natural. Si declaras `'simple'`, abstrae los listeners y devuelve el clásico icono solitario tipo Toggle Switch.

## 💡 Ejemplo de Uso
```tsx
import { ThemeToggle } from '../../components/common/ThemeToggle';

// En el footer (chico)
<ThemeToggle variant="buttons" size="sm" showLabels={false} />

// En perfil principal
<ThemeToggle variant="select" />
```
