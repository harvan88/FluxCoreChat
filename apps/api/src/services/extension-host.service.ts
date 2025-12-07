/**
 * Extension Host Service
 * FC-154: Servicio principal que coordina extensiones
 */

import { extensionService } from './extension.service';
import { manifestLoader } from './manifest-loader.service';
import { permissionValidator } from './permission-validator.service';
import { contextAccess } from './context-access.service';
import type { IExtension, ExtensionManifest } from '@fluxcore/types';

// Registro de extensiones cargadas
const loadedExtensions: Map<string, IExtension> = new Map();

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
}

export interface ProcessMessageResult {
  extensionId: string;
  success: boolean;
  actions?: any[];
  error?: string;
}

class ExtensionHostService {
  /**
   * Procesar un mensaje entrante con todas las extensiones habilitadas
   */
  async processMessage(params: ProcessMessageParams): Promise<ProcessMessageResult[]> {
    const { accountId, relationshipId, conversationId, message } = params;
    const results: ProcessMessageResult[] = [];

    // Obtener extensiones instaladas y habilitadas
    const installations = await extensionService.getInstalled(accountId);
    const enabledInstallations = installations.filter((i) => i.enabled);

    for (const installation of enabledInstallations) {
      try {
        // Verificar si tiene permiso para procesar mensajes
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

        // Ejecutar la extensión (si está cargada)
        const extension = loadedExtensions.get(installation.extensionId);
        if (extension && extension.onMessage) {
          // En el futuro, aquí se ejecutaría la lógica de la extensión
          // Por ahora, solo registramos que se procesó
          results.push({
            extensionId: installation.extensionId,
            success: true,
            actions: [],
          });
        } else {
          // Extensión no cargada, solo registrar
          results.push({
            extensionId: installation.extensionId,
            success: true,
            actions: [],
          });
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
  }

  /**
   * Instalar extensiones preinstaladas para una nueva cuenta
   */
  async installPreinstalledExtensions(accountId: string): Promise<void> {
    const preinstalled = manifestLoader.getPreinstalledManifests();

    for (const manifest of preinstalled) {
      try {
        const defaultConfig = manifestLoader.getDefaultConfig(manifest.id);
        
        await extensionService.install({
          accountId,
          extensionId: manifest.id,
          version: manifest.version,
          config: defaultConfig,
          grantedPermissions: manifest.permissions,
        });
      } catch (error: any) {
        // Si ya está instalada, ignorar
        if (!error.message.includes('already installed')) {
          console.error(`Failed to install preinstalled extension ${manifest.id}:`, error);
        }
      }
    }
  }

  /**
   * Obtener todas las extensiones disponibles
   */
  getAvailableExtensions(): ExtensionManifest[] {
    return manifestLoader.getAllManifests();
  }

  /**
   * Obtener manifest de una extensión
   */
  getExtensionManifest(extensionId: string): ExtensionManifest | null {
    return manifestLoader.getManifest(extensionId);
  }

  /**
   * Validar configuración de extensión contra su schema
   */
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
      
      if (value === undefined) {
        continue; // Usar default del schema
      }

      // Validar tipo
      const expectedType = schema.type;
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      
      if (actualType !== expectedType) {
        errors.push(`Config "${key}" must be of type ${expectedType}, got ${actualType}`);
      }

      // Validar enum
      if (schema.enum && !schema.enum.includes(value)) {
        errors.push(`Config "${key}" must be one of: ${schema.enum.join(', ')}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export const extensionHost = new ExtensionHostService();
