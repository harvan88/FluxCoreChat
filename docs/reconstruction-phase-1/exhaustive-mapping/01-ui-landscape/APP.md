---
id: "app-router"
type: "core"
status: "stable"
criticality: "high"
location: "apps/web/src/App.tsx"
---
# App.tsx – Layout Principal y Routing

**Ubicación:** `apps/web/src/App.tsx`  
**Tamaño:** 66 líneas  
**Propósito:** Punto de entrada de la aplicación React; resuelve autenticación inicial, aplica el tema global y define todo el routing principal.

---

## 🧩 1. Firma y Responsabilidad del Componente

```typescript
// apps/web/src/App.tsx
function App() {
  const { isAuthenticated, initFromStorage } = useAuthStore();
  const { resolvedTheme } = useThemeStore();
  const [isInitializing, setIsInitializing] = useState(true);
  // ...
}

export default App;
```

- **Props:** Ninguna. `App` no recibe props; se monta directamente en `main.tsx`.
- **Rol:** Orquestador de alto nivel (routing + tema), no contiene lógica de negocio de chat.

Referencias cruzadas:
- Mapa de componentes: `[UI_COMPONENTS_MAP.md](./UI_COMPONENTS_MAP.md)`
- Detalle de layout y rutas: `[APP_LAYOUT_ROUTING.md](./APP_LAYOUT_ROUTING.md)`

---

## 🧱 2. Imports y Dependencias Principales

```typescript
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { Layout } from './components/layout/Layout';
import { AuthPage } from './components/auth/AuthPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { DesignSystemPage } from './pages/DesignSystemPage';
import { SystemMonitor } from './components/monitor';
import { AccountDeletionPortalPage } from './pages/AccountDeletionPortalPage';
import { PublicProfilePage } from './public-profile';
```

- **Stores:** `authStore`, `themeStore` (estado global de autenticación y tema).
- **Layout principal:** `Layout` contiene la UI de chat completa.
- **Páginas auxiliares:** `AuthPage`, `ResetPasswordPage`, `DesignSystemPage`, `SystemMonitor`, `AccountDeletionPortalPage`, `PublicProfilePage`.

---

## 🧠 3. Estado Interno y Hooks

```typescript
const { isAuthenticated, initFromStorage } = useAuthStore();
const { resolvedTheme } = useThemeStore();
const [isInitializing, setIsInitializing] = useState(true);
```

- `isAuthenticated`: bandera global de sesión iniciada.
- `resolvedTheme`: tema efectivo (por ejemplo "dark" / "light").
- `isInitializing`: controla el splash/loading inicial mientras se hidrata el estado desde `localStorage`.

### 3.1 Inicialización desde almacenamiento

```typescript
useEffect(() => {
  initFromStorage();
  // Pequeño delay para evitar flash de contenido
  const timer = setTimeout(() => setIsInitializing(false), 100);
  return () => clearTimeout(timer);
}, []);
```

- Llama una sola vez a `initFromStorage()` para restaurar sesión.
- Usa un `setTimeout` de 100ms para evitar parpadeos visuales en la carga.

### 3.2 Aplicación de tema global

```typescript
useEffect(() => {
  document.documentElement.setAttribute('data-theme', resolvedTheme);
}, [resolvedTheme]);
```

- Sincroniza el atributo `data-theme` del `<html>` con el store de tema.
- Permite que el design system use selectores `[data-theme="dark"]`, etc.

---

## 🛣️ 4. Routing y Protección de Rutas

```typescript
return (
  <Routes>
    <Route path="/design-system" element={<DesignSystemPage />} />
    <Route path="/monitor" element={<SystemMonitor />} />
    <Route path="/account-deletions/:jobId" element={<AccountDeletionPortalPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route 
      path="/login" 
      element={!isAuthenticated ? <AuthPage /> : <Navigate to="/" />} 
    />
    <Route path="/p/:alias" element={<PublicProfilePage />} />
    <Route 
      path="/*" 
      element={isAuthenticated ? <Layout /> : <Navigate to="/login" />} 
    />
  </Routes>
);
```

- Rutas **públicas**: `/design-system`, `/monitor`, `/account-deletions/:jobId`, `/reset-password`, `/p/:alias`.
- Ruta `/login`: sólo visible cuando **no** hay sesión; si ya está autenticado, redirige a `/`.
- Ruta `/*`: contiene toda la app principal dentro de `Layout`; requiere autenticación.

---

## 🔄 5. Flujos Principales

### 🔄 5.1 Flujo de inicialización

1. `main.tsx` monta `<App />` dentro de `<BrowserRouter>`.
2. `App` ejecuta `initFromStorage()` para leer credenciales y estado previo.
3. `isInitializing` permanece en `true` durante ~100ms mostrando un splash minimalista.
4. Una vez completado, se evalúa `isAuthenticated` para decidir entre `Layout` o `AuthPage`.

### 🔄 5.2 Flujo de selección de ruta

1. El usuario navega a una URL específica (por ejemplo `/monitor`).
2. React Router evalúa la tabla de rutas declaradas en `App`.
3. Se renderiza el componente de página correspondiente.
4. Para rutas protegidas (`/*`), si `isAuthenticated === false` se redirige a `/login`.

---

## 🔧 6. Integraciones y Dependencias Clave

- **Auth Store (`useAuthStore`):**
  - Proporciona `isAuthenticated` y `initFromStorage`.
  - Depende de la capa de API/auth real (ver documentación de backend).

- **Theme Store (`useThemeStore`):**
  - Centraliza el estado de tema y sincroniza con el DOM.

- **React Router (`Routes`, `Route`, `Navigate`):**
  - Implementa el routing declarativo.

- **PublicProfilePage:**
  - Integra el routing público `/p/:alias` con el sistema de chat público (ver `PublicProfile` docs).

---

## 📋 7. Pendientes / Notas de Documentación

- 📋 Documentar en detalle `Layout` y sus subcomponentes de chat.
- 📋 Enlazar con la documentación de `SystemMonitor` y `DesignSystemPage` cuando estén disponibles.
- 📋 Añadir diagrama de navegación global (UI routes) en `UI_ROUTES.md` y enlazar desde aquí.
