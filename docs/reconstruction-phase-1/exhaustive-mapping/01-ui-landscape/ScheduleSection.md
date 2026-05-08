---
id: "ScheduleSection"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/settings/ScheduleSection.tsx"
---

# 🤖 ScheduleSection

## 🎯 Propósito
Página principal de configuración de horarios dentro del panel de Ajustes. Orquesta la visualización de todas las sedes asociadas a la cuenta y proporciona el punto de entrada para editar la disponibilidad de cada una.

## 💡 Ejemplo de Uso
```tsx
// Renderizado automático dentro de SettingsTabContent para el case 'horario'
<ScheduleSection />
```

## 🔄 Flujos de Interacción
1. **Detección de Multi-sede**: El componente recupera todas las sedes de la cuenta mediante `useLocations`.
   - Si existe una única sede, se muestra expandida por defecto.
   - Si existen múltiples sedes, se agrupan en secciones colapsables (`CollapsibleSection`) para facilitar la navegación.
2. **Previsualización Rápida**: Utiliza `ScheduleSummary` para mostrar un resumen del estado actual de cada sede antes de entrar en modo edición.
3. **Modo Edición Contextual**: Al activar la edición en una sede, inyecta el `ScheduleEditor` con el `ownerId` correspondiente.

## 🛡️ Notas Arquitectónicas
- **Layout Estandarizado**: Utiliza `ViewHeader` para mantener la coherencia visual con el resto de las secciones de ajustes de FluxCore.
- **Validación de Prerequisitos (D9)**: Verifica reactivamente la existencia de una zona horaria configurada en la cuenta (`currentAccount.timezone`). Gracias a `useContextSync` y `useProfile`, esta validación se mantiene sincronizada en tiempo real tras actualizaciones del perfil o cambios de contexto vía URL.
