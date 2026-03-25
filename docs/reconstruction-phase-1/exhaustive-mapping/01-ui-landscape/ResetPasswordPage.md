---
id: "reset-password-page"
type: "smart-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/auth/ResetPasswordPage.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Ruteador base a `api.resetPassword()`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Portal Receptor de Enlaces de Correo" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Extracción del QueryParam `?token=`, Validación Frontend" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🔐 ResetPasswordPage

## 🎯 Propósito
La pantalla de aterrizaje para el usuario amnésico. Captura el token que llega incrustado en la URL proveniente del enlace "Olvidé mi contraseña" en sus bandejas de correo para canjearlo por una actualización en la Base de Datos.

## 📦 Estado y Datos
**Validación Doble Barrera:**
- Aplica reglas estáticas reactivas (Minimum 6 caracteres) e igualdad sintomática binaria (`password !== confirmPassword`) antes de si quiera disparar el fetch a la API bajando costos de servidor de Auth.

## 🔄 Flujos de Interacción
1. **Interceptor Inválido:** Si el componente monta y no hay `?token=` en la querystring, clava los frenos, evita el render del formulario y en su lugar arroja una tarjeta de castigo amigable "Token inválido" invitando a la vista Login.
2. **Conmutación Visual (Eye Toggle):** Permite cambiar el `type` subyacente del input HTML entre `password` y `text` para revisar por typos antes de enviar.

## 💡 Ejemplo de Uso
```tsx
// Inside Auth Routes Config
<Route path="/reset-password" element={<ResetPasswordPage />} />
```
