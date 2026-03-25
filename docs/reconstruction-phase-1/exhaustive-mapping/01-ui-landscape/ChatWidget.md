---
id: "chat-widget"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/widget/ChatWidget.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Conexión directa mediante WS Raw sin middlewares clásicos" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Componente PWA incrustable public-facing" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Proceso de Fallack Tokenizado B2C y reconexiones WS" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 ChatWidget

## 🎯 Propósito
Esquina comercial de Atención al Público (Customer Service Chat Widget). Diseñado de manera cuasi-autónoma para abstraerse de FluxCore y ser inyectable en Portales Web de los clientes o perfiles públicos. Al ser expuesto hacia público desconocido en internet (no registrado al sistema), omite por completo los hooks nativos tipo `useAuth` y ejecuta su propia lógica espartana de Red construyendo un puente de WebSocket Desnudo para empadronar a los huéspedes.

## 📦 Estado y Datos
**Aislamiento y Anonimidad:**
- Dispara `getOrCreateVisitorToken()` infiriendo un UUID primitivo guardado permanentemente en la Memoria del Explorador local del cliente anónimo previniendo que la página se desconecte entre recargas.
- Se sustenta en un React State independiente y lineal: Arreglo puro `messages`, string `inputValue`. Boóleanos duros `isConnecting` y `isConnected`.

## 🔄 Flujos de Interacción
1. **WebSocket Handshake en Frío:** Cuando el botón de chat es oprimido la primera vez (`isOpen=true`), desencadena el efecto `connect()` de manera asíncrona apuntando a `WIDGET_WS_URL`. Construye de inmediato el túnel enviando parámetros query estáticos (`?alias=XYZ&visitor=Token`).
2. **Registro Multi-Actor B2B/B2C (Crossover):** Tras abrirse el túnel, emite un dictamen forzado de `{"type": "widget:connect"}` al servidor incluyendo un `userAccountId` Opcional. Esta lógica dual le permite al backend inferir si se trata de un humano de la calle anónimo temporal B2C (visitorToken), o cruzar las tablas de identidad si ese humano inició sesión en el Frontend de Comercio ajeno B2B (Mapeo entre Cuentas).
3. **Mensajería Optimista con Certificación:** Al oprimir Enter, inyecta visualmente en pantalla en `setMessages` un clon simulado crudo local del mensaje (Optimistic UI) para que se perciba sin retardo, y posteriormente lanza un stream `wsRef.current.send` a través de JSON embutiendo los TenantIDs e información confidencial, siendo el `chatcore-webchat-gateway` en el backend el responsable final de indexarlo y guardarlo.
4. **CSS Shadow Dome Inline:** En un esfuerzo por evadir colisiones de estilos al ser importado como Script Módulo Remoto en webs de clientes, todo su recubrimiento y ventanas pop up, inputs y botones emplean diccionarios React puramente primitivos con llaves PascalCase en línea (Ej. `style={{ position: 'fixed', borderRadius: '1rem', backgroundColor: '#0d0d0d' }}`).

## 💡 Ejemplo de Uso
```tsx
import { ChatWidget } from '../../components/widget/ChatWidget';

// Instalado al fondo del HTML del cliente
<ChatWidget 
    alias="meetgar-sales" 
    tenantId="acc_001A"
    primaryColor="#ff5522" 
    greeting="Hola, estás contactando con ventas de MeetGar" 
/>
```
