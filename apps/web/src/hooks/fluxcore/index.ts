/**
 * FluxCore Hooks - Barrel Export
 * 
 * Exporta todos los hooks de FluxCore desde un único punto de entrada.
 * 
 * Uso:
 * import { useAutoSave, useClipboard, useEntitySelection } from '@/hooks/fluxcore';
 */

// UI & Logic hooks
export { useAutoSave } from './useAutoSave';
export type { UseAutoSaveOptions, UseAutoSaveReturn } from './useAutoSave';

export { useClipboard } from './useClipboard';
export type { UseClipboardOptions, UseClipboardReturn } from './useClipboard';

export { useEntitySelection } from './useEntitySelection';
export type { UseEntitySelectionOptions, UseEntitySelectionReturn } from './useEntitySelection';

// Business hooks
export { useAssistants } from './useAssistants';
export { useInstructions } from './useInstructions';
export { useVectorStores } from './useVectorStores';
export { useTools } from './useTools';
export { useAIStatus } from './useAIStatus';
