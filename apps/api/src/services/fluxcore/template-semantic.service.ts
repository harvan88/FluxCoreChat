import { db, fluxcoreVectorStores, fluxcoreVectorStoreFiles, fluxcoreDocumentChunks, templates, fluxcoreTemplateSettings, assets, type Template } from '@fluxcore/db';
import { eq, and, sql } from 'drizzle-orm';
import { embeddingService } from '../embedding.service';
import { coreEventBus } from '../../core/events';

/**
 * TemplateSemanticService
 * 
 * Gestiona la representación vectorial de las plantillas en FluxCore.
 * Implementa un sistema de SEÑAL CLARA (States) para evitar re-indexaciones innecesarias.
 */
export class TemplateSemanticService {
    private readonly SYSTEM_STORE_NAME = 'SYSTEM_INTERNAL_TEMPLATES';
    private readonly MODEL_NAME = 'paraphrase-multilingual-MiniLM-L12-v2';

    constructor() {
        this.setupListeners();
    }

    private setupListeners() {
        console.log(`[SemanticService] Configurando Listeners...`);
        coreEventBus.on('template.authorization.changed', async (payload: { templateId: string; accountId: string; allowAutomatedUse: boolean }) => {
            await this.syncTemplateVector(payload.templateId, payload.accountId, payload.allowAutomatedUse);
        });

        coreEventBus.on('fluxcore.template.settings.changed', async (payload: { templateId: string; accountId: string; authorizeForAI: boolean }) => {
            await this.syncTemplateVector(payload.templateId, payload.accountId, payload.authorizeForAI);
        });

        coreEventBus.on('schedule.updated', async (payload: { accountId: string }) => {
            console.log(`[SemanticService] 📅 Horarios actualizados para cuenta ${payload.accountId}. Buscando plantillas dependientes...`);
            
            // Buscamos todas las plantillas de la cuenta que usen la variable de sistema de horarios
            const dependentTemplates = await db.select({ id: templates.id })
                .from(templates)
                .where(and(
                    eq(templates.accountId, payload.accountId),
                    sql`content LIKE '%{{system:schedules}}%'`
                ));
            
            for (const t of dependentTemplates) {
                console.log(`[SemanticService] 🔄 Re-indexando proyección de horarios para plantilla: ${t.id}`);
                await this.syncTemplateVector(t.id, payload.accountId, true);
            }
        });
    }

