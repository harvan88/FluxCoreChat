import { db, templates, fluxcoreTemplateSettings, templateAssets, assets, type TemplateVariable } from '@fluxcore/db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { templateService } from '../services/template.service';
import { fluxCoreTemplateSettingsService } from '../services/fluxcore/template-settings.service';

/**
 * Script de Sincronización Segura de Plantillas (v1.2)
 * 
 * Lee el archivo Blueprint JSON y actualiza la base de datos de Ragno.
 * - Modo DRY_RUN por defecto.
 * - Crea nuevas plantillas.
 * - Actualiza existentes (contenido e instrucciones).
 * - Marca legados no presentes en JSON como 'legacy-depurar-manual'.
 */

const ACCOUNT_ID = '2fef52df-7262-46c5-96ba-7fd22eea188c'; // Ragno
const DRY_RUN = process.env.DRY_RUN !== 'false'; // Default to true unless explicitly 'false'

async function sync() {
  console.log(`\n🚀 INICIANDO SINCRONIZACIÓN DE PLANTILLAS (Account: ${ACCOUNT_ID})`);
  console.log(`📝 Modo: ${DRY_RUN ? '🔍 DRY_RUN (SIMULACIÓN)' : '🔥 LIVE (ESCRITURA REAL)'}\n`);

  const blueprintPath = join(process.cwd(), 'ragno-blueprint-templates.json');
  const blueprintData = JSON.parse(readFileSync(blueprintPath, 'utf-8'));

  // 1. Obtener estado actual de la DB
  const currentTemplates = await db.select().from(templates).where(eq(templates.accountId, ACCOUNT_ID));
  const currentMap = new Map(currentTemplates.map(t => [t.name, t]));
  const processedNames = new Set();

  console.log(`📊 Plantillas en DB: ${currentTemplates.length}`);
  console.log(`📋 Plantillas en JSON: ${blueprintData.length}\n`);

  // 2. Iterar sobre el Blueprint
  for (const item of blueprintData) {
    const existing = currentMap.get(item.name);
    processedNames.add(item.name);

    if (!existing) {
      // CREAR NUEVA
      console.log(`[NEW] ➕ Creando: "${item.name}"`);
      if (!DRY_RUN) {
        const newTemplate = await templateService.createTemplate({
          accountId: ACCOUNT_ID,
          name: item.name,
          content: item.content,
          category: item.category,
          variables: item.variables,
          tags: [...item.tags, 'sync-v1.2'],
          isActive: true
        });

        if (item.aiSettings) {
          await fluxCoreTemplateSettingsService.updateSettings(
            newTemplate.id,
            item.aiSettings.authorizeForAI,
            item.aiSettings.aiUsageInstructions,
            {
              aiIncludeName: item.aiSettings.aiIncludeName,
              aiIncludeContent: item.aiSettings.aiIncludeContent,
              aiIncludeInstructions: item.aiSettings.aiIncludeInstructions
            }
          );
        }
        
        // Sincronizar Assets por nombre
        if (item.assets && item.assets.length > 0) {
          for (const assetRef of item.assets) {
            const [foundAsset] = await db.select().from(assets).where(and(eq(assets.accountId, ACCOUNT_ID), eq(assets.name, assetRef.assetName))).limit(1);
            if (foundAsset) {
               await db.insert(templateAssets).values({
                 templateId: newTemplate.id,
                 assetId: foundAsset.id,
                 slot: assetRef.slot
               });
            } else {
               console.warn(`  ⚠️ Asset no encontrado: "${assetRef.assetName}"`);
            }
          }
        }
      }
    } else {
      // ACTUALIZAR EXISTENTE
      const hasChanges = existing.content !== item.content || 
                         existing.category !== item.category || 
                         JSON.stringify(existing.variables) !== JSON.stringify(item.variables);

      if (hasChanges) {
        console.log(`[UPDATE] 📝 Actualizando: "${item.name}"`);
        if (!DRY_RUN) {
          await templateService.updateTemplate(ACCOUNT_ID, existing.id, {
            content: item.content,
            category: item.category,
            variables: item.variables,
            tags: [...(existing.tags as string[] || []), 'sync-v1.2'].filter((v, i, a) => a.indexOf(v) === i)
          });
        }
      } else {
        console.log(`[OK] ✅ Sin cambios: "${item.name}"`);
      }

      // Sincronizar Settings de IA siempre (son fundamentales para el cerebro)
      if (item.aiSettings) {
        if (!DRY_RUN) {
          await fluxCoreTemplateSettingsService.updateSettings(
            existing.id,
            item.aiSettings.authorizeForAI,
            item.aiSettings.aiUsageInstructions,
            {
              aiIncludeName: item.aiSettings.aiIncludeName,
              aiIncludeContent: item.aiSettings.aiIncludeContent,
              aiIncludeInstructions: item.aiSettings.aiIncludeInstructions
            }
          );
        }
      }
    }
  }

  // 3. Manejar plantillas LEGACY (presentes en DB pero no en JSON)
  const legacyTemplates = currentTemplates.filter(t => !processedNames.has(t.name));
  if (legacyTemplates.length > 0) {
    console.log(`\n⚠️  DETECTADAS ${legacyTemplates.length} PLANTILLAS LEGACY (No están en el JSON):`);
    for (const legacy of legacyTemplates) {
      console.log(`[LEGACY] 标记 Marcar para depurar: "${legacy.name}"`);
      if (!DRY_RUN) {
        const newTags = [...(legacy.tags as string[] || []), 'legacy-depurar-manual'].filter((v, i, a) => a.indexOf(v) === i);
        await templateService.updateTemplate(ACCOUNT_ID, legacy.id, {
          isActive: false, // Desactivar para que no saturen el cerebro
          tags: newTags
        });
      }
    }
  }

  console.log(`\n✨ OPERACIÓN COMPLETADA SEGÚN EL MODO ESPECIFICADO.\n`);
}

sync().catch(console.error);
