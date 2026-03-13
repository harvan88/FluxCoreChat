# Component Library - FluxCore

**Versión:** 1.0.0  
**Fecha:** 2024-12-08  
**Issues:** FC-404 a FC-407, FC-416

## 📋 Índice

1. [Introducción](#introducción)
2. [Principios de Diseño](#principios-de-diseño)
3. [Componentes Disponibles](#componentes-disponibles)
4. [Guía de Uso](#guía-de-uso)
5. [Sistema de Colores](#sistema-de-colores)
6. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

La Component Library de FluxCore es un sistema de componentes predefinidos que garantiza:

- ✅ **Consistencia visual** en toda la aplicación
- ✅ **Mantenibilidad** centralizada
- ✅ **Accesibilidad** por defecto
- ✅ **Type-safety** con TypeScript
- ✅ **Restricción de HTML arbitrario** en extensiones

### Reglas Fundamentales

1. **OBLIGATORIO:** Todas las extensiones DEBEN usar estos componentes
2. **PROHIBIDO:** HTML arbitrario y estilos inline
3. **CANÓNICO:** Solo clases CSS del sistema de diseño

---

## 🎨 Principios de Diseño

### Sistema de Colores Canónico

```typescript
// ✅ CORRECTO - Usar clases canónicas
<div className="bg-surface text-primary border-subtle" />

// ❌ INCORRECTO - Colores hardcodeados
<div className="bg-gray-900 text-white border-gray-700" />
<div style={{ backgroundColor: '#1a1a1a' }} />
```

### Clases Disponibles

**Backgrounds:**
- `bg-base` - Fondo principal (#0d0d0d)
- `bg-surface` - Superficie elevada (#141414)
- `bg-elevated` - Más elevado (#1a1a1a)
- `bg-hover` - Estado hover (#242424)
- `bg-active` - Estado activo (#2a2a2a)
- `bg-accent` - Color de acento (#3b82f6)
- `bg-error` - Color de error
- `bg-success` - Color de éxito
- `bg-warning` - Color de advertencia

**Texto:**
- `text-primary` - Texto principal (#f5f5f5)
- `text-secondary` - Texto secundario (#a3a3a3)
- `text-muted` - Texto apagado (#666666)
- `text-inverse` - Texto inverso (blanco)
- `text-accent` - Texto de acento
- `text-error` - Texto de error
- `text-success` - Texto de éxito
- `text-warning` - Texto de advertencia

**Bordes:**
- `border-subtle` - Borde sutil (#1f1f1f)
- `border-default` - Borde por defecto (#2a2a2a)
- `border-strong` - Borde fuerte

---

## 📦 Componentes Disponibles

### 1. Button (FC-404)

Componente de botón con variantes predefinidas.

**Props:**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
}
```

**Ejemplo:**
```tsx
import { Button } from '@/components/ui';
import { Save } from 'lucide-react';

<Button variant="primary" size="md" leftIcon={<Save size={16} />}>
  Guardar
</Button>
```

**Variantes:**
- `primary` - Acción principal (azul)
- `secondary` - Acción secundaria (gris)
- `ghost` - Acción terciaria (transparente)
- `danger` - Acción destructiva (rojo)

---

### 2. Input (FC-405)

Componente de entrada con validación y variantes.

**Props:**
```typescript
interface InputProps {
  variant?: 'text' | 'search' | 'email' | 'password' | 'number';
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}
```

**Ejemplo:**
```tsx
import { Input } from '@/components/ui';
import { Mail } from 'lucide-react';

<Input
  variant="email"
  label="Correo electrónico"
  placeholder="tu@email.com"
  leftIcon={<Mail size={18} />}
  error={errors.email}
/>
```

**Variantes:**
- `text` - Texto simple
- `search` - Búsqueda con icono
- `email` - Email con validación
- `password` - Contraseña con toggle
- `number` - Numérico
- `textarea` - Área de texto (componente separado)

---

### 3. Card (FC-406)

Componente de tarjeta con estructura predefinida.

**Props:**
```typescript
interface CardProps {
  variant?: 'default' | 'elevated' | 'bordered' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}
```

**Ejemplo:**
```tsx
import { Card, CardHeader, CardBody, CardFooter, Button } from '@/components/ui';

<Card variant="elevated">
  <CardHeader
    title="Título de la tarjeta"
    subtitle="Descripción breve"
    actions={<Button variant="ghost">Acción</Button>}
  />
  <CardBody>
    <p>Contenido de la tarjeta</p>
  </CardBody>
  <CardFooter align="right">
    <Button variant="secondary">Cancelar</Button>
    <Button variant="primary">Guardar</Button>
  </CardFooter>
</Card>
```

**Subcomponentes:**
- `CardHeader` - Encabezado con título y acciones
- `CardBody` - Contenido principal
- `CardFooter` - Pie con acciones

---

### 4. Badge (FC-407)

Componente de badge para indicadores de estado.

**Props:**
```typescript
interface BadgeProps {
  variant?: 'info' | 'success' | 'warning' | 'error' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  badgeStyle?: 'solid' | 'soft' | 'outline';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  dot?: boolean;
}
```

**Ejemplo:**
```tsx
import { Badge } from '@/components/ui';
import { Check } from 'lucide-react';

<Badge variant="success" badgeStyle="soft" leftIcon={<Check size={12} />}>
  Activo
</Badge>
```

**Variantes:**
- `info` - Información (azul)
- `success` - Éxito (verde)
- `warning` - Advertencia (amarillo)
- `error` - Error (rojo)
- `neutral` - Neutral (gris)

---

## 📚 Guía de Uso para Extensiones

### 1. Importación

```typescript
// Importar desde el barrel export
import { Button, Input, Card, Badge } from '@/components/ui';
```

### 2. Manifest de Extensión

Las extensiones deben declarar los componentes que usan:

```json
{
  "id": "my-extension",
  "name": "Mi Extensión",
  "ui": {
    "allowedComponents": ["Button", "Input", "Card", "Badge"],
    "customCSS": false
  }
}
```

### 3. Validación

El `ExtensionHost` valida que solo se usen componentes permitidos:

```typescript
// ✅ VÁLIDO
<Button variant="primary">Acción</Button>

// ❌ INVÁLIDO - HTML arbitrario
<button className="bg-blue-500">Acción</button>
```

---

## 🎨 Sistema de Colores

### Tema Oscuro (Default)

```css
:root {
  /* Backgrounds */
  --color-base: #0d0d0d;
  --color-surface: #141414;
  --color-elevated: #1a1a1a;
  --color-hover: #242424;
  --color-active: #2a2a2a;
  
  /* Borders */
  --color-border-subtle: #1f1f1f;
  --color-border-default: #2a2a2a;
  
  /* Text */
  --color-text-primary: #f5f5f5;
  --color-text-secondary: #a3a3a3;
  --color-text-muted: #666666;
  
  /* Accent */
  --color-accent: #3b82f6;
  
  /* Semantic */
  --color-error: #ef4444;
  --color-success: #10b981;
  --color-warning: #f59e0b;
}
```

### Tema Claro

```css
[data-theme="light"] {
  --color-base: #ffffff;
  --color-surface: #f9fafb;
  --color-elevated: #f3f4f6;
  /* ... */
}
```

---

## 💡 Ejemplos Completos

### Formulario de Login

```tsx
import { Input, Button, Card, CardBody } from '@/components/ui';
import { Mail, Lock } from 'lucide-react';

function LoginForm() {
  return (
    <Card variant="elevated" padding="lg">
      <CardBody>
        <form className="space-y-4">
          <Input
            variant="email"
            label="Email"
            placeholder="tu@email.com"
            leftIcon={<Mail size={18} />}
          />
          <Input
            variant="password"
            label="Contraseña"
            placeholder="••••••••"
            leftIcon={<Lock size={18} />}
          />
          <Button variant="primary" fullWidth loading={isLoading}>
            Iniciar Sesión
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
```

### Lista de Items con Estados

```tsx
import { Card, CardHeader, CardBody, Badge } from '@/components/ui';

function ItemList() {
  return (
    <Card variant="default">
      <CardHeader title="Extensiones" />
      <CardBody padding="none">
        {items.map(item => (
          <div key={item.id} className="p-4 border-b border-subtle last:border-0">
            <div className="flex items-center justify-between">
              <span className="text-primary">{item.name}</span>
              <Badge
                variant={item.active ? 'success' : 'neutral'}
                badgeStyle="soft"
                dot
              >
                {item.active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
```

---

## 🚫 Anti-Patrones

### ❌ NO HACER

```tsx
// HTML arbitrario
<div style={{ backgroundColor: '#1a1a1a' }}>
  <button className="bg-blue-500 text-white px-4 py-2">
    Click
  </button>
</div>

// Colores hardcodeados
<div className="bg-gray-900 border-gray-700">
  <span className="text-blue-400">Texto</span>
</div>

// Estilos inline
<input style={{ padding: '8px', border: '1px solid #ccc' }} />
```

### ✅ HACER

```tsx
// Usar componentes de la biblioteca
<Card variant="elevated">
  <CardBody>
    <Button variant="primary">Click</Button>
  </CardBody>
</Card>

// Usar clases canónicas
<div className="bg-surface border-subtle">
  <span className="text-accent">Texto</span>
</div>

// Usar componentes con props
<Input
  label="Campo"
  placeholder="Valor"
  error={error}
/>
```

---

## 📝 Notas para Desarrolladores

1. **Todos los componentes son accesibles** - Usan semántica HTML correcta
2. **TypeScript first** - Props completamente tipadas
3. **Responsive por defecto** - Adaptan a diferentes tamaños
4. **Dark mode nativo** - Usan variables CSS del tema
5. **Extensibles** - Aceptan className para casos especiales

---

## 🔄 Próximos Componentes

- [ ] Table (FC-408)
- [ ] Select (FC-409)
- [ ] Checkbox (FC-410)
- [ ] Avatar (FC-411)
- [ ] Modal
- [ ] Dropdown
- [ ] Tooltip
- [ ] Toast

---

## 📞 Soporte

Para dudas o sugerencias sobre la Component Library:
- Revisar ejemplos en `/docs/COMPONENT_LIBRARY.md`
- Consultar código fuente en `/apps/web/src/components/ui/`
- Revisar sistema de diseño en `/docs/DESIGN_SYSTEM.md`
