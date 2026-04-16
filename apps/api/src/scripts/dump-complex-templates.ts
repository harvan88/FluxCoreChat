import { db, templates, fluxcoreTemplateSettings, templateAssets, assets } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function main() {
  const accountId = '2fef52df-7262-46c5-96ba-7fd22eea188c'; // Ragno
  
  const allTemplates = await db
    .select({
      template: templates,
      settings: fluxcoreTemplateSettings,
    })
    .from(templates)
    .leftJoin(fluxcoreTemplateSettings, eq(templates.id, fluxcoreTemplateSettings.templateId))
    .where(eq(templates.accountId, accountId));

  const complexData = [];

  for (const row of allTemplates) {
    const linkedAssets = await db
      .select({
        assetId: assets.id,
        name: assets.name,
        slot: templateAssets.slot,
      })
      .from(templateAssets)
      .innerJoin(assets, eq(templateAssets.assetId, assets.id))
      .where(eq(templateAssets.templateId, row.template.id));

    complexData.push({
      ...row.template,
      aiSettings: row.settings,
      assets: linkedAssets,
    });
  }

  console.log(JSON.stringify(complexData, null, 2));
}

main().catch(console.error);
