/**
 * Extension Host Service
 * FC-154: Servicio principal que coordina extensiones
 */

import { extensionService } from './extension.service';
import { manifestLoader } from './manifest-loader.service';
import { permissionValidator } from './permission-validator.service';
import { contextAccess } from './context-access.service';
import aiService from './ai.service';
import type { ExtensionManifest } from '@fluxcore/types';
import type { FluxPolicyContext } from '@fluxcore/db';
import * as path from 'path';
import { pathToFileURL } from 'url';

// Registro de extensiones cargadas
type LoadedExtensionRuntime = {
  onInstall?: (accountId: string) => Promise<void>;
  onUninstall?: (accountId: string) => Promise<void>;
  onEnable?: (accountId: string) => Promise<void>;
  onDisable?: (accountId: string) => Promise<void>;
  onConfigUpdate?: (accountId: string, config: Record<string, unknown>) => Promise<void>;
  onConfigChange?: (accountId: string, config: Record<string, unknown>) => Promise<void>;
  // Optional legacy/extended hooks
  onMessage?: (...args: any[]) => Promise<any>;
  generateResponse?: (...args: any[]) => Promise<any>;
};

const loadedExtensions: Map<string, LoadedExtensionRuntime> = new Map();

export interface ProcessMessageParams {
  accountId: string;
  relationshipId: string;
  conversationId: string;
  message: {
    id: string;
    content: any;
    type: string;
    senderAccountId: string;
  };
  // COR-007: Modo de automatización
  automationMode?: 'automatic' | 'supervised' | 'disabled';
  // Canon v7.0: Pre-runtime policy context
  policyContext?: FluxPolicyContext;
}

export interface ProcessMessageResult {
  extensionId: string;
  success: boolean;
  handled?: boolean;
  stopPropagation?: boolean;
  actions?: any[];
  error?: string;
}

class ExtensionHostService {
  public async loadExtensionRuntime(extensionId: string): Promise<LoadedExtensionRuntime | null> {
    const existing = loadedExtensions.get(extensionId);
    if (existing) return existing;

    const manifest = manifestLoader.getManifest(extensionId);
    if (!manifest) return null;

    const root = manifestLoader.getExtensionRoot(extensionId);
    const entrypoint = typeof (manifest as any).entrypoint === 'string' ? (manifest as any).entrypoint : null;
    if (!root || !entrypoint) return null;

    const absEntrypoint = path.resolve(root, entrypoint);
    const moduleUrl = pathToFileURL(absEntrypoint).href;

    try {
      const mod: any = await import(moduleUrl);

      // Prefer default export (e.g. Karen)
      if (mod?.default && typeof mod.default === 'object') {
        const runtime = mod.default as LoadedExtensionRuntime;
        loadedExtensions.set(extensionId, runtime);
        return runtime;
      }

      // Special-case adapter for fluxcore current API (exports getFluxCore singleton)
      if (typeof mod?.getFluxCore === 'function') {
        const runtime: LoadedExtensionRuntime = {
          onInstall: async (accountId: string) => {
            const ext = mod.getFluxCore();
            if (typeof ext?.onInstall === 'function') {
              await ext.onInstall(accountId);
            }
          },
          onUninstall: async (accountId: string) => {
            const ext = mod.getFluxCore();
            if (typeof ext?.onUninstall === 'function') {
              await ext.onUninstall(accountId);
            }
          },
          onEnable: async (accountId: string) => {
            const ext = mod.getFluxCore();
            if (typeof ext?.onEnable === 'function') {
              await ext.onEnable(accountId);
            }
          },
          onDisable: async (accountId: string) => {
            const ext = mod.getFluxCore();
            if (typeof ext?.onDisable === 'function') {
              await ext.onDisable(accountId);
            }
          },
          onConfigUpdate: async (accountId: string, config: Record<string, unknown>) => {
            const ext = mod.getFluxCore();
            if (typeof ext?.onConfigChange === 'function') {
              await ext.onConfigChange(accountId, config);
              return;
            }
            if (typeof ext?.onConfigUpdate === 'function') {
              await ext.onConfigUpdate(accountId, config);
            }
          },
          onMessage: async (params: any) => {
            const ext = mod.getFluxCore();
            if (typeof ext?.onMessage === 'function') {
              return await ext.onMessage(params);
            }
            return null;
          },
          generateResponse: async (params: any) => {
            const ext = mod.getFluxCore();
            if (typeof ext?.generateResponse === 'function') {
              return await ext.generateResponse(params);
            }
            return null;
          },
        };

        loadedExtensions.set(extensionId, runtime);
        return runtime;
      }

      return null;
    } catch (error: any) {
      console.warn(`[ExtensionHost] Failed to load runtime for ${extensionId}:`, error?.message || error);
      return null;
    }
  }

