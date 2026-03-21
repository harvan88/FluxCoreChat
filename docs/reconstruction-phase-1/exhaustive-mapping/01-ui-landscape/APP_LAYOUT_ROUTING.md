---
id: "app-layout-routing"
type: "subsystem"
status: "stable"
criticality: "high"
location: "apps/web/src/App.tsx"
---

# App.tsx - Layout Principal y Routing

**Ubicación:** `apps/web/src/App.tsx`  
**Tamaño:** 66 líneas  
**Propósito:** Entry point principal, routing y tema global

---

## 🏗️ 1. Estructura del Componente

### 1.1 Imports y Dependencias

```typescript
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';        // Estado de autenticación
import { useThemeStore } from './store/themeStore';      // Estado del tema
import { Layout } from './components/layout/Layout';      // Layout principal
import { AuthPage } from './components/auth/AuthPage';    // Login/registro
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { DesignSystemPage } from './pages/DesignSystemPage';  // Debug UI
import { SystemMonitor } from './components/monitor';    // Monitor sistema
import { AccountDeletionPortalPage } from './pages/AccountDeletionPortalPage';
import { PublicProfilePage } from './public-profile';    // Perfiles públicos
```

### 1.2 Estado del Componente

```typescript
const { isAuthenticated, initFromStorage } = useAuthStore();
const { resolvedTheme } = useThemeStore();
const [isInitializing, setIsInitializing] = useState(true);
```

**Estado:**
- `isAuthenticated` - Si el usuario está logueado (del store)
- `resolvedTheme` - Tema actual (light/dark del store)
- `isInitializing` - Estado de carga inicial

---

## 🛣️ 2. Routing Completo

### 2.1 Estructura de Rutas

```typescript
<Routes>
  {/* Rutas públicas */}
  <Route path="/design-system" element={<DesignSystemPage />} />
  <Route path="/monitor" element={<SystemMonitor />} />
  <Route path="/account-deletions/:jobId" element={<AccountDeletionPortalPage />} />
  <Route path="/reset-password" element={<ResetPasswordPage />} />
  <Route 
    path="/login" 
    element={!isAuthenticated ? <AuthPage /> : <Navigate to="/" />} 
  />
  <Route path="/p/:alias" element={<PublicProfilePage />} />
  
  {/* Rutas protegidas - require autenticación */}
  <Route 
    path="/*" 
    element={isAuthenticated ? <Layout /> : <Navigate to="/login" />} 
  />
</Routes>
```

### 2.2 Análisis de Rutas

| Ruta | Protección | Componente | Propósito |
|------|------------|------------|-----------|
| `/design-system` | Pública | `DesignSystemPage` | Debug de UI components |
| `/monitor` | Pública | `SystemMonitor` | Monitor del sistema |
| `/account-deletions/:jobId` | Pública | `AccountDeletionPortalPage` | Portal eliminación cuentas |
| `/reset-password` | Pública | `ResetPasswordPage` | Reset de password |
| `/login` | Redirección | `AuthPage` o `Navigate` | Login/registro |
| `/p/:alias` | Pública | `PublicProfilePage` | Perfil público |
| `/*` | Protegida | `Layout` | App principal (catch-all) |

### 2.3 Lógica de Protección

- **Rutas públicas:** Siempre accesibles
- **Login:** Si ya está autenticado → redirige a `/`
- **App principal:** Si no está autenticado → redirige a `/login`
- **Catch-all:** `/*` maneja todas las rutas dentro de Layout

---

## 🎨 3. Gestión de Tema

### 3.1 Aplicación del Tema

```typescript
useEffect(() => {
  document.documentElement.setAttribute('data-theme', resolvedTheme);
}, [resolvedTheme]);
```

**Implementación:**
- Lee `resolvedTheme` del `themeStore`
- Aplica atributo `data-theme` al `<html>` element
- Permite CSS selector `[data-theme="dark"]` o `[data-theme="light"]`

---

## ⚡ 4. Estado de Inicialización

### 4.1 Loading State

```typescript
if (isInitializing) {
  return (
    <div className="min-h-screen bg-base flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-inverse font-bold text-3xl">F</span>
        </div>
        <p className="text-muted text-sm">Cargando...</p>
      </div>
    </div>
  );
}
```

**Características:**
- Logo "F" animado con pulse
- Usa design system colors (`bg-base`, `bg-accent`, `text-inverse`, `text-muted`)
- Previene flash de contenido incorrecto

### 4.2 Lógica de Inicialización

```typescript
useEffect(() => {
  initFromStorage(); // Inicializa auth store desde localStorage
  const timer = setTimeout(() => setIsInitializing(false), 100);
  return () => clearTimeout(timer);
}, []);
```

**Secuencia:**
1. `initFromStorage()` - Lee token y user de localStorage
2. Delay de 100ms para evitar flash
3. Set `isInitializing = false`
4. Render de rutas apropiadas

