/**
 * Schema: Website Configs
 * Extension Karen - Website Builder
 * Configuración de sitios web estáticos por cuenta
 */

import { pgTable, uuid, varchar, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

/**
 * Tipo de estado del sitio web
 */
export type WebsiteStatus = 'draft' | 'published' | 'archived';

/**
 * Estructura de una página MDX
 */
export interface WebsitePage {
  path: string;           // /servicios, /contacto, etc.
  title: string;          // Título de la página
  description?: string;   // Meta description
  content: string;        // Contenido MDX
  frontmatter: Record<string, unknown>;
  updatedAt: string;
}

/**
 * Configuración del sitio (site.config.yaml parseado)
 */
export interface WebsiteSiteConfig {
  name: string;
  language: string;
  theme: string;
  menus?: {
    main?: Array<{ title: string; path: string }>;
    footer?: Array<{ title: string; path: string }>;
  };
  company?: {
    legalName?: string;
    commercialName?: string;
    activity?: string;
    phone?: string;
    address?: string;
    domain?: string;
  };
}

/**
 * Tabla de configuración de sitios web
 */
export const websiteConfigs = pgTable('website_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Relación con cuenta (usa accounts.alias para URL)
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' })
    .unique(),
  
  // Estado del sitio
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  
  // Configuración del sitio (site.config.yaml parseado)
  config: jsonb('config').notNull().default({}).$type<WebsiteSiteConfig>(),
  
  // Array de páginas MDX
  pages: jsonb('pages').notNull().default([]).$type<WebsitePage[]>(),
  
  // Metadatos de build
  lastBuildAt: timestamp('last_build_at'),
  buildHash: varchar('build_hash', { length: 64 }),
  publishedAt: timestamp('published_at'),
  
  // Dominio personalizado (opcional, para futuro)
  customDomain: varchar('custom_domain', { length: 255 }),
  customDomainVerified: boolean('custom_domain_verified').default(false),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Tipos inferidos
 */
export type WebsiteConfig = typeof websiteConfigs.$inferSelect;
export type NewWebsiteConfig = typeof websiteConfigs.$inferInsert;
