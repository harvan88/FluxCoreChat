import { db, templates, fluxcoreTemplateSettings, templateAssets, assets } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

async function main() {
  const accountId = '2fef52df-7262-46c5-96ba-7fd22eea188c'; // Ragno
  const outputPath = join(process.cwd(), 'ragno-blueprint-templates.json');
  
  console.log(`--- Exportando Blueprint de Plantillas para Ragno (${accountId}) ---\n`);
  
  const allTemplates = await db
    .select({
      template: templates,
      settings: fluxcoreTemplateSettings,
    })
    .from(templates)
    .leftJoin(fluxcoreTemplateSettings, eq(templates.id, fluxcoreTemplateSettings.templateId))
    .where(eq(templates.accountId, accountId));

  const blueprint = [];

  for (const row of allTemplates) {
    // Buscar assets vinculados
    const linkedAssets = await db
      .select({
        name: assets.name,
        slot: templateAssets.slot,
      })
      .from(templateAssets)
      .innerJoin(assets, eq(templateAssets.assetId, assets.id))
      .where(eq(templateAssets.templateId, row.template.id));

    // Mapear al formato Blueprint (Agnóstico e Inteligente)
    blueprint.push({
      name: row.template.name,
      content: row.template.content,
      category: row.template.category || null,
      tags: row.template.tags || [],
      variables: row.template.variables || [],
      aiSettings: row.settings ? {
        authorizeForAI: row.settings.authorizeForAI,
        aiUsageInstructions: row.settings.aiUsageInstructions,
        aiIncludeName: row.settings.aiIncludeName,
        aiIncludeContent: row.settings.aiIncludeContent,
        aiIncludeInstructions: row.settings.aiIncludeInstructions
      } : null,
      assets: linkedAssets.map(a => ({
        assetName: a.name,
        slot: a.slot
      }))
    });
  }

  writeFileSync(outputPath, JSON.stringify(blueprint, null, 2), 'utf-8');
  
  console.log(`✅ Blueprint exportado con éxito: ${outputPath}`);
  console.log(`📊 Total plantillas: ${blueprint.length}`);
}

main().catch(console.error);
