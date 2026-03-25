---
id: "profile-section"
type: "smart-component"
status: "stable"
criticality: "high"
location: "apps/web/src/components/settings/ProfileSection.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Absorbe FC-801, FC-803 y FC-806 unificando Stores Redux" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Macro-Formulario de Identidad de Usuario Extendido" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Comprobador Alias Debounce, Tokens Estimativos y Popups" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 ProfileSection

## 🎯 Propósito
Es el Megalito central para todo lo que engloba la psique del usuario dentro del ecosistema. Mucho más que "Cambiar tu foto", encapsula configuraciones críticas cruzadas: La URL pública que regala permisos de indexado SEO, metadatos ocultos para Inteligencia Artificial (Permitiéndote enseñar al bot "Cómo te gusta que te hable") y el conmutador universal hacia cuentas "Business" desatando sub-entornos empresariales.

## 📦 Estado y Datos
**Debouncer Crudo de Verificación Activa:**
- El input interactivo del `Alias` (tu identificador público) goza de un estado híbrido Reactivo (`idle | checking | available | taken`) retroalimentado por el `aliasCheckTimer.current` que interrumpe consultas repetitivas a la base de datos hasta que el usuario frena el tipeo en 400ms.

## 🔄 Flujos de Interacción
1. **Delegador Analista IA (Permisos Granulares):** Ofrece checkboxes minimalistas (`Switch`) al lado de cada campo personal (Nombre, Bio). Si el usuario lo extingue, bloquea que ese string sea arrastrado al Prompt Principal que consumen los Bots mitigando Phishing algorítmico y paranoias de privacidad atómicamente.
2. **Contexto Masivo Subterráneo:** Oculta a primera vista un Textarea inmenso de 5000 chars estimándole "Tokens IA" (`length / 4`) vivos. Provee botones nativos de escape (`onOpenTab`) para abrirlo a un TextEditor gigante si el textarea HTML normal sofoca al redactor empedernido.
3. **Guardado Agregado Calculado:** Mantiene un semáforo booleano interno `hasChanges` comparando en vivo `useEffect` las referencias cargadas iniciales con las refs mutadas. Deshabilita el botón verde Guardar si matemáticamente los arreglos son idénticos asumiendo reducción drástica de Mutaciones tontas HTTP.

## 💡 Ejemplo de Uso
```tsx
import { ProfileSection } from '../../components/settings/ProfileSection';

if (menu === 'profile') return <ProfileSection onBack={handleBack} />;
```
