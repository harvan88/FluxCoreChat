---
id: "extension-card"
type: "ui-component"
status: "stable"
criticality: "medium"
location: "apps/web/src/components/extensions/ExtensionCard.tsx"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Pasivo, suscriptor de Interacciones" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tarjeta de Marketplace de Plugin" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Variaciones de Status: Disponible, Habilitada y Desactivada" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🤖 ExtensionCard

## 🎯 Propósito
(COR-041). Es la placa descriptiva (Card) predeterminada empleada transversalmente dentro del gestor del Marketplace / Tienda para representar visualmente una Extensión de FluxCore. Transmite al usuario el nombre, versión, alcance invasivo (Permisos requeridos en el sistema padre) y expone la botonera que acciona su Descarga, Eliminación o Alteración operativa dependiendo de su contexto.
## 🧰 Props
- `extension` (Extension, Requerido): El objeto completo que define la versión, nombre y estado local del plugin.
- `onInstall` (function, Opcional): Callback disparado al clickear descargar/instalar.
- `onUninstall` (function, Opcional): Callback de remoción destructiva del plugin.
- `onToggle` (function, Opcional): Flag booleano emitido al switchar la actividad del módulo.
- `onConfigure` (function, Opcional): Callback que abre modales de Setting.
- `isLoading` (boolean, Opcional): Congela y opaca visualmente la tarjeta entera.

## 📦 Estado y Datos
**Variables Derivativas Puras:**
- Deduce `isInstalled` validando si al objeto central `extension.status` tiene estampa distinta a `'available'` (Generalmente dictando "enabled" o "disabled").
- Usa la bandera `isLoading` disipando su opacidad (`opacity-50 pointer-events-none`) para prevenir descargas dobles u over-fetchings de sus padres instalando el plugin.

## 🔄 Flujos de Interacción
1. **Controlador Dinámico de Estilos:** Dependiendo de `isEnabled`, pinta los contornos del borde externo infundiendo confianza visual (Bordes gruesos verdes). En tarjetas que solo figuran en la tienda, asume fondos mudos grises `bg-elevated`.
2. **Selector Condicional de Acciones (Footer):** Usa inyecciones booleanas lógicas agresivas. Si NO está instalada, domina el frente con el botón Azul (`Instalar`). Si está Instalada expulsa aquel botón en favor de una grilla triple: "Configurar (Rueda de engranaje)" y "Desinstalar (Basurero Destructivo)".
3. **Truncamiento de Permisivos (`permissions.slice`):** Sabe que exhibir listas de 40 permisos destruye verticalmente el Grid principal. Así que intercepta la matriz de la manifestación de seguridad de forma visual, extrayendo solamente los Primeros Tres Strings (`slice(0,3)`) concatenándolos con coma, y agrupando el remanente en una píldora textual cruda (`+X`). 

## 💡 Ejemplo de Uso
```tsx
import { ExtensionCard } from '../../components/extensions/ExtensionCard';

<div className="grid grid-cols-3">
  {plugins.map(ext => (
     <ExtensionCard 
        key={ext.id} 
        extension={ext}
        onInstall={() => launchInstallProtocol(ext.id)}
        onToggle={(state) => toggleExtension(ext.id, state)}
     />
  ))}
</div>
```
