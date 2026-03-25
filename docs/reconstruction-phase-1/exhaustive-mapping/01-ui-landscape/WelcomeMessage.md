---
id: "welcome-message"
type: "smart-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/onboarding/WelcomeMessage.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Maneja Lógica de LocalStorage `FIRST_TIME_KEY`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Onboarding y Asistente Flotante 1st Run" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Carrousel Hard-codeado, Botones de Quick-Action Píldora" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 👋 WelcomeMessage (FC-840, FC-841, FC-843)

## 🎯 Propósito
Trinidad de componentes unificados para el "Día cero" del Nuevo Usuario. 
1. `WelcomeMessage`: Una burbuja de chat falsa del Bot de bienvenida.
2. `FirstTimeExperience`: Modal gigante escuro con 4 pasos (Welcome -> Chats -> Team -> Extensiones).
3. `FluxCoreAvatar`: El iconito re-utilizable del bot asistente que brilla `bg-gradient-to-br`.

## 📦 Estado y Datos
**Flag de Memoria Persistente (`useFirstTimeExperience`):**
- Intercepta el navegador apenas arranca preguntando `localStorage.getItem('fluxcore_first_time')`. Decide si arrojarle el modal de bienvenida incesante hasta que pinche al último paso gatillando la flag sanadora `markAsCompleted`.

## 🔄 Flujos de Interacción
1. **Motor de Carrousel Casero:** La FirstTimeExperience maneja un local state `step` (0 al 3) iterando sobre el Array `steps` mapeando título, icono (`lucide-react`) y descripción.

## 💡 Ejemplo de Uso
```tsx
const { isFirstTime, markAsCompleted } = useFirstTimeExperience();

if (isFirstTime) {
  return <FirstTimeExperience onComplete={markAsCompleted} />;
}
```