  private async bestEffortHook(
    extensionId: string,
    hook: keyof LoadedExtensionRuntime,
    ...args: any[]
  ): Promise<void> {
    try {
      const runtime = await this.loadExtensionRuntime(extensionId);
      const fn = runtime?.[hook];
      if (typeof fn !== 'function') return;
      await (fn as any)(...args);
    } catch (error: any) {
      console.warn(`[ExtensionHost] Hook ${String(hook)} failed for ${extensionId}:`, error?.message || error);
    }
  }

  /**
   * Procesar un mensaje entrante con todas las extensiones habilitadas
   */
  async processMessage(params: ProcessMessageParams): Promise<ProcessMessageResult[]> {
    const { accountId, relationshipId, conversationId } = params;
    const results: ProcessMessageResult[] = [];

    try {
      // Obtener extensiones instaladas y habilitadas
      let installations: any[] = [];
      try {
        installations = await extensionService.getInstalled(accountId);
      } catch (error: any) {
        console.warn('[ExtensionHost] Could not fetch installations:', error.message);
        return results;
      }
      const enabledInstallations = installations.filter((i) => i.enabled);


      // WES-CANON: Sistema de extensiones integradas que corren ANTES que las de la DB
      let fluxi: any = null;
      try {
        // Usar un path más resiliente o un cache
        const fluxcoreFluxi = await import('../../../../extensions/fluxcore-fluxi/src');
        fluxi = fluxcoreFluxi.fluxiExtension;
      } catch (err: any) {
        // Silently fail if not found
      }

      const systemExtensions = fluxi ? [{ id: '@fluxcore/fluxi', runtime: fluxi }] : [];

      // WES-170: Recuperar contexto de WES
      const { workResolver } = await import('../core/WorkResolver');
      const { db, fluxcoreWorkDefinitions } = await import('@fluxcore/db');
      const { eq } = await import('drizzle-orm');

      const wesContext: any = {
        availableWorkDefinitions: await db.select().from(fluxcoreWorkDefinitions).where(eq(fluxcoreWorkDefinitions.accountId, accountId)),
        activeWork: await workResolver.resolve({ accountId, relationshipId, conversationId }).then(res =>
          res.type === 'RESUME_WORK' ? { id: (res as any).workId, state: 'ACTIVE' } : null
        )
      };

      // 1. Ejecutar extensiones de sistema
      for (const sysExt of systemExtensions) {
        try {
          const resultFromExtension = await sysExt.runtime.onMessage({
            accountId,
            extensionId: sysExt.id,
            relationshipId,
            conversationId,
            message: params.message,
            automationMode: params.automationMode,
            wes: wesContext,
            policyContext: params.policyContext,
          });

          if (resultFromExtension) {
            const res: ProcessMessageResult = {
              extensionId: sysExt.id,
              success: true,
              handled: resultFromExtension.handled || false,
              stopPropagation: resultFromExtension.stopPropagation || false,
              actions: resultFromExtension.actions || [],
            };
            results.push(res);
            if (res.stopPropagation) {
              console.log(`[ExtensionHost] Propagation stopped by SYSTEM extension ${sysExt.id}`);
              return results;
            }
          }
        } catch (error: any) {
          console.error(`[ExtensionHost] System extension ${sysExt.id} failed:`, error.message);
        }
      }

      // 2. Ejecutar extensiones de usuario
      for (const installation of enabledInstallations) {
        try {
          const canProcess = permissionValidator.hasAnyPermission(
            installation.grantedPermissions as string[],
            ['read:messages', 'send:messages']
          );

          if (!canProcess.allowed) {
            continue;
          }

          // Obtener contexto para la extensión
          const context = await contextAccess.getContext({
            extensionId: installation.extensionId,
            accountId,
            grantedPermissions: installation.grantedPermissions as string[],
            relationshipId,
            conversationId,
          });

          const runtime = await this.loadExtensionRuntime(installation.extensionId);
          const onMessage = runtime?.onMessage;

          if (typeof onMessage === 'function') {
            const resultFromExtension = await onMessage({
              accountId,
              extensionId: installation.extensionId,
              relationshipId,
              conversationId,
              message: params.message,
              context,
              config: installation.config,
              grantedPermissions: installation.grantedPermissions,
              automationMode: params.automationMode,
              wes: wesContext,
              policyContext: params.policyContext,
            });

            const extensionResult: ProcessMessageResult = {
              extensionId: installation.extensionId,
              success: true,
              handled: resultFromExtension?.handled || false,
              stopPropagation: resultFromExtension?.stopPropagation || false,
              actions: resultFromExtension?.actions || [],
            };

            results.push(extensionResult);

            if (extensionResult.stopPropagation) {
              console.log(`[ExtensionHost] Propagation stopped by extension ${installation.extensionId}`);
              break;
            }
          }
        } catch (error: any) {
          results.push({
            extensionId: installation.extensionId,
            success: false,
            error: error.message,
          });
        }
      }

      return results;
    } catch (err: any) {
      try { require('fs').appendFileSync('AI_TEST.log', `[${new Date().toISOString()}] ExtensionHost: CRITICAL ERROR: ${err.message}\n`); } catch { }
      return results;
    }
  }

