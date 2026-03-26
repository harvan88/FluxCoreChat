import type { RuntimeConfig } from '@fluxcore/db';

export interface ResolvedRuntimeStyle {
  tone: string;
  language: string;
  useEmojis: boolean;
}

class RuntimeStyleService {
  resolve(runtimeConfig: RuntimeConfig): ResolvedRuntimeStyle {
    return {
      tone: runtimeConfig.tone ?? 'neutral',
      language: runtimeConfig.language ?? 'es',
      useEmojis: runtimeConfig.useEmojis ?? false,
    };
  }
}

export const runtimeStyleService = new RuntimeStyleService();
