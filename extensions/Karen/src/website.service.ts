/**
 * Website Service
 * Extension Karen - Website Builder
 * CRUD de configuraciones de sitios web
 */

import { db, websiteConfigs, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

export type WebsiteStatus = 'draft' | 'published' | 'archived';

export interface WebsitePage {
  path: string;
  title: string;
  description?: string;
  content: string;
  frontmatter: Record<string, unknown>;
  updatedAt: string;
}

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

export interface CreateWebsiteParams {
  accountId: string;
  config?: Partial<WebsiteSiteConfig>;
  pages?: WebsitePage[];
}

export interface UpdateWebsiteParams {
  config?: WebsiteSiteConfig;
  pages?: WebsitePage[];
  status?: WebsiteStatus;
}

export interface AddPageParams {
  path: string;
  title: string;
  description?: string;
  content: string;
  frontmatter?: Record<string, unknown>;
}

class WebsiteService {
  async create(params: CreateWebsiteParams) {
    const { accountId, config = {}, pages = [] } = params;

    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    const existing = await this.getByAccountId(accountId);
    if (existing) {
      throw new Error(`Website config already exists for account ${accountId}`);
    }

    const defaultPages: WebsitePage[] = pages.length > 0 ? pages : [{
      path: '/',
      title: account.displayName || 'Home',
      description: `Sitio web de ${account.displayName}`,
      content: `# Bienvenido a ${account.displayName}\n\nEste es tu sitio web. Edítalo desde el panel de administración.`,
      frontmatter: { layout: 'default', menu: 'main' },
      updatedAt: new Date().toISOString(),
    }];

    const defaultConfig: WebsiteSiteConfig = {
      name: account.displayName,
      language: 'es',
      theme: 'default',
      menus: { main: [{ title: 'Inicio', path: '/' }] },
      ...config,
    };

    const [created] = await db
      .insert(websiteConfigs)
      .values({
        accountId,
        config: defaultConfig,
        pages: defaultPages,
        status: 'draft',
      })
      .returning();

    return created;
  }

  async getByAccountId(accountId: string) {
    const [config] = await db
      .select()
      .from(websiteConfigs)
      .where(eq(websiteConfigs.accountId, accountId))
      .limit(1);

    return config || null;
  }

  async getById(id: string) {
    const [config] = await db
      .select()
      .from(websiteConfigs)
      .where(eq(websiteConfigs.id, id))
      .limit(1);

    return config || null;
  }

  async update(accountId: string, params: UpdateWebsiteParams) {
    const updates: any = { updatedAt: new Date() };

    if (params.config !== undefined) updates.config = params.config;
    if (params.pages !== undefined) updates.pages = params.pages;
    if (params.status !== undefined) updates.status = params.status;

    const [updated] = await db
      .update(websiteConfigs)
      .set(updates)
      .where(eq(websiteConfigs.accountId, accountId))
      .returning();

    return updated || null;
  }

  async addPage(accountId: string, page: AddPageParams) {
    const config = await this.getByAccountId(accountId);
    if (!config) {
      throw new Error(`Website config not found for account ${accountId}`);
    }

    const existingPages = (config.pages || []) as WebsitePage[];
    
    if (existingPages.some(p => p.path === page.path)) {
      throw new Error(`Page with path ${page.path} already exists`);
    }

    const newPage: WebsitePage = {
      path: page.path,
      title: page.title,
      description: page.description,
      content: page.content,
      frontmatter: page.frontmatter || {},
      updatedAt: new Date().toISOString(),
    };

    return this.update(accountId, { pages: [...existingPages, newPage] });
  }

  async updatePage(accountId: string, path: string, updates: Partial<AddPageParams>) {
    const config = await this.getByAccountId(accountId);
    if (!config) {
      throw new Error(`Website config not found for account ${accountId}`);
    }

    const pages = (config.pages || []) as WebsitePage[];
    const pageIndex = pages.findIndex(p => p.path === path);
    
    if (pageIndex === -1) {
      throw new Error(`Page with path ${path} not found`);
    }

    pages[pageIndex] = {
      ...pages[pageIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return this.update(accountId, { pages });
  }

  async deletePage(accountId: string, path: string) {
    const config = await this.getByAccountId(accountId);
    if (!config) {
      throw new Error(`Website config not found for account ${accountId}`);
    }

    const pages = (config.pages || []) as WebsitePage[];
    const filteredPages = pages.filter(p => p.path !== path);

    if (filteredPages.length === pages.length) {
      throw new Error(`Page with path ${path} not found`);
    }

    return this.update(accountId, { pages: filteredPages });
  }

  async publish(accountId: string) {
    const config = await this.getByAccountId(accountId);
    if (!config) {
      throw new Error(`Website config not found for account ${accountId}`);
    }

    const [updated] = await db
      .update(websiteConfigs)
      .set({
        status: 'published',
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(websiteConfigs.accountId, accountId))
      .returning();

    return updated;
  }

  async unpublish(accountId: string) {
    return this.update(accountId, { status: 'draft' });
  }

  async archive(accountId: string) {
    return this.update(accountId, { status: 'archived' });
  }

  async delete(accountId: string) {
    const [deleted] = await db
      .delete(websiteConfigs)
      .where(eq(websiteConfigs.accountId, accountId))
      .returning();

    return deleted || null;
  }

  async getPublicAlias(accountId: string): Promise<string | null> {
    const [account] = await db
      .select({ alias: accounts.alias, username: accounts.username })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!account) return null;
    return account.alias || account.username;
  }
}

export const websiteService = new WebsiteService();
