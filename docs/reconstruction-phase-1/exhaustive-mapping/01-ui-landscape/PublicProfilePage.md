---
id: "public-profile-page"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/public-profile/PublicProfilePage.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Punto de anclaje de React Router (`/:alias`)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Cargador Asíncrono de Identidades Públicas" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Network Fetch a `/public/profiles`, Error States" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🌐 PublicProfilePage

## 🎯 Propósito
Es la Página Raíz del sistema de ruteo que intercepta cualquier URL del tipo `dominio.com/john_doe`. Verifica si ese "alias" existe en realidad de forma anónima disparando peticiones seguras al endpoint público para armar el View.

## 📦 Estado y Datos
**Fetch Centralizado:**
- Utiliza `useParams()` de React Router.
- Rescata la metadata completa asíncronamente en un `useEffect`.

## 🔄 Flujos de Interacción
1. **Limpiador de Avatares (Hack IP local):** Contiene un micro-script salvaje en la decodificación de la red que detecta si el JSON de backend retornó `localhost:3000` en las URLs de imágenes para reescribirlas obligatoriamente a una LAN (`192.168.0.179`) previniendo imágenes rotas si esto es testeado en red ad-hoc de celulares usando el host local de la computadora.
2. **Pivote Final Dispatcher:** Usa el hook `useIsMobile()` para empujar finalmente el render del bloque de chat (`ProfileChatBlockMobile` o `Desktop`).

## 💡 Ejemplo de Uso
```tsx
import { PublicProfilePage } from './PublicProfilePage';

// Usually inside React Router Setup
<Route path="/:alias" element={<PublicProfilePage />} />
```
