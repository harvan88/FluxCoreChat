---
id: "invite-collaborator"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/workspace/InviteCollaborator.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Consumidor directo de API accounts y Stores" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Buscador y Creador Bimodal de Invitaciones" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Selectores Radio para Roles (Admin/Operator/Viewer) y debounce asíncrono" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 InviteCollaborator

## 🎯 Propósito
(FC-824). Proveer una experiencia fluida multi-vía al dueño de un espacio compartido para anexar a sus compañeros. Maneja dos flujos opuestos: Búsqueda Nativa Intramuros (Busca @alias o Nombres en la red actual disparando el autocompletado) contra Búsqueda Primitiva SMTP (Solo clava un Mail ciego y dispara). Posteriormente forja la Autorización (El Rol de poder).

## 📦 Estado y Datos
**Matriz de Selección Transitoria:**
- Mantiene tableros de String dependenciales `searchQuery` emparejado con arreglos `Account[]` provenientes del servidor y el booleano `mode` para matar y resucitar mitades de la App en pantalla.
- Guarda el estado final hermético del poder concedido `selectedRole`. 

## 🔄 Flujos de Interacción
1. **Deflector Reductor de Peticiones (`handleSearch`):** Es una mirilla asíncrona controlada. Dispara una petición Fetch `accountsApi.searchUsers(query)` SI Y SOLO SI la cadena es matemáticamente mayor a 2 letras, bloqueando congestiones ridículas de peticiones contra carácteres únicos como "a". Renderiza Grillas Inferiores mapeando Iniciales en redondeles de Tailwind con Alias descriptivos a su costado.
2. **Generador Mutativo de Credenciales Falsas Fallback:** Si halla el individuo registrado internamente ("Search mode"), como es un prototipo local que quizás no empaqueta Mails verdaderos en este flujo en desarrollo asume agresivamente y concadena su string `@fluxcore.local`, disparándolo a la base de datos subyacente del Redux global `createInvitation(wksId, alias@..., Role)`.
3. **Renderizado de Radio Buttons Simulados:** Es un experto generador UI. Oculta el verdadero "círculo feo input HTML" con un `className="sr-only"`, y dibuja su propio botón masivo inmerso con Iconografías mutables donde los bordes celestes (`border-accent`) denotan dominancia del array local permitiendo lectura de descripciones inferiores de poder para "Operador" o "Viewer".

## 💡 Ejemplo de Uso
```tsx
import { InviteCollaborator } from '../../components/workspace/InviteCollaborator';

<Modal isOpen>
  <InviteCollaborator 
     workspaceId="wk_pago_99" 
     onSuccess={closeAndCelebrate}
  />
</Modal>
```
