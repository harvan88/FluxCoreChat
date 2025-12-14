/**
 * Website Service
 * Extension Karen - Website Builder
 * Re-exporta desde la extensión Karen para mantener compatibilidad
 * 
 * NOTA: El código original fue movido a extensions/Karen/src/website.service.ts
 * Este archivo solo re-exporta para que las rutas existentes sigan funcionando.
 */

export { 
  websiteService,
  type CreateWebsiteParams,
  type UpdateWebsiteParams,
  type AddPageParams,
  type WebsitePage,
  type WebsiteSiteConfig,
  type WebsiteStatus,
} from '../../../../extensions/Karen/src/website.service';
