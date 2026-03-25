---
id: "ai-status-header"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/conversations/AIStatusHeader.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Lee Hook Extensión para Bypass, Ejecuta Hook Automations" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tercera Marcha del Comportamiento Cognitivo (Rule Engine Switcher)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Botonería de Mutación Exclusiva, Early Return de Feature Flags" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 AIStatusHeader

## 🎯 Propósito
Es esa barra de tres botones miniatura alojada cerca de la caja de configuración de conversacion. Sirve como palanca analógica o acelerador de la Inteligencia Artificial dictando si debe: 1. Actuar Físicamente sola ('auto'). 2. Susurrarle sugerencias silenciosas al Humano para que presione enter ('suggest'). 3. Quedarse catatónica o sorda ante los clientes ('off').

## 📦 Estado y Datos
**Tolerancia Silenciosa:**
Hace una evaluación drástica al montarse. Lee todos tus plugins instalados (`installations`); Si se da cuenta de que siquiera tienes comprado el Plugin Oficial o App de Inteligencia (Ej: el `@fluxcore/asistentes`), ejecuta un `return null` borrándose por completo de la Interfaz Humana de la cuenta.

## 🔄 Flujos de Interacción
1. **Llamadas ciegas hacia el hook `useAutomation`:** Cuando clicas uno de los 3 botones en la botonera, mutas permanentemente la Base de Datos para esa cuenta dictando la política global que utilizará la IA de cara al público externo en la organización forzando al Dispatcher Interno del Servidor a reaccionar. 

## 💡 Ejemplo de Uso
```tsx
// En el panel derecho superior del Chat Inbox
<aside className="w-80">
  <UserProfileHeader />
  <AIStatusHeader accountId={currentId} />
</aside>
```
