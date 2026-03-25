---
id: "avatar-upload"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/profile/AvatarUpload.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Ataques API al Storage: `uploadAvatarAsset` y Mutación `updateAccountAvatar`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Componente Especializado en File/Binary Uploading de Perfiles" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Validación Lado Cliente (5MB, image/*), UI Overlay en Hover, Recuperación Fuerte (Zustand Cache Refresh)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📸 AvatarUpload

## 🎯 Propósito
Es el Envoltorio (Wrapper) inteligente encima del Dummy `Avatar`. Transforma un simple visualizador redondo en un botón colmado de animaciones Hover para instigar clicks. Captura del OS una foto a través de Inputs Ocultos y sincroniza la subida de Base de Datos y Storage.

## 📦 Estado y Datos
A diferencia del Avatar crudo, implementa mecanismos severos anti-race conditions (`isUploading`). Evita que impacientes toquen dos veces bloqueando el DOM y añadiendo un candado en memoria (`isMountedRef`) en caso de que alguien cierre el modal entes de que termine la API, para no fugar memoria de React.

## 🔄 Flujos de Interacción
1. **La Danza Estricta de la Subida (`handleFileChange`):**
   - Intercepta peso Cliente Puro (`> 5MB`).
   - Escanea el Store `useAccountStore` adivinando de forma violenta a qué entidad pertenece el usuario actual. Si Zuntand está vacío por fallos de red, invoca en el aire a un Refresco Total de Entidades con `loadAccounts()` antes de atreverse a subir el Asset.
   - Sube File -> Recibe un `assetId` Criptográfico -> Se lo acopla al perfil lanzando Evento Mutación (`updateAccountAvatar`).
   - Resetea silenciosamente la RAM temporal inyectándole al Estado Local la URL Final recién parida en lugar de forzar un F5 gigante.

## 💡 Ejemplo de Uso
```tsx
<AvatarUpload 
  currentAvatarUrl={url} 
  name="Harvan" 
  onUpload={(data) => console.log('Avatar Salvado', data)} 
/>
```
