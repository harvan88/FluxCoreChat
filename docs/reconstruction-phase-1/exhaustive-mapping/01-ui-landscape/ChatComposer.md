---
id: "chat-composer"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/chat/ChatComposer.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-23", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-23", confidence: 100, notes: "Lectura profunda de Extensions Store" }
  subsystem: { status: "complete", completed_date: "2026-03-23", confidence: 100, notes: "Patrón Proxy / Switcher de inyección" }
  operations: { status: "complete", completed_date: "2026-03-23", confidence: 100, notes: "Passthrough props" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 ChatComposer

## 🎯 Propósito
Actúa estrictamente como un Repartidor (Component Proxy / Switcher) para la Barra de Composición Inferior de la línea de mensajería (El Textbox donde el Humano escribe para mandar a la API de WS). Su responsabilidad única concierne en detectar en tiempo real si el Tenant seleccionado tiene comprado, instalado e implantado los poderes del Módulo "@fluxcore/asistentes". De ser cierto, enmascara el composer básico retornando una versión superior cargada con atajos de Inteligencia Artificial (`FluxCoreComposer`); de lo contrario revierte a `StandardComposer`.

## 📦 Estado y Datos
**Conexión Dinámica de Store Local:**
- Importa `useExtensions` para recuperar bajo el microscopio virtual el Tenant activo temporal (`accountId`) escaneando en profundidad la matriz de `installations`.

**Data Pass-Through (Tubería de Props):**
- Recibe un objeto denso prop-drilling complejo por parte del padre (Eventos `onUserActivity` de grabación y tipeo en red, callbacks de envío asíncrono, variables Reactivas de progresión de subida de Media S3, etc). En vez de modificarlas, este interceptor transfiere 1 a 1 estas referencias (`{...props}`) a los Componentes Hijos correspondientes resolviendo de forma limpia la Inversión de Control.

## 🔄 Flujos de Interacción
1. **Interruptor Dinámico en Frío:** Escanea imperativamente el Store invocando la constante de flag `isFluxCoreEnabled` por un `.some(id=x && enabled)`.
2. **Despliegue de Rutas Físicas (Inyección):** Re-direcciona el árbol VDOM final a `<StandardComposer>` o `<FluxCoreComposer>`. Todas las mutaciones asíncronas transcurren abajo en el componente final sin perturbar el Orquestador Virtual Interceptor por razones limpias de Diseño de Software SOLID.

## 💡 Ejemplo de Uso
```tsx
import { ChatComposer } from '../../components/chat/ChatComposer';

// Inyectado al fondo de la vista de conversaciones
<div className="absolute bottom-0 relative layout">
   <ChatComposer 
     value={text}
     onChange={setText}
     onSend={dispatchWs}
     isSending={networkBlocker}
     uploadAsset={apiUploader}
   />
</div>
```
