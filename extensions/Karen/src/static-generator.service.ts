/**
 * Static Generator Service
 * Extension Karen - Website Builder
 * Genera HTML estático desde AST de MDX
 */

import { mdxParser, type ASTNode, type ParsedMDX } from './mdx-parser.service';
import { websiteService, type WebsiteSiteConfig, type WebsitePage } from './website.service';
import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface GeneratedPage {
  path: string;
  html: string;
  title: string;
  description?: string;
}

export interface GeneratedSite {
  pages: GeneratedPage[];
  sitemap: string;
  buildHash: string;
  generatedAt: Date;
}

export interface ThemeConfig {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
}

const THEMES: Record<string, ThemeConfig> = {
  default: {
    primaryColor: '#3b82f6',
    backgroundColor: '#0d0d0d',
    textColor: '#f5f5f5',
    accentColor: '#3b82f6',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  minimal: {
    primaryColor: '#000000',
    backgroundColor: '#ffffff',
    textColor: '#1a1a1a',
    accentColor: '#0066cc',
    fontFamily: 'Georgia, serif',
  },
  corporate: {
    primaryColor: '#1e40af',
    backgroundColor: '#f8fafc',
    textColor: '#0f172a',
    accentColor: '#3b82f6',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
};

class StaticGeneratorService {
  private outputDir: string;

  constructor() {
    this.outputDir = path.join(process.cwd(), 'public', 'sites');
  }

  async generateSite(accountId: string): Promise<GeneratedSite> {
    const config = await websiteService.getByAccountId(accountId);
    if (!config) throw new Error(`Website config not found for account ${accountId}`);

    const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
    if (!account) throw new Error(`Account ${accountId} not found`);

    const alias = account.alias || account.username;
    const siteConfig = config.config as WebsiteSiteConfig;
    const pages = (config.pages || []) as WebsitePage[];
    const theme = THEMES[siteConfig.theme] || THEMES.default;

    const generatedPages: GeneratedPage[] = [];

    for (const page of pages) {
      const parsed = mdxParser.parse(page.content);
      const html = this.generatePage(parsed, page, siteConfig, theme, alias);
      generatedPages.push({
        path: page.path,
        html,
        title: page.title || parsed.frontMatter.title as string || siteConfig.name || 'Home',
        description: page.description || parsed.frontMatter.description as string,
      });
    }

    const sitemap = this.generateSitemap(generatedPages, alias);
    const contentHash = crypto.createHash('md5').update(JSON.stringify(generatedPages)).digest('hex');

    const site: GeneratedSite = { pages: generatedPages, sitemap, buildHash: contentHash, generatedAt: new Date() };

    await this.saveSite(alias, site);
    return site;
  }

  private generatePage(parsed: ParsedMDX, pageData: WebsitePage, siteConfig: WebsiteSiteConfig, theme: ThemeConfig, alias: string): string {
    const title = pageData.title || parsed.frontMatter.title as string || siteConfig.name || 'Page';
    const description = pageData.description || parsed.frontMatter.description as string || '';
    const bodyContent = this.renderAST(parsed.ast);
    const navigation = this.generateNavigation(siteConfig, alias, pageData.path);

    return `<!DOCTYPE html>
<html lang="${siteConfig.language || 'es'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)} | ${this.escapeHtml(siteConfig.name || alias)}</title>
  <meta name="description" content="${this.escapeHtml(description)}">
  <meta property="og:title" content="${this.escapeHtml(title)}">
  <meta property="og:description" content="${this.escapeHtml(description)}">
  <style>${this.generateCSS(theme)}</style>
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a href="/${alias}" class="site-logo">${this.escapeHtml(siteConfig.name || alias)}</a>
      ${navigation}
    </div>
  </header>
  <main class="site-main"><div class="container">${bodyContent}</div></main>
  <footer class="site-footer">
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} ${this.escapeHtml(siteConfig.company?.commercialName || siteConfig.name || alias)}</p>
      ${siteConfig.company?.phone ? `<p>Tel: ${this.escapeHtml(siteConfig.company.phone)}</p>` : ''}
    </div>
  </footer>
  <div id="fluxcore-chat-widget" data-alias="${alias}"></div>
  <script src="/widget.js" defer></script>
</body>
</html>`;
  }

  private generateCSS(theme: ThemeConfig): string {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      :root { --primary: ${theme.primaryColor}; --bg: ${theme.backgroundColor}; --text: ${theme.textColor}; --accent: ${theme.accentColor}; --font: ${theme.fontFamily}; }
      body { font-family: var(--font); background: var(--bg); color: var(--text); line-height: 1.6; min-height: 100vh; display: flex; flex-direction: column; }
      .container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
      .site-header { background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(255,255,255,0.1); position: sticky; top: 0; z-index: 100; }
      .site-header .container { display: flex; align-items: center; justify-content: space-between; padding: 1rem; }
      .site-logo { font-size: 1.5rem; font-weight: 700; color: var(--text); text-decoration: none; }
      .site-nav { display: flex; gap: 1.5rem; }
      .site-nav a { color: var(--text); text-decoration: none; opacity: 0.8; transition: opacity 0.2s; }
      .site-nav a:hover, .site-nav a.active { opacity: 1; color: var(--accent); }
      .site-main { flex: 1; padding: 3rem 0; }
      h1, h2, h3, h4 { margin: 2rem 0 1rem; } h1 { font-size: 2.5rem; } h2 { font-size: 2rem; } h3 { font-size: 1.5rem; }
      p { margin: 1rem 0; } ul, ol { margin: 1rem 0; padding-left: 2rem; } li { margin: 0.5rem 0; }
      a { color: var(--accent); }
      .site-footer { background: rgba(0,0,0,0.5); padding: 2rem 0; text-align: center; opacity: 0.7; font-size: 0.875rem; }
      #fluxcore-chat-widget { position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 1000; }
      @media (max-width: 768px) { .site-header .container { flex-direction: column; gap: 1rem; } h1 { font-size: 2rem; } }
    `;
  }

  private renderAST(ast: ASTNode[]): string {
    return ast.map(node => this.renderNode(node)).join('\n');
  }

  private renderNode(node: ASTNode): string {
    switch (node.type) {
      case 'heading': return `<h${node.level}>${this.escapeHtml(node.text)}</h${node.level}>`;
      case 'paragraph': return `<p>${this.escapeHtml(node.content)}</p>`;
      case 'list': return `<${node.ordered ? 'ol' : 'ul'}>${node.items.map(i => `<li>${this.escapeHtml(i)}</li>`).join('')}</${node.ordered ? 'ol' : 'ul'}>`;
      case 'block': return `<section class="block-${node.name}">${this.renderAST(node.children)}</section>`;
      case 'component': return this.renderComponent(node);
      case 'text': return this.escapeHtml(node.content);
      default: return '';
    }
  }

  private renderComponent(node: any): string {
    const { name, variant, props, children } = node;
    switch (name) {
      case 'button': return `<a href="${this.escapeHtml(props.link || '#')}" class="component-button${variant ? ' ' + variant : ''}">${this.escapeHtml(children)}</a>`;
      case 'card': return `<div class="component-card">${props.title ? `<h3>${this.escapeHtml(props.title)}</h3>` : ''}<p>${this.escapeHtml(children)}</p></div>`;
      default: return `<div class="component-${name}">${this.escapeHtml(children)}</div>`;
    }
  }

  private generateNavigation(siteConfig: WebsiteSiteConfig, alias: string, currentPath: string): string {
    const menuItems = siteConfig.menus?.main || [];
    if (menuItems.length === 0) return '';
    return `<nav class="site-nav">${menuItems.map(item => {
      const isActive = item.path === currentPath;
      const href = item.path === '/' ? `/${alias}` : `/${alias}${item.path}`;
      return `<a href="${href}"${isActive ? ' class="active"' : ''}>${this.escapeHtml(item.title)}</a>`;
    }).join('')}</nav>`;
  }

  private generateSitemap(pages: GeneratedPage[], alias: string): string {
    const baseUrl = process.env.SITE_URL || 'https://meetgar.com';
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(page => {
      const loc = page.path === '/' ? `${baseUrl}/${alias}` : `${baseUrl}/${alias}${page.path}`;
      return `<url><loc>${loc}</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod></url>`;
    }).join('')}</urlset>`;
  }

  private async saveSite(alias: string, site: GeneratedSite): Promise<void> {
    const siteDir = path.join(this.outputDir, alias);
    if (!fs.existsSync(siteDir)) fs.mkdirSync(siteDir, { recursive: true });

    for (const page of site.pages) {
      const pagePath = page.path === '/' ? 'index.html' : `${page.path.slice(1)}/index.html`;
      const fullPath = path.join(siteDir, pagePath);
      const pageDir = path.dirname(fullPath);
      if (!fs.existsSync(pageDir)) fs.mkdirSync(pageDir, { recursive: true });
      fs.writeFileSync(fullPath, page.html, 'utf-8');
    }

    fs.writeFileSync(path.join(siteDir, 'sitemap.xml'), site.sitemap, 'utf-8');
    console.log(`[StaticGenerator] Site saved to ${siteDir}`);
  }

  private escapeHtml(str: string): string {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  getSiteDirectory(alias: string): string { return path.join(this.outputDir, alias); }
  siteExists(alias: string): boolean { return fs.existsSync(path.join(this.outputDir, alias, 'index.html')); }
}

export const staticGenerator = new StaticGeneratorService();
