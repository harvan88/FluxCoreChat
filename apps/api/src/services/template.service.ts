import { db, templates, templateAssets, type Template, type TemplateVariable } from '@fluxcore/db';
import { eq, and, desc, inArray } from 'drizzle-orm';

export interface TemplateInput {
  name: string;
  content: string;
  category?: string | null;
  variables?: TemplateVariable[];
  tags?: string[];
  isActive?: boolean;
}

export interface TemplateUpdateInput extends Partial<TemplateInput> {}

export interface TemplateWithAssets extends Template {
  assets: TemplateAssetLink[];
}

export interface TemplateAssetLink {
  assetId: string;
  slot: string;
  version: number;
  linkedAt: Date | null;
}

export class TemplateService {
  constructor(private readonly orm = db) {}

  async listTemplates(accountId: string): Promise<TemplateWithAssets[]> {
    const rows = await this.orm
      .select()
      .from(templates)
      .where(eq(templates.accountId, accountId))
      .orderBy(desc(templates.updatedAt));

    return this.attachAssets(rows);
  }

  async getTemplate(accountId: string, templateId: string): Promise<TemplateWithAssets> {
    const template = await this.findTemplate(templateId);
    assertTemplateScope(template?.accountId, accountId);

    const assets = await this.getTemplateAssets(templateId);
    return { ...template!, assets };
  }

  async createTemplate(accountId: string, data: TemplateInput): Promise<TemplateWithAssets> {
    const payload = normalizeTemplateInput(data);
    const [inserted] = await this.orm
      .insert(templates)
      .values({
        accountId,
        name: payload.name,
        content: payload.content,
        category: payload.category || null,
        variables: payload.variables,
        tags: payload.tags,
        isActive: payload.isActive ?? true,
      })
      .returning();

    return { ...inserted, assets: [] };
  }

  async updateTemplate(accountId: string, templateId: string, data: TemplateUpdateInput): Promise<TemplateWithAssets> {
    const existing = await this.findTemplate(templateId);
    assertTemplateScope(existing?.accountId, accountId);

    const payload = normalizeTemplateInput({
      name: data.name ?? existing!.name,
      content: data.content ?? existing!.content,
      category: data.category ?? existing!.category,
      variables: data.variables ?? existing!.variables,
      tags: data.tags ?? existing!.tags,
      isActive: data.isActive ?? existing!.isActive,
    });

    const [updated] = await this.orm
      .update(templates)
      .set({
        name: payload.name,
        content: payload.content,
        category: payload.category || null,
        variables: payload.variables,
        tags: payload.tags,
        isActive: payload.isActive ?? existing!.isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(templates.id, templateId), eq(templates.accountId, accountId)))
      .returning();

    const assets = await this.getTemplateAssets(templateId);
    return { ...updated, assets };
  }

  async deleteTemplate(accountId: string, templateId: string): Promise<void> {
    const existing = await this.findTemplate(templateId);
    assertTemplateScope(existing?.accountId, accountId);

    await this.orm
      .delete(templates)
      .where(and(eq(templates.id, templateId), eq(templates.accountId, accountId)));
  }

  private async findTemplate(templateId: string) {
    const [template] = await this.orm
      .select()
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1);
    if (!template) {
      throw new Error('Template not found');
    }
    return template;
  }

  private async getTemplateAssets(templateId: string): Promise<TemplateAssetLink[]> {
    return await this.orm
      .select({
        assetId: templateAssets.assetId,
        version: templateAssets.version,
        slot: templateAssets.slot,
        linkedAt: templateAssets.linkedAt,
      })
      .from(templateAssets)
      .where(eq(templateAssets.templateId, templateId));
  }

  private async attachAssets(rows: Template[]): Promise<TemplateWithAssets[]> {
    if (rows.length === 0) {
      return [];
    }

    const templateIds = rows.map((t) => t.id);

    const assets = await this.orm
      .select({
        templateId: templateAssets.templateId,
        assetId: templateAssets.assetId,
        version: templateAssets.version,
        slot: templateAssets.slot,
        linkedAt: templateAssets.linkedAt,
      })
      .from(templateAssets)
      .where(inArray(templateAssets.templateId, templateIds));

    const grouped = new Map<string, TemplateAssetLink[]>();
    assets.forEach((asset) => {
      const list = grouped.get(asset.templateId) || [];
      list.push({
        assetId: asset.assetId,
        slot: asset.slot,
        version: asset.version,
        linkedAt: asset.linkedAt,
      });
      grouped.set(asset.templateId, list);
    });

    return rows.map((template) => ({
      ...template,
      assets: grouped.get(template.id) || [],
    }));
  }
}

export function normalizeTemplateInput(input: TemplateInput): Required<Omit<TemplateInput, 'category'>> & Pick<TemplateInput, 'category'> {
  return {
    name: input.name.trim(),
    content: input.content,
    category: input.category ?? null,
    variables: input.variables ?? [],
    tags: input.tags ?? [],
    isActive: input.isActive ?? true,
  };
}

export function assertTemplateScope(templateAccountId: string | undefined, requestedAccountId: string) {
  if (!templateAccountId || templateAccountId !== requestedAccountId) {
    throw new Error('Template does not belong to account');
  }
}

export const templateService = new TemplateService();
