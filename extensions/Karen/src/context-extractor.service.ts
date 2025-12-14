/**
 * Context Extractor Service
 * Extension Karen - Website Builder
 * Extrae entidades semánticas del contenido del sitio para IA
 */

import { mdxParser, type ASTNode } from './mdx-parser.service';
import { websiteService, type WebsiteSiteConfig, type WebsitePage } from './website.service';
import { db, extensionContexts } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

export interface ExtractedService {
  name: string;
  description?: string;
  price?: string;
  duration?: string;
  category?: string;
}

export interface ExtractedFAQ {
  question: string;
  answer: string;
}

export interface ExtractedContact {
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
}

export interface ExtractedSemanticContext {
  services: ExtractedService[];
  faqs: ExtractedFAQ[];
  operational: ExtractedContact;
  keywords: string[];
  summary: string;
}

const EXTENSION_ID = '@fluxcore/website-builder';
const CONTEXT_TYPE = 'website_semantic';

class ContextExtractorService {
  async extractAndSave(accountId: string): Promise<ExtractedSemanticContext> {
    const config = await websiteService.getByAccountId(accountId);
    if (!config) throw new Error(`Website config not found for account ${accountId}`);

    const pages = (config.pages || []) as WebsitePage[];
    const siteConfig = config.config as WebsiteSiteConfig;
    const context = this.extractFromPages(pages, siteConfig);

    await this.saveContext(accountId, context);
    return context;
  }

  private extractFromPages(pages: WebsitePage[], siteConfig: WebsiteSiteConfig): ExtractedSemanticContext {
    const services: ExtractedService[] = [];
    const faqs: ExtractedFAQ[] = [];
    const keywords: string[] = [];
    const allText: string[] = [];

    const operational: ExtractedContact = {
      phone: siteConfig.company?.phone,
      address: siteConfig.company?.address,
    };

    for (const page of pages) {
      const parsed = mdxParser.parse(page.content);
      if (parsed.frontMatter.keywords) keywords.push(...(parsed.frontMatter.keywords as string[]));
      allText.push(mdxParser.extractPlainText(parsed.ast));
      services.push(...this.extractServices(parsed.ast, page.path));
      faqs.push(...this.extractFAQs(parsed.ast));
      this.extractContactInfo(parsed.ast, operational);
    }

    const summary = this.generateSummary(allText.join(' '), siteConfig);
    return { services, faqs, operational, keywords: [...new Set(keywords)], summary };
  }

  private extractServices(ast: ASTNode[], pagePath: string): ExtractedService[] {
    const services: ExtractedService[] = [];
    const isServicesPage = pagePath.includes('servicio');

    for (const node of ast) {
      if (node.type === 'block' && (node.name === 'services' || node.name === 'features' || isServicesPage)) {
        for (const child of node.children) {
          if (child.type === 'component' && child.name === 'card') {
            services.push({ name: child.props.title || 'Servicio', description: child.children || undefined });
          }
          if (child.type === 'heading') services.push({ name: child.text });
          if (child.type === 'list') child.items.forEach(item => services.push({ name: item }));
        }
      }
      if (node.type === 'list' && isServicesPage) {
        node.items.forEach(item => {
          const match = item.match(/^(.+?)[\-:]\s*(.*)$/);
          services.push(match ? { name: match[1].trim(), description: match[2].trim() || undefined } : { name: item.trim() });
        });
      }
      if (node.type === 'block') services.push(...this.extractServices(node.children, pagePath));
    }
    return services;
  }

  private extractFAQs(ast: ASTNode[]): ExtractedFAQ[] {
    const faqs: ExtractedFAQ[] = [];
    for (let i = 0; i < ast.length; i++) {
      const node = ast[i];
      if (node.type === 'block' && node.name === 'faq') {
        let currentQuestion: string | null = null;
        for (const child of node.children) {
          if (child.type === 'heading' && child.text.includes('?')) currentQuestion = child.text;
          else if (child.type === 'paragraph' && currentQuestion) {
            faqs.push({ question: currentQuestion, answer: child.content });
            currentQuestion = null;
          }
        }
      }
      if (node.type === 'heading' && node.text.includes('?')) {
        const nextNode = ast[i + 1];
        if (nextNode && nextNode.type === 'paragraph') faqs.push({ question: node.text, answer: nextNode.content });
      }
      if (node.type === 'block') faqs.push(...this.extractFAQs(node.children));
    }
    return faqs;
  }