    /**
     * Sincroniza el vector y marca la SEÑAL CLARA en la tabla Assets.
     */
    async syncTemplateVector(templateId: string, accountId: string, allowAutomatedUse: boolean) {
        try {
            if (!allowAutomatedUse) {
                // Si se desactiva, marcamos como 'archived' (no disponible para RAG)
                await db.update(assets).set({ status: 'archived' as any }).where(eq(assets.id, templateId));
                return;
            }

            // Marcamos como 'ready' (pendiente) mientras procesamos
            await db.update(assets).set({ status: 'ready' as any }).where(eq(assets.id, templateId));

            const [settings] = await db.select().from(fluxcoreTemplateSettings).where(eq(fluxcoreTemplateSettings.templateId, templateId)).limit(1);
            const [template] = await db.select().from(templates).where(eq(templates.id, templateId)).limit(1);

            if (!template) return;

            // 🧠 SOBERANÍA MATEMÁTICA: Construimos el bloque de texto completo para el RAG
            // Incluimos Nombre, Instrucciones y el Contenido Hidratado (Verdad del Mundo)
            const { templateService } = await import('../template.service');
            const hydratedContent = await templateService.resolveSystemVariables(template.content, accountId);
            
            let textToEmbed = `PLANTILLA: ${template.name}\n`;
            if (settings?.aiUsageInstructions) {
                textToEmbed += `INSTRUCCIONES: ${settings.aiUsageInstructions}\n`;
            }
            textToEmbed += `CONTENIDO: ${hydratedContent}`;

            if (!textToEmbed) return;

            const { embedding } = await embeddingService.embedWithConfig(textToEmbed, {
                provider: 'local',
                model: this.MODEL_NAME,
                dimensions: 384
            });

            const storeId = await this.getOrCreateSystemStore(accountId);
            await this.getOrCreateSystemFile(templateId, storeId);

            // Búsqueda atómica del fragmento
            const [existing] = await db.select({ id: fluxcoreDocumentChunks.id })
                .from(fluxcoreDocumentChunks)
                .where(and(
                    eq(fluxcoreDocumentChunks.fileId, templateId),
                    eq(fluxcoreDocumentChunks.embeddingModel, this.MODEL_NAME),
                    eq(fluxcoreDocumentChunks.chunkIndex, 0)
                ))
                .limit(1);

            let chunkId: string;
            // IMPORTANTE: Metadatos SOBERANOS con Status ACTIVE
            const metadata = { type: 'template', template_id: templateId, status: 'active' };

            const metadataJson = JSON.stringify(metadata);

            if (existing) {
                chunkId = existing.id;
                // FIX: Forzamos JSONB nativo via SQL para evitar doble serialización
                await db.execute(sql`
                    UPDATE fluxcore_document_chunks 
                    SET content = ${textToEmbed}, 
                        metadata = ${metadataJson}::jsonb,
                        updated_at = NOW()
                    WHERE id = ${chunkId}::uuid
                `);
            } else {
                const inserted = await db.execute(sql`
                    INSERT INTO fluxcore_document_chunks (file_id, account_id, embedding_model, content, chunk_index, token_count, metadata)
                    VALUES (${templateId}::uuid, ${accountId}::uuid, ${this.MODEL_NAME}, ${textToEmbed}, 0, 0, ${metadataJson}::jsonb)
                    RETURNING id
                `);
                chunkId = (inserted[0] as any).id;
            }

            if (chunkId) {
                const embeddingStr = `[${embedding.join(',')}]`;
                // UPDATE VECTOR vía SQL Raw por compatibilidad con pgvector
                await db.execute(sql`
                    UPDATE fluxcore_document_chunks
                    SET embedding = ${sql.raw(`'${embeddingStr}'::vector`)}
                    WHERE id = ${chunkId}::uuid
                `);
            }

            // SEÑAL CLARA: Marcamos el ASSET como COMPLETED. La IA ya puede verlo.
            await db.update(assets).set({ 
                status: 'ready' as any, // En este sistema, 'ready' es el estado final de producción para activos
                updatedAt: new Date()
            }).where(eq(assets.id, templateId));

            console.log(`[SemanticService] ✅ SEÑAL CLARA: Plantilla ${templateId} sincronizada y marcada como lista.`);

        } catch (error) {
            console.error(`[SemanticService] ❌ Error sincronizando vector:`, error);
        }
    }

    /**
     * Auditoría de Fidelidad basada en SEÑAL CLARA.
     * Ya no dependemos de fechas, sino del estado 'ready' en la tabla Assets.
     */
    async guaranteeSymmetry(templateList: any[], accountId: string): Promise<number> {
        let updatedCount = 0;
        console.log(`[SemanticService] Auditando Simetría mediante Señales (States)...`);
        
        for (const template of templateList) {
            // SOBERANÍA: Verificamos el deseo explícito del usuario
            const [settings] = await db.select({ authorizeForAI: fluxcoreTemplateSettings.authorizeForAI })
                .from(fluxcoreTemplateSettings)
                .where(eq(fluxcoreTemplateSettings.templateId, template.id))
                .limit(1);
            
            const isAuthorized = settings?.authorizeForAI ?? false;

            // Verificamos el estado físico del Asset
            const [asset] = await db.select({ status: assets.status, updatedAt: assets.updatedAt })
                .from(assets)
                .where(eq(assets.id, template.id))
                .limit(1);

            // Verificamos si hay un fragmento con vector
            const [chunk] = await db.select({ hasEmbedding: sql<boolean>`embedding IS NOT NULL` })
                .from(fluxcoreDocumentChunks)
                .where(and(
                    eq(fluxcoreDocumentChunks.fileId, template.id),
                    eq(fluxcoreDocumentChunks.embeddingModel, this.MODEL_NAME),
                    sql`metadata::text LIKE '%template%'`
                )).limit(1);

            // DETERMINISMO: 
            const needsSync = isAuthorized 
                ? (!asset || asset.status !== 'ready' || !chunk?.hasEmbedding || (new Date(template.updated_at) > new Date(asset.updatedAt)))
                : (asset && asset.status === 'ready');
            
            if (needsSync) {
                if (isAuthorized) {
                    console.log(`[Symmetry] 🏗️ INDEXANDO: '${template.name}' (${template.id}) necesita sincronización.`);
                } else {
                    console.log(`[Symmetry] 🛡️ SOBERANÍA: Ocultando '${template.name}' (${template.id}) - Usuario revocó permiso.`);
                }
                await this.syncTemplateVector(template.id, accountId, isAuthorized);
                updatedCount++;
            } else {
                if (isAuthorized) {
                    // console.log(`[Symmetry] ✅ '${template.name}' ya está en simetría.`);
                } else {
                    // console.log(`[Symmetry] ⏭️ Ignorando '${template.name}' - No autorizada para IA.`);
                }
            }
        }
        return updatedCount;
    }

