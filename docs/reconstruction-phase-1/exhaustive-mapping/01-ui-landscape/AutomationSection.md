---
id: "automation-section"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/settings/AutomationSection.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Consumidor directo de API Rules (`useAutomation`)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Configurador Administrativo de Reglas de Reglas (Triggers)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestión de Múltiples Tipos de Payload (Cron, webhooks, Keywords)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AutomationSection

## 🎯 Propósito
Es el Editor Rule-Engine de la aplicación. Permite a los Admins instruir al backend con qué condición exacta (Trigger) debe despertar a la IA. Soporta despertar por Mensaje Normal, por Palabras Clave de Expresiones Regulares, por Webhooks Externos (Otros Sistemas pegándole al Chat), y por CronJobs de servidor.

## 📦 Estado y Datos
**Data-Grid Aplanada (`triggerRows`):**
Toma el crudo anidado (Reglas -> Triggers) y lo aplana artificialmente usando `useMemo()`. Transforma complejas estructuras JSON de Supabase en una Tabla Reactiva Visual Simple mapeando las políticas Crons o Webhooks.

## 🔄 Flujos de Interacción
1. **Formularios Dinámicos de Polimorfismo (`renderFormFields`):** Al elegir cambiar el `formType` del Trigger, destruye inputs antiguos e invoca campos especializados. Si es `schedule`, te pide zona horaria. Si es `webhook`, congela inputs advirtiendo sobre la auto-generación de un Token Secreto.
2. **Generador de Snippets de Códigos:** Cuando guardas un Webhook exitosamente, el backend te devuelve un ID. El componente renderiza instántaneamente un Bloque de Código falso de Terminal (`POST https://.../webhook/TOKEN`) ofreciéndote un botón "Copiar" que usa `navigator.clipboard`.

## 💡 Ejemplo de Uso
```tsx
// En la Pestaña "Ajustes" > Automatizaciones
<AutomationSection onBack={() => returnToSettingsMenu()} />
```
