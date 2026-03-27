---
id: "AssetPreview"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/chat/AssetPreview.tsx"
---

# 🤖 AssetPreview

## 🎯 Propósito
Este componente es el encargado de visualizar y permitir la interacción con activos (assets) de cualquier tipo (imágenes, video, audio y documentos) dentro de la interfaz de chat de ChatCore y perfiles públicos de FluxCore.

## 📐 Arquitectura e Interacción
Se comporta como un componente inteligente que gestiona su propio estado de carga para obtener URLs firmadas temporales.
- **Seguridad en Identidad:** Maneja casos en los que el actor no está autenticado (perfil público) utilizando las props `viewerActorId`, `viewerActorType` y `accountId`.
- **Protección de Errores:** Incluye lógica preventiva para nunca enviar IDs vacíos (`""`) al backend y gestiona fallos de firma transitorios durante la inicialización de la sesión del visitante sin interrumpir la experiencia de usuario.
- **Network Awareness:** Utiliza `fixLocalhostUrl` para transformar automáticamente las URLs de `localhost` a la IP local de la red (ej: `192.168.0.x`) cuando se accede desde dispositivos móviles en modo desarrollo.
- **Funcionalidades UI:**
    - **Imágenes:** Previsualización con Lightbox integrado al hacer clic.
    - **Multimedia:** Soporte nativo de `video` y `audio`.
    - **Documentos:** Icono representativo por tipo de archivo y enlaces de descarga seguros.

## 💡 Ejemplo de Uso
Renderizado de una imagen en un perfil público (actor visitante):
```tsx
<AssetPreview
    assetId="f07f52c0-3fed-4398-b9c0-bba2befd8987"
    accountId="520954df-cd5b-499a-a435-a5c0be4fb4e8"
    viewerActorId="8f57db0d-902f-4c99-a1fd-bc424bfff007"
    viewerActorType="visitor"
    name="foto-perfil.jpg"
    mimeType="image/jpeg"
/>
```

## 💡 Estados y Datos
**Hooks utilizados:**
- `useState`: Gestiona `signedUrl`, `loading`, `error` y el estado del `lightbox`.
- `useCallback`: Memoriza la función `fetchSignedUrl` para evitar re-renderizados innecesarios.
- `useEffect`: Dispara automáticamente la carga de la URL para imágenes y assets que requieren previsualización inmediata.

**Propiedades Clave:**
- `assetId`: ID único del recurso en el registro.
- `viewerActorId`: ID del actor que está visualizando (puede ser un visitante anónimo).
- `viewerActorType`: Tipo de actor (`user` | `visitor` | `assistant`).
- `accountId`: ID de la cuenta dueña del recurso.

## 🚥 Rutas Principales
- **`POST /:assetId/sign`**: Genera una URL firmada temporal.
```bash
# Ejemplo de firma para un visitante
curl -X POST http://localhost:3000/api/assets/ID-ASSET/sign \
     -H "Content-Type: application/json" \
     -d '{
       "actorId": "visitante-123",
       "actorType": "visitor",
       "action": "preview"
     }'
```

- **`POST /upload-session`**: Inicia carga.
- **`POST /confirm-upload`**: Finaliza registro.

## 🔗 Dependencias
- **ApiService (`api`):** consume el endpoint `/api/assets/:id/sign`.
- **fixLocalhostUrl:** utilidad para resolución de redes locales.
- **Lucide-React:** set de iconos para representaciones visuales.
