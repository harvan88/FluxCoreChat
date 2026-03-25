---
id: "avatar"
type: "ui-component"
status: "stable"
criticality: "low"
location: "apps/web/src/components/ui/Avatar.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Ninguna" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "UI Primitive - Sistema Universal de Representación de Entidades" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Cálculo Matemático de Colores (Hash), Fallback de Errores de Imagen" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 👤 Avatar & AvatarGroup

## 🎯 Propósito
El bloque constructivo universal para pintar una persona o robot. Es altamente resiliente. Si no pasas imagen, dibuja iniciales. Si pasas una URL rota, atrapa el `onError` e ignora el enlace. Si le pasas un estatus, dibuja un diminuto semáforo online/offline amarrado a sus tobillos CSS.

## 📦 Props
```typescript
interface AvatarProps {
  src?: string;      // URL de la imagen
  alt?: string;      // Texto alternativo
  name?: string;     // Nombre para generar iniciales
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'; // Tamaño (default: 'md')
  status?: 'online' | 'offline' | 'busy' | 'away'; // Indicador de estado
  shape?: 'circle' | 'square';  // Forma (default: 'circle')
  bgColor?: string;  // Color de fondo personalizado
}

interface AvatarGroupProps {
  children: React.ReactNode;   // Avatares a agrupar
  max?: number;               // Máximo visible (default: 5)
  size?: AvatarSize;          // Tamaño para el círculo residual
  spacing?: 'tight' | 'normal' | 'loose'; // Espaciado (-space-x-X)
}
```

## 🔄 Flujos de Interacción
1. **El Motor Hashing de Colores (`getColorFromName`):** Para evitar que las Iniciales siempre tengan fondo Gris, rompe el string "Maria", suma matemáticamente los caracteres (`charCodeAt`) y usa Módulo Mágico para que "Maria" siempre caiga en color `#bg-pink-500` mientras viva, asegurando una estética brillante.
2. **Apilamiento Z-Index Invertido (`AvatarGroup`):** Exporta adicionalmente el componente hermano `AvatarGroup` que superpone visualmente n Avatares con técnica de Margen Negativo (`-space-x-3`) asegurando recortar limpiamente. Excesos de avatares convergen en el círculo residual genérico `+5`.

## 💡 Ejemplo de Uso
```tsx
<Avatar src={user.photoUrl} name="Juan Perez" size="xl" status="online" />

<AvatarGroup max={3}>
  <Avatar name="A" />
  <Avatar name="B" />
  <Avatar name="C" />
  <Avatar name="D" />
</AvatarGroup>
```
