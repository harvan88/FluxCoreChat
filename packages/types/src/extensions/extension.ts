import type { MessageEnvelope } from '../services/message-core';
import type { ExtensionManifest } from './manifest';

export interface IExtension {
  manifest: ExtensionManifest;
  
  /**
   * Called when extension is installed
   */
  onInstall?(accountId: string): Promise<void>;
  
  /**
   * Called when extension is uninstalled
   */
  onUninstall?(accountId: string): Promise<void>;
  
  /**
   * Called when extension is enabled
   */
  onEnable?(accountId: string): Promise<void>;
  
  /**
   * Called when extension is disabled
   */
  onDisable?(accountId: string): Promise<void>;
  
  /**
   * Called when a message is received (if extension has permission)
   */
  onMessage?(envelope: MessageEnvelope): Promise<void>;
  
  /**
   * Called when configuration is updated
   */
  onConfigUpdate?(accountId: string, config: Record<string, unknown>): Promise<void>;
}

export interface ExtensionInstallation {
  id: string;
  accountId: string;
  extensionId: string;
  enabled: boolean;
  config: Record<string, unknown>;
  installedAt: Date;
}

export interface ExtensionContext {
  id: string;
  extensionId: string;
  accountId?: string;
  relationshipId?: string;
  conversationId?: string;
  contextType: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
