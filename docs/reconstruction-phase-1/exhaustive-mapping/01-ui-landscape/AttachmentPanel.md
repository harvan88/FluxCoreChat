---
id: "attachment-panel"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/chat/AttachmentPanel.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Sin mutaciones. Dispara Callbacks estáticos." }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Menú Popover de Inserción de Multimedia (Whatsapp-Like)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Posicionamiento Absolute Flotante Bottom-Full, Mapeo Grid Configurable" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📎 AttachmentPanel

## 🎯 Propósito
Es el "Clip" o menú despegable que aparece cuando el operador de chat desea invocar poderes especiales. Dibuja y empaqueta en una grilla perfecta opciones como Solicitar Cámara, Enviar Documento, Compartir Localización, o Disparar Respuestas Rápidas (Macros).

## 📦 Props
```typescript
interface AttachmentPanelProps {
  open: boolean;                 // Control de visibilidad
  onClose: () => void;           // Callback para cerrar el panel
  onSelect: (action: AttachmentAction) => void; // Callback al elegir una acción
}

// AttachmentAction: 'document' | 'camera' | 'gallery' | 'audio' | 'receipt' | 'location' | 'quick_reply' | 'contact'
```

## 🔄 Flujos de Interacción
1. **Flotación Magnética CSS (`bottom-full mb-2`):** No utiliza Modales JS de Portal o HeadlessUI carísimos. Depende que su Componente Padre Composer tenga `relative`, el panel simplemente crece hacia el cielo empujando los límites del Chat gracias al DOM nativo del Navegador.

## 💡 Ejemplo de Uso
```tsx
<AttachmentPanel 
  open={isClipClicked} 
  onClose={() => setIsClipClicked(false)} 
  onSelect={(actionId) => handleFeature(actionId)} 
/>
```
