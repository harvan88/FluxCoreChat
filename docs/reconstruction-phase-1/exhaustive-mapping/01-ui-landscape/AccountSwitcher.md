---
id: "account-switcher"
type: "smart-component"
status: "stable"
criticality: "critical"
location: "apps/web/src/components/accounts/AccountSwitcher.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Core Disparador del Master Wipe Frontend `refreshAccountContext`" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Selector Global Top-Left de Entidades Comerciales" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Mount Caching Dexie, Hook Refresher PWA Memory" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🔄 AccountSwitcher

## 🎯 Propósito
El Corazón del Multi-Tenant (FC-811). Es el Botoncito ubicado usualmente arriba a la izquierda que pinta la foto de la empresa actual. Su responsabilidad NO ES SOLO VISUAL: si el usuario cambia a otra cuenta, este componente desatará un apocalipsis de reseteos en el Frontend borrando los cachés locales de IndexedDB para que no se filtren chismes de IA entre el "Negocio A" y "Negocio B".

## 📦 Estado y Datos
**Auto-Selector Clandestino (Boot Secuence):**
- En su `useEffect` primario, revisa si al entrar por primera vez a FluxCore tienes 1 ID almacenado; Si no lo hay, asume el control, roba violentamente la cuenta índex `[0]` de tu lista de accesos, y fuerza a Dexie y Zustand a adoptarla como "Activa" evitando el temido *Blank State of Death*.

## 🔄 Flujos de Interacción
1. **La Limpia Total (The Purge) (`handleSelectAccount`):** Cuando cambias manualmente a *Nike* estando en *Adidas*, cancela procesos disparando `refreshAccountContext` con flag flagrante `clearLocalCache: true` aniquilando vectores locales para forzar un re-sync puro (Soberanía y Aislamiento total GDPR by design).
2. **Defensa Auto-Contenida Visual:** Si falla en extraer la foto de perfil desde el CloudBucket (Ej: Error 404 image), posee un interceptor nativo `onError` inyectando código VanillaJS (`document.createElement`) para pintar a la fuerza las Iniciales Letra de Forma de Fallback.

## 💡 Ejemplo de Uso
```tsx
<AccountSwitcher compact={isMobile} />
```
