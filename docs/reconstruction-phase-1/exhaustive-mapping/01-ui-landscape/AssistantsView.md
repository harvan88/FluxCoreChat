---
id: "assistants-view"
type: "smart-component"
status: "stable"
criticality: "critical"
location: "apps/web/src/components/fluxcore/views/AssistantsView.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Orquestador de 6+ Hooks Core (Assistants, VectorStores, Tools, Instructions)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Controlador Root del IDE FluxCore Fase IA (CRUD Master)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Manejo Debounced Timeouts para Autoguardados, Sincronización DB/UI Deep Payload" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🧠 AssistantsView

## 🎯 Propósito
Este es el monstruo arquitectónico. En lugar de crear un espagueti, asume el control global tipo "God Mode" anclando estados, conectando listas (`AssistantList`) con sus detalles (`AssistantDetail`), dictaminando Autoguardados Silenciosos, controlando ventanas pop-up modales ("Runtime Selector"), y manteniendo un Check de Auditoria Estricta (UI vs BBDD). 

## 📦 Estado y Datos
**La Trinidad del Estado (`localSelectedAssistant`, `localSelectedRef`, `saveTimeoutRef`):**
Mantiene la memoria simultáneamente en 3 cajas de tiempo, el Hook oficial re-rederiza la pantalla; el Ref sobrevive al ciclo atajando el último tipeo evitando carreras fantasmas y perdiendo latidos del usuario, mientras el Threshold Timeout ejecuta el "Dispara API" con un buffer de 500 milisegundos de gracia (Debounce guardado manual del usuario mientras teclea). 

## 🔄 Flujos de Interacción
1. **Danza de Rutas (Tab Routing `handleSelect`):** Es tan avanzado que no navega páginas. Al dar Clic empuja un evento JSON hiper denso conteniendo el ADN de la inteligencia a los `usePanelStore` del Layout, creando instantáneamente mini pestañas de IDEs visuales sin parpadear.
2. **El Exterminador de Basura (`buildAssistantPayload`):** En APIs severamente tipadas como Supabase, mandar metadatos raros destruye el PUT. Así que él limpia quirúrgicamente todos los valores muertos o indefinidos.
3. **Persistance Check Auditor (`handleCopyActiveConfig`):** Cuando clicas Exportar, no solo descaga. Baja lo que tenga el Root Node DB, hace Deep-Merge validando Boolean por Boolean tus configuraciones temporales de Frontend, y arroja un log gigante de la Verdad Absoluta "UI vs DB Match" directo a tu Portapapeles SO como herramienta élite de Debugging Técnico.

## 💡 Ejemplo de Uso
```tsx
<Route path="assistants" element={<AssistantsView accountId={user.account} />} />
```
