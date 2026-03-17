# Implementación: Live Cognitive Pipeline (Telemetría de Soberanía)

Este documento detalla la implementación técnica del pipeline visual de trazabilidad completa, diseñado para monitorear el viaje de un mensaje desde su ingreso al Kernel hasta su entrega final.

## 🎯 **Objetivo Logrado**
Proporcionar transparencia absoluta sobre el procesamiento de mensajes, permitiendo verificar visualmente la **Soberanía de Runtime** y detectar cuellos de botella o fallos en tiempo real.

---

## 🏗️ **Arquitectura del Flujo**

### **1. Emisión (Backend)**
Se utiliza el `coreEventBus` para inyectar eventos de telemetría de forma no bloqueante en componentes clave del sistema:

| Nodo | Componente | Descripción |
| :--- | :--- | :--- |
| **Ingreso** | `ChatCoreGatewayService` | Entrada inicial del mensaje al sistema. |
| **Proyección** | `ChatProjector` | Ingesta del mensaje en el log de señales del Kernel. |
| **Worker** | `CognitionWorkerService` | Encolado y procesamiento por la lógica de cognición. |
| **Dispatcher** | `CognitiveDispatcherService` | Selección del runtime basado en la soberanía del usuario. |
| **Runtime** | `RuntimeGatewayService` | Ejecución de la IA y generación de la respuesta. |
| **Certificación** | `CognitionGatewayService` | Validación y firma de la respuesta por el Kernel. |
| **Entrega** | `MessageCore` | Salida del mensaje hacia los canales de distribución. |

### **2. Transmisión (WebSocket)**
El `ws-handler.ts` actúa como puente:
- Escucha eventos `telemetry:pipeline_step` del bus interno.
- Filtra y retransmite únicamente a clientes suscritos con el rol `kernel_console`.
- Requiere autenticación via JWT y vinculación a un `accountId` válido.

### **3. Visualización (Frontend)**
El componente `VisualPipeline.tsx` consume el stream:
- Conexión WebSocket dedicada con handshake autenticado.
- Estado reactivo que agrupa eventos por `messageId`.
- **Semáforo Visual**: Gris (Pendiente), Amarillo (Procesando), Verde (Éxito), Rojo (Error).
- **Verificación de Soberanía**: Extracción y resaltado de `runtimeId` y latencias.
- **Utilidades**: Copiado persistente al portapapeles (JSON completo) y limpieza de trazas.

---

## 📊 **Especificación de Eventos**

### **Payload del Evento**
```typescript
{
  messageId: string;       // ID único de trazabilidad
  conversationId: string;  // Contexto de la charla
  step: string;            // Uno de los 7 nodos definidos
  status: 'pending' | 'processing' | 'success' | 'error';
  metadata?: {
    runtimeId?: string;    // Crucial para Soberanía
    latency?: number;      // Tiempo de ejecución en ms
    model?: string;        // Modelo específico usado
    error?: string;        // Detalle en caso de fallo
  };
  timestamp: string;      // ISO format
}
```

---

## 🛠️ **Funcionalidades de la Interfaz**

### **Semáforo de Estados**
- **Connected/Disconnected**: Estado real de la conexión con el stream de telemetría.
- **Indicadores Animados**: Los nodos en proceso muestran un spinner de carga y pulsan las líneas conectoras.
- **Alertas Críticas**: Los fallos en el pipeline activan indicadores rojos con animación de "ping" y muestran el reporte del error técnico.

### **Gestión de Datos (Clipboard)**
- **Copy Trace**: Botón individual en cada mensaje para extraer el JSON técnico completo de la traza.
- **Copy All**: Funcionalidad para exportar el estado actual de todas las trazas capturadas en la sesión.

---

## ✅ **Validación de la Implementación**
- [x] Inyección silenciosa en Backend (Fase 1)
- [x] Transmisión segura via WebSocket (Fase 2)
- [x] Renderizado dinámico en Kernel Console (Fase 3)
- [x] Soporte para multitenancy (Filtrado por `accountId`)
- [x] Herramientas de extracción de datos (Clipboard)

---

*Última actualización: 2026-03-16*
*Estado: **Producción / Live***
