/**
 * FluxCore Hooks - Barrel Export
 * 
 * Exporta todos los hooks de FluxCore desde un único punto de entrada.
 * 
 * Uso:
 * import { useAutoSave, useClipboard, useEntitySelection } from '@/hooks/fluxcore';
 */

// Auto-save hook
export { useAutoSave } from './useAutoSave';
export type { UseAutoSaveOptions, UseAutoSaveReturn } from './useAutoSave';

// Clipboard hook
export { useClipboard } from './useClipboard';
export type { UseClipboardOptions, UseClipboardReturn } from './useClipboard';

// Entity selection hook
export { useEntitySelection } from './useEntitySelection';
export type { UseEntitySelectionOptions, UseEntitySelectionReturn } from './useEntitySelection';
