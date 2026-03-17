const normalizeBoolean = (value?: string | null) => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
};

export const featureFlags = {
  get accountDeletionQueue() {
    return normalizeBoolean(process.env.ACCOUNT_DELETION_USE_QUEUE ?? 'false');
  },
};

export type FeatureFlag = keyof typeof featureFlags;

export const isFeatureEnabled = (flag: FeatureFlag): boolean => featureFlags[flag];