  private extractContactInfo(ast: ASTNode[], contact: ExtractedContact): void {
    for (const node of ast) {
      if (node.type === 'paragraph') {
        const text = node.content;
        const phoneMatch = text.match(/(?:tel|teléfono|phone|móvil)[:\s]*([+\d\s\-()]+)/i);
        if (phoneMatch && !contact.phone) contact.phone = phoneMatch[1].trim();
        const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch && !contact.email) contact.email = emailMatch[0];
        const hoursMatch = text.match(/(?:horario|hours|abierto)[:\s]*(.+)/i);
        if (hoursMatch && !contact.hours) contact.hours = hoursMatch[1].trim();
        const addressMatch = text.match(/(?:dirección|address|ubicación)[:\s]*(.+)/i);
        if (addressMatch && !contact.address) contact.address = addressMatch[1].trim();
      }
      if (node.type === 'block') this.extractContactInfo(node.children, contact);
    }
  }

  private generateSummary(allText: string, siteConfig: WebsiteSiteConfig): string {
    const companyName = siteConfig.company?.commercialName || siteConfig.name || 'Empresa';
    const activity = siteConfig.company?.activity || '';
    const textPreview = allText.slice(0, 500).replace(/\s+/g, ' ').trim();
    return activity ? `${companyName}: ${activity}. ${textPreview}` : `${companyName}. ${textPreview}`;
  }

  private async saveContext(accountId: string, context: ExtractedSemanticContext): Promise<void> {
    const existing = await db.select().from(extensionContexts)
      .where(and(eq(extensionContexts.extensionId, EXTENSION_ID), eq(extensionContexts.accountId, accountId), eq(extensionContexts.contextType, CONTEXT_TYPE)))
      .limit(1);

    const payload = { ...context, extractedAt: new Date().toISOString() };

    if (existing.length > 0) {
      await db.update(extensionContexts).set({ payload, updatedAt: new Date() }).where(eq(extensionContexts.id, existing[0].id));
    } else {
      await db.insert(extensionContexts).values({ extensionId: EXTENSION_ID, accountId, contextType: CONTEXT_TYPE, payload });
    }
    console.log(`[ContextExtractor] Saved context for account ${accountId}`);
  }

  async getContext(accountId: string): Promise<ExtractedSemanticContext | null> {
    const [result] = await db.select().from(extensionContexts)
      .where(and(eq(extensionContexts.extensionId, EXTENSION_ID), eq(extensionContexts.accountId, accountId), eq(extensionContexts.contextType, CONTEXT_TYPE)))
      .limit(1);
    return result ? result.payload as ExtractedSemanticContext : null;
  }

  formatForPrompt(context: ExtractedSemanticContext): string {
    const parts: string[] = [];
    if (context.summary) parts.push(`RESUMEN: ${context.summary}`);
    if (context.services.length > 0) parts.push(`SERVICIOS:\n${context.services.map(s => s.description ? `- ${s.name}: ${s.description}` : `- ${s.name}`).join('\n')}`);
    const ops: string[] = [];
    if (context.operational.phone) ops.push(`Teléfono: ${context.operational.phone}`);
    if (context.operational.email) ops.push(`Email: ${context.operational.email}`);
    if (context.operational.hours) ops.push(`Horario: ${context.operational.hours}`);
    if (context.operational.address) ops.push(`Dirección: ${context.operational.address}`);
    if (ops.length > 0) parts.push(`CONTACTO:\n${ops.join('\n')}`);
    if (context.faqs.length > 0) parts.push(`PREGUNTAS FRECUENTES:\n${context.faqs.map(f => `P: ${f.question}\nR: ${f.answer}`).join('\n\n')}`);
    return parts.join('\n\n');
  }
}

export const contextExtractor = new ContextExtractorService();
