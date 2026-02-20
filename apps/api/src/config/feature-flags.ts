const normalizeBoolean = (value?: string | null) => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
};

export const featureFlags = {
  get accountDeletionQueue() {
    return normalizeBoolean(process.env.ACCOUNT_DELETION_USE_QUEUE ?? 'false');
  },
  /**
   * FluxCore v8.2 — New Cognitive Architecture
   * 
   * When true: CognitionWorker runs + RuntimeGateway processes turns.
   * When false: Legacy path (message-dispatch.service) handles AI responses.
   * 
   * Set FLUX_NEW_ARCHITECTURE=true to enable.
   * ChatProjector always writes to cognition_queue; the worker simply doesn't run when false.
   */
  get fluxNewArchitecture() {
    return normalizeBoolean(process.env.FLUX_NEW_ARCHITECTURE ?? 'false');
  },
};

export type FeatureFlag = keyof typeof featureFlags;

export const isFeatureEnabled = (flag: FeatureFlag): boolean => featureFlags[flag];
