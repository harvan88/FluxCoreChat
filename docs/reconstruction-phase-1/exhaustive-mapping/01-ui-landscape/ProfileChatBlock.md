---
id: "profile-chat-block"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/public-profile/components/blocks/ProfileChatBlock.tsx"
---

# 🤖 ProfileChatBlock

## 🎯 Propósito
Es el orquestador principal de la interfaz de chat en perfiles públicos. Su función es unificar la lógica de mensajería (WebSockets, estado local) con la visualización, permitiendo una transición fluida entre el modo de visitante anónimo y el modo de usuario autenticado. Actúa como el proveedor de contexto de identidad para toda la cascada de componentes de mensajería inferior.

## 💡 Ejemplo de Uso
```tsx
<ProfileChatBlock 
  alias="mi-asistente" 
  profile={activeProfileData} 
  accountId="acc_789" // (Opcional si es autenticado)
/>
```

## 🧩 Características Clave
- **Dualidad de Identidad:** Maneja sesiones públicas (`publicSession`) junto con sesiones autenticadas, resolviendo correctamente el `visitorActorId` en el frontend.
- **Provider de Mensajería:** Utiliza los hooks `useChatUnified` y `useWebSocket` para centralizar la gestión de mensajes en tiempo real.
- **Cascada de Contexto:** Inyecta en cada `MessageBubble` la identidad necesaria para que componentes como `AssetPreview` puedan firmar URLs de archivos de forma segura sin requerir una autenticación de usuario estándar.

## 📊 Estado y Datos
- **Contexto de Sesión**: Deriva el `visitorActorId` del `publicSession` inicializado por el hook de chat unificado.
- **Modos de Operación**: `isPublicMode` (true si no hay `accountId`) activa la inyección de la identidad del visitante (`visitor`) en la renderización del historial.

## 🔄 Flujos de Interacción
1. **Inicialización**: Resuelve la sesión del perfil público y obtiene el token de visitante.
2. **Propagación**: Al iterar sobre el historial de mensajes, inyecta `viewerActorId={publicSession?.visitorActorId}` y `viewerActorType='visitor'` en los componentes de burbuja.
3. **Seguridad de Assets**: Al pasar esta identidad hacia abajo, permite que las imágenes (avatares, adjuntos) se rendericen correctamente invocando el servicio de firma con el rol de visitante autorizado.

## 🔗 Dependencias
- **Mensajería**: Consume `MessageBubble`, `PublicProfileComposer`, `ChatComposer`.
- **Integración**: Depende de `useChatUnified` para el control de sesiones públicas.
- **Hardware**: Implementa cálculos de viewport específicos para mobile para mitigar problemas de altura en navegadores móviles.
