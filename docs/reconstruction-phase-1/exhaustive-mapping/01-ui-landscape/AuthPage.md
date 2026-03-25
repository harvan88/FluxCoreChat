---
id: "auth-page"
type: "smart-component"
status: "stable"
criticality: "critical"
location: "apps/web/src/components/auth/AuthPage.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Invoca mutaciones pesadas de `useAuthStore`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Portal Único de Ingreso del Sistema (Login/Registro/Olvido de Clave)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Intercambiador Local de Vistas 'AuthMode', Tema Fluido, Bloqueo de UI por Carga" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🔐 AuthPage

## 🎯 Propósito
La Puerta de Entrada (Gateway). Es el único componente aislado en todo el frontend que asume un layout de Pantalla Completa y no comparte navegación. Se encarga de recolectar credenciales, interactuar con el Store de Autenticación, atrapar rechazos del API (Errores HTTP 401/403) y renderizarlos amigablemente al operador.

## 📦 Estado y Datos
**Máquina de Estados Tripartita (`mode`):**
No existen 3 rutas diferentes `/login`, `/register`, `/forgot`. Todo ocurre en una sola URL donde Mutar el `mode` re-esculpe los inputs solicitando `name` si es registro, o borrando el campo `password` si es olvido de contraseña.

## 🔄 Flujos de Interacción
1. **Respeto Estricto de Temas (`useThemeStore`):** Inyecta en Crudo al `<html data-theme="">` el color calculado, garantizando que el diseño de las variables CSS cargue perfecto antes de que el usuario haga login.
2. **Barrera por Spinner (`disabled={isLoading}`):** Tras presionar Enter, el Submit desata las promesas de AuthStore. Secuestra mecánicamente todos los botones, cambia textos a "Procesando..." y previene clicks dobles para evitar reventar el Endpoint con SPAM de Logins.

## 💡 Ejemplo de Uso
```tsx
// En el Router Principal
if (!isAuthenticated) return <AuthPage />
```
