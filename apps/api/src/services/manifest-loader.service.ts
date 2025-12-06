/**
 * Manifest Loader Service
 * FC-155: Carga y validación de manifests de extensiones
 */

import type { ExtensionManifest, ContextPermission } from '@fluxcore/types';
import * as fs from 'fs';
import * as path from 'path';

// Extensiones registradas (built-in)
const builtInExtensions: Map<string, ExtensionManifest> = new Map();

// Manifest de @fluxcore/core-ai (preinstalada)
const coreAiManifest: ExtensionManifest = {
  id: '@fluxcore/core-ai',
  name: 'FluxCore AI',
  version: '1.0.0',
  description: 'IA contextual por defecto para respuestas automáticas',
  author: 'FluxCore',
  preinstalled: true,
  permissions: [
    'read:context.public',
    'read:context.private',
    'read:context.relationship',
    'read:context.history',
    'write:context.overlay',
    'send:messages',
    'modify:automation',
  ],
  configSchema: {
    enabled: { type: 'boolean', default: true, description: 'Habilitar IA' },
    mode: { 
      type: 'string', 
      default: 'suggest',
      enum: ['suggest', 'auto', 'off'],
      description: 'Modo de operación: suggest (sugiere), auto (envía automático), off (desactivado)'
    },
    responseDelay: { 
      type: 'number', 
      default: 30,
      description: 'Segundos de espera antes de responder automáticamente'
    },
    apiKey: {
      type: 'string',
      default: '',
      description: 'API Key para el proveedor de IA (Groq)'
    },
  },
};

// Registrar extensiones built-in
builtInExtensions.set(coreAiManifest.id, coreAiManifest);

class ManifestLoaderService {
  private manifests: Map<string, ExtensionManifest> = new Map(builtInExtensions);

  /**
   * Obtener manifest de una extensión
   */
  getManifest(extensionId: string): ExtensionManifest | null {
    return this.manifests.get(extensionId) || null;
  }

  /**
   * Obtener todas las extensiones disponibles
   */
  getAllManifests(): ExtensionManifest[] {
    return Array.from(this.manifests.values());
  }

  /**
   * Obtener extensiones preinstaladas
   */
  getPreinstalledManifests(): ExtensionManifest[] {
    return this.getAllManifests().filter(m => m.preinstalled);
  }

  /**
   * Validar manifest
   */
  validateManifest(manifest: Partial<ExtensionManifest>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!manifest.id || typeof manifest.id !== 'string') {
      errors.push('Manifest must have a valid "id" string');
    }
    if (!manifest.name || typeof manifest.name !== 'string') {
      errors.push('Manifest must have a valid "name" string');
    }
    if (!manifest.version || !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      errors.push('Manifest must have a valid semver "version"');
    }
    if (!manifest.description || typeof manifest.description !== 'string') {
      errors.push('Manifest must have a valid "description" string');
    }
    if (!manifest.author || typeof manifest.author !== 'string') {
      errors.push('Manifest must have a valid "author" string');
    }
    if (!Array.isArray(manifest.permissions)) {
      errors.push('Manifest must have a "permissions" array');
    } else {
      const validPermissions: ContextPermission[] = [
        'read:context.public',
        'read:context.private',
        'read:context.relationship',
        'read:context.history',
        'read:context.overlay',
        'write:context.overlay',
        'send:messages',
        'modify:automation',
        'read:messages',
        'write:enrichments',
        'tools:register',
      ];
      for (const perm of manifest.permissions) {
        if (!validPermissions.includes(perm as ContextPermission)) {
          errors.push(`Invalid permission: ${perm}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Registrar una extensión desde un directorio
   */
  async loadFromDirectory(extensionPath: string): Promise<ExtensionManifest | null> {
    const manifestPath = path.join(extensionPath, 'manifest.json');
    
    try {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(content) as ExtensionManifest;
      
      const validation = this.validateManifest(manifest);
      if (!validation.valid) {
        console.error(`Invalid manifest at ${manifestPath}:`, validation.errors);
        return null;
      }

      this.manifests.set(manifest.id, manifest);
      return manifest;
    } catch (error) {
      console.error(`Failed to load manifest from ${manifestPath}:`, error);
      return null;
    }
  }

  /**
   * Obtener configuración por defecto de una extensión
   */
  getDefaultConfig(extensionId: string): Record<string, any> {
    const manifest = this.getManifest(extensionId);
    if (!manifest || !manifest.configSchema) {
      return {};
    }

    const config: Record<string, any> = {};
    for (const [key, schema] of Object.entries(manifest.configSchema)) {
      if (schema.default !== undefined) {
        config[key] = schema.default;
      }
    }
    return config;
  }
}

export const manifestLoader = new ManifestLoaderService();
