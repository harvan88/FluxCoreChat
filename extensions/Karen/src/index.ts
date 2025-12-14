/**
 * Karen Website Builder Extension
 * Entrypoint principal de la extensión
 */

import { websiteService } from './website.service';
import { mdxParser } from './mdx-parser.service';
import { staticGenerator } from './static-generator.service';
import { contextExtractor } from './context-extractor.service';

export interface KarenExtension {
  id: string;
  name: string;
  version: string;
  
  onInstall(accountId: string): Promise<void>;
  onUninstall(accountId: string): Promise<void>;
  onConfigChange(accountId: string, config: Record<string, unknown>): Promise<void>;
}

export const karenExtension: KarenExtension = {
  id: '@fluxcore/website-builder',
  name: 'Karen Website Builder',
  version: '1.0.0',

  async onInstall(accountId: string): Promise<void> {
    console.log(`[Karen] Installing for account ${accountId}`);
    
    // Crear configuración inicial del sitio web
    try {
      await websiteService.create({ accountId });
      console.log(`[Karen] Created initial website config for ${accountId}`);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  },

  async onUninstall(accountId: string): Promise<void> {
    console.log(`[Karen] Uninstalling from account ${accountId}`);
    
    // Opcional: eliminar configuración del sitio
    // Por defecto mantenemos los datos
  },

  async onConfigChange(accountId: string, config: Record<string, unknown>): Promise<void> {
    console.log(`[Karen] Config changed for ${accountId}:`, config);
    
    // Regenerar sitio si cambia el tema
    if (config.theme) {
      const websiteConfig = await websiteService.getByAccountId(accountId);
      if (websiteConfig && websiteConfig.status === 'published') {
        await staticGenerator.generateSite(accountId);
      }
    }
  },
};

// Exportar servicios para uso externo
export { websiteService } from './website.service';
export { mdxParser } from './mdx-parser.service';
export { staticGenerator } from './static-generator.service';
export { contextExtractor } from './context-extractor.service';

// Exportar tipos
export type { WebsitePage, WebsiteSiteConfig } from './website.service';
export type { ParsedMDX, ASTNode, FrontMatter } from './mdx-parser.service';
export type { GeneratedSite, GeneratedPage } from './static-generator.service';
export type { ExtractedSemanticContext, ExtractedService, ExtractedFAQ } from './context-extractor.service';

export default karenExtension;
