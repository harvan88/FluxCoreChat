---
id: "welcome-view"
type: "smart-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/chat/WelcomeView.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Dispara Acciones de Redirección `setActiveActivity`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Empty State Masivo de Navegación" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Control UI Store para Abrir el Sidebar" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🏕️ WelcomeView

## 🎯 Propósito
PARTE DEL TOTEM "ESTADO VACÍO" (ViewPort Placeholder). Se pinta automáticamente en el lienzo central de la aplicación cuando no hay absolutamente ninguna Pantalla ruteada, ninguna conversación tocada, o ningún contacto seleccionado.
## 🧰 Props
- No recibe Props (React.FC puro montado bajo Enrutador o Vista Principal).

## 📦 Estado y Datos
100% Sin estados reactivos internos. Extrae `user.name` del Store global para personalizar el "Hola Juan", y llama ciegamente funciones Setter.

## 🔄 Flujos de Interacción
1. **Comandos de Escape (Botonería):** Tiene 3 Call-To-Actions principales (Explorar Conversaciones, Ver Contactos, Extensiones). Si pinchas cualquiera, obliga forzosamente a que el Sidebar escondido emerja disparando `setSidebarOpen(true)` y mueve la pastilla azul al panel correspondiente engañando a la App entera `setActiveActivity('extensions')`.

## 💡 Ejemplo de Uso
```tsx
{/* Si el URL es solo /chat sin ningun id: */}
{!matchContext ? <WelcomeView /> : <UnifiedChatView />} 
```
