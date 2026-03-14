// Feature Flags para control de nuevas funcionalidades
export const FEATURES = {
  // Refactoring: Redacción → Sobrescritura
  USE_NEW_OVERWRITE_TERMINOLOGY: process.env.ENABLE_OVERWRITE_TERMINOLOGY === 'true',
  
  // Otros features existentes
  ENABLE_NEW_ARCHITECTURE: process.env.FLUX_NEW_ARCHITECTURE === 'true',
  ENABLE_AI_SUGGESTIONS: process.env.ENABLE_AI_SUGGESTIONS === 'true',
};