---

## 🏪 5. Stores Utilizados

### 5.1 Auth Store (`useAuthStore`)

**Propiedades usadas:**
- `isAuthenticated` - Boolean de autenticación
- `initFromStorage()` - Método para inicializar desde localStorage

**Probable implementación (inferida):**
```typescript
interface AuthStore {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  initFromStorage(): void;
  login(credentials: LoginCredentials): Promise<void>;
  logout(): void;
}
```

### 5.2 Theme Store (`useThemeStore`)

**Propiedades usadas:**
- `resolvedTheme` - Tema actual ('light' | 'dark')

**Probable implementación (inferida):**
```typescript
interface ThemeStore {
  resolvedTheme: 'light' | 'dark';
  setTheme(theme: 'light' | 'dark'): void;
  toggleTheme(): void;
}
```

---

## 🔄 6. Flujo de Navegación

### 6.1 Usuario No Autenticado

```
Usuario visita / → Verifica isAuthenticated = false
→ Redirige a /login → Muestra AuthPage
→ Usuario hace login → Auth store actualiza isAuthenticated = true
→ React Router re-evalúa rutas → Redirige a /
→ Muestra Layout con app principal
```

### 6.2 Usuario Autenticado

```
Usuario visita / → Verifica isAuthenticated = true
→ Muestra Layout (catch-all route)
→ Layout maneja sub-rutas internas
→ Sidebar, ChatView, Settings, etc.
```

### 6.3 Perfil Público

```
Usuario visita /p/alias → Siempre muestra PublicProfilePage
→ No requiere autenticación (público)
→ WebSocket con visitor token
```

---

## 📊 7. Component Architecture

### 7.1 Jerarquía de Componentes

```
App.tsx (Entry point)
├── Loading State (si isInitializing)
├── Routes (Router principal)
│   ├── Public Routes
│   │   ├── DesignSystemPage
│   │   ├── SystemMonitor
│   │   ├── AccountDeletionPortalPage
│   │   ├── ResetPasswordPage
│   │   ├── AuthPage (con redirección)
│   │   └── PublicProfilePage
│   └── Protected Routes
│       └── Layout (app principal)
│           ├── Sidebar
│           ├── Main Content
│           │   ├── ChatView
│           │   ├── Settings
│           │   └── Account management
│           └── Modals
```

### 7.2 Patrones Observados

- **Protected Routes:** Patrón de autenticación con Navigate
- **Catch-all:** `/*` para manejar rutas internas en Layout
- **Public First:** Rutas públicas definidas primero
- **Store Integration:** Uso de Zustand stores para estado global

---

## 🔧 8. Dependencies Analysis

### 8.1 External Dependencies

- **React Router:** Para routing y navegación
- **Zustand:** Para estado global (auth, theme)
- **CSS Variables:** Para theming con `data-theme`

### 8.2 Internal Dependencies

- **Layout Component:** Contenedor principal de la app
- **Auth Components:** Login, registro, reset password
- **Pages Components:** Páginas específicas (design system, monitor)
- **Store Components:** Estado global compartido

---

## 🎯 9. Key Insights

### 9.1 Architecture Decisions

1. **Single Layout:** Layout contiene toda la app autenticada
2. **Store-based Auth:** Autenticación manejada por Zustand store
3. **Theme System:** Tema basado en CSS variables
4. **Public Profiles:** Perfiles públicos sin autenticación
5. **Loading Prevention:** Estado inicial para evitar flash

### 9.2 Security Considerations

- **Route Protection:** Todas las rutas principales requieren auth
- **Token Storage:** Auth store maneja localStorage
- **Redirect Logic:** Usuarios autenticados redirigidos desde login

### 9.3 UX Considerations

- **Loading State:** Feedback visual durante inicialización
- **Smooth Navigation:** Redirecciones automáticas
- **Theme Persistence:** Tema se mantiene entre sesiones
- **Public Access:** Perfiles públicos accesibles sin login

---

## 📋 10. Pending Documentation

### 10.1 Components to Document

- [ ] `Layout.tsx` - Layout principal de la app
- [ ] `AuthPage.tsx` - Login/registro completo
- [ ] `PublicProfilePage.tsx` - Perfiles públicos
- [ ] `DesignSystemPage.tsx` - Debug UI components

### 10.2 Stores to Document

- [ ] `authStore.ts` - Estado de autenticación completo
- [ ] `themeStore.ts` - Gestión de temas
- [ ] Otros stores descubiertos

### 10.3 Routes to Map

- [ ] Sub-rutas dentro de Layout
- [ ] Rutas de FluxCore components
- [ ] Rutas de settings y configuración

---

*Documentación basada en análisis exacto del código fuente de App.tsx*  
*Cada ruta, estado y patrón documentado con precisión*
