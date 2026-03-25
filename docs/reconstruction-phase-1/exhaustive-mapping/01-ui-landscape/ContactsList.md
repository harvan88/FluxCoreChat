---
id: "contacts-list"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/contacts/ContactsList.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Lectura robusta del API Rest de Relationships" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Árbol generador de Nuevos Chats" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Modal enlazado de búqueda API / AddAccount" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 ContactsList

## 🎯 Propósito
Es el Directorio de la Libreta de Direcciones (Address Book). Actúa comúnmente como un panel lateral principal dentro de la interfaz global, brindando acceso directo y rápido a todas las Relaciones comerciales o personales (B2B, B2C) de la Cuenta Seleccionada. Facilita la cacería de perfiles vía Búsqueda Local o la instanciación de nuevas salas de chat saltando la barrera hacia la vista de `Conversations`.

## 📦 Estado y Datos
**Acople Zustand y Servidor (`useUIStore` y `api`):**
- Absorbe `selectedAccountId` del Panel Principal.
- Pide al backend (`api.getRelationships`) un listado completo.
- Cache en Memoria: Emplea la bandera heurística `hasLoaded` para impedir tormentas de re-renders innecesarias (Throttling artificial asincrónico), reseteada obligadamente mediante Side-effect si el `selectedAccountId` permuta.

## 🔄 Flujos de Interacción
1. **Orquestador De Nuevos Flujos Chat:** Al hacer "Click" sobre un Contacto expuesto, este detiene el Thread y valida si ese Par de Actores ya tienen un Chat alojado en `conversations[]` (Del Store General). Si existe, permuta mágicamente el Layout de la APP redirigiendo mediante `openTab('chats')`. **Caso contrario:** Lanza un ping bloqueante con Spinner Overlay `api.createConversation` ordenando al servidor que construya la sala primero para luego forzar su carga.
2. **Recreación de Botones de Confirmación Custom:** Emplea una mecánica inline de "Doble Confirmación" cruda sin recurrir al componente global (Usando `confirmDeleteId` cruzado con el Iterador del Loop Array). Para evadir colisiones destructivas hace un `e.stopPropagation()`.
3. **Búsqueda Remota (AddContactModal):** Al pedir agregar un contacto, levanta un Overlay masivo. Este implementa un *Debounce de Búsqueda de 300ms* previniendo saturación de red a medida que el usuario tipeé Alias o Correos. Permite vincular identidades ajenas hacia relaciones propias (`api.addContact(mia, de_el)`).

## 💡 Ejemplo de Uso
```tsx
import { ContactsList } from '../../components/contacts/ContactsList';

// Habitualmente instanciado sin props porque usa Zustand Stores subyacentes
<SidebarTabs tab="contacts">
   <ContactsList />
</SidebarTabs>
```