    /**
     * Motor de Búsqueda Semántica Unificado.
     */
    async searchRelevantTemplatesWithScores(query: string, accountId: string, limit: number = 5): Promise<{ id: string; score: number }[]> {
        const authorized = await db.select()
            .from(templates)
            .innerJoin(fluxcoreTemplateSettings, eq(templates.id, fluxcoreTemplateSettings.templateId))
            .where(and(
                eq(templates.accountId, accountId),
                eq(fluxcoreTemplateSettings.authorizeForAI, true)
            ));
        
        const { embedding } = await embeddingService.embedWithConfig(query, {
            provider: 'local',
            model: this.MODEL_NAME,
            dimensions: 384
        });
        
        const embeddingStr = `[${embedding.join(',')}]`;

        // BÚSQUEDA SOBERANA: SQL Nativo con blindaje JSONB
        const rawResults = await db.execute(sql`
            SELECT 
                metadata,
                1 - (embedding <=> ${sql.raw(`'${embeddingStr}'::vector`)}) as score
            FROM fluxcore_document_chunks
            WHERE account_id = ${accountId}::uuid
              AND metadata::text LIKE '%template%'
              AND embedding IS NOT NULL
            ORDER BY score DESC
            LIMIT ${limit * 2}
        `);

        return (rawResults as any)
            .map((r: any) => {
                const meta = (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) as any;
                if (meta?.status === 'active') {
                    return { id: meta.template_id || meta.templateId, score: Number(r.score) };
                }
                return null;
            })
            .filter((res: any) => !!res)
            .slice(0, limit);
    }

    private async getOrCreateSystemStore(accountId: string): Promise<string> {
        const [existing] = await db.select().from(fluxcoreVectorStores)
            .where(and(
                eq(fluxcoreVectorStores.accountId, accountId),
                eq(fluxcoreVectorStores.name, this.SYSTEM_STORE_NAME)
            )).limit(1);

        if (existing) return existing.id;
        const [created] = await db.insert(fluxcoreVectorStores).values({
            accountId,
            name: this.SYSTEM_STORE_NAME,
            description: 'Almacén interno para búsqueda semántica de plantillas',
            visibility: 'private',
            status: 'production',
            backend: 'local'
        }).returning();
        return created[0].id;
    }

    private async getOrCreateSystemFile(templateId: string, storeId: string): Promise<string> {
        const [existingAsset] = await db.select().from(assets).where(eq(assets.id, templateId)).limit(1);
        if (!existingAsset) {
            const [template] = await db.select().from(templates).where(eq(templates.id, templateId)).limit(1);
            await db.insert(assets).values({
                id: templateId,
                accountId: template?.accountId || '', 
                name: template?.name || `Template: ${templateId}`,
                type: 'template',
                source: 'system',
                status: 'ready',
                scope: 'template_asset',
                storageKey: `template://${templateId}`
            });
        }

        const [existingLink] = await db.select().from(fluxcoreVectorStoreFiles).where(eq(fluxcoreVectorStoreFiles.id, templateId)).limit(1);
        if (existingLink) return existingLink.id;

        await db.insert(fluxcoreVectorStoreFiles).values({
            id: templateId,
            vectorStoreId: storeId,
            fileId: templateId,
            name: `Template-Virtual: ${templateId}`,
            status: 'completed'
        });
        return templateId;
    }
}

export const templateSemanticService = new TemplateSemanticService();