  async onInstall(accountId: string, extensionId: string): Promise<void> {
    await this.bestEffortHook(extensionId, 'onInstall', accountId);
  }

  async onUninstall(accountId: string, extensionId: string): Promise<void> {
    await this.bestEffortHook(extensionId, 'onUninstall', accountId);
  }

  async onEnable(accountId: string, extensionId: string): Promise<void> {
    await this.bestEffortHook(extensionId, 'onEnable', accountId);
  }

  async onDisable(accountId: string, extensionId: string): Promise<void> {
    await this.bestEffortHook(extensionId, 'onDisable', accountId);
  }

  async onConfigUpdate(accountId: string, extensionId: string, config: Record<string, unknown>): Promise<void> {
    await this.bestEffortHook(extensionId, 'onConfigUpdate', accountId, config);
    await this.bestEffortHook(extensionId, 'onConfigChange', accountId, config);
  }

  async installPreinstalledExtensions(accountId: string): Promise<void> {
    const preinstalled = manifestLoader.getPreinstalledManifests();

    for (const manifest of preinstalled) {
      try {
        const defaultConfig = manifestLoader.getDefaultConfig(manifest.id);

        const installation = await extensionService.install({
          accountId,
          extensionId: manifest.id,
          version: manifest.version,
          config: defaultConfig,
          grantedPermissions: manifest.permissions,
        });

        await this.onInstall(accountId, manifest.id);
        await this.onConfigUpdate(accountId, manifest.id, (installation as any).config || defaultConfig);
        await this.onEnable(accountId, manifest.id);
      } catch (error: any) {
        if (!error.message.includes('already installed')) {
          console.error(`Failed to install preinstalled extension ${manifest.id}:`, error);
        }
      }
    }
  }

  getAvailableExtensions(): ExtensionManifest[] {
    return manifestLoader.getAllManifests();
  }

  getExtensionManifest(extensionId: string): ExtensionManifest | null {
    return manifestLoader.getManifest(extensionId);
  }

  validateConfig(extensionId: string, config: Record<string, any>): { valid: boolean; errors: string[] } {
    const manifest = manifestLoader.getManifest(extensionId);
    if (!manifest) {
      return { valid: false, errors: [`Extension ${extensionId} not found`] };
    }

    if (!manifest.configSchema) {
      return { valid: true, errors: [] };
    }

    const errors: string[] = [];

    for (const [key, schema] of Object.entries(manifest.configSchema)) {
      const value = config[key];
      if (value === undefined) continue;

      const expectedType = schema.type;
      const actualType = Array.isArray(value) ? 'array' : typeof value;

      if (actualType !== expectedType) {
        errors.push(`Config "${key}" must be of type ${expectedType}, got ${actualType}`);
      }

      if (schema.enum && !schema.enum.includes(value)) {
        errors.push(`Config "${key}" must be one of: ${schema.enum.join(', ')}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async getAIAccountConfig(accountId: string): Promise<any> {
    return aiService.getAccountConfig(accountId);
  }

  async getAIAutoReplyDelayMs(accountId: string): Promise<number> {
    return aiService.getAutoReplyDelayMs(accountId);
  }

  stripFluxCorePromoMarker(text: string): { text: string; promo: boolean } {
    return aiService.stripFluxCorePromoMarker(text);
  }

  appendFluxCoreBrandingFooter(text: string): string {
    return aiService.appendFluxCoreBrandingFooter(text);
  }

  getSuggestionBrandingDecision(suggestionId?: string | null): { promo: boolean } {
    return aiService.getSuggestionBrandingDecision(suggestionId);
  }

  async generateAIResponse(
    conversationId: string,
    recipientAccountId: string,
    lastMessageContent: string,
    options: { mode?: 'suggest' | 'auto'; triggerMessageId?: string; triggerMessageCreatedAt?: Date; traceId?: string; policyContext?: FluxPolicyContext } = {}
  ): Promise<Awaited<ReturnType<typeof aiService.generateResponse>>> {
    return aiService.generateResponse(conversationId, recipientAccountId, lastMessageContent, options);
  }

  async tryCreateWelcomeConversation(params: { newAccountId: string; userName: string }): Promise<void> {
    return aiService.tryCreateWelcomeConversation(params);
  }
}

export const extensionHost = new ExtensionHostService();
