import { db, fluxcoreVectorStores, fluxcoreVectorStoreFiles, fluxcoreDocumentChunks, templates, fluxcoreTemplateSettings, type Template } from '@fluxcore/db';
import { eq, and, sql } from 'drizzle-orm';
import { embeddingService } from '../embedding.service';
import { coreEventBus } from '../../core/events';

/**
 * TemplateSemanticService
 * 
 * Gestiona la representación vectorial de las plantillas en FluxCore.
 * Mantiene el mundo de ChatCore (Templates) y FluxCore (Vecores) sincronizado.
 */
export class TemplateSemanticService {
    private readonly SYSTEM_STORE_NAME = 'SYSTEM_INTERNAL_TEMPLATES';

    constructor() {
        this.setupListeners();
    }

    private setupListeners() {
        console.log(`[SemanticService] Configurando Listeners...`);
        // Listener del Core (Legacy/Fallback)
        coreEventBus.on('template.authorization.changed', async (payload: { templateId: string; accountId: string; allowAutomatedUse: boolean }) => {
            console.log(`[SemanticService] EVENTO RECIBIDO: template.authorization.changed para ${payload.templateId}`);
            await this.syncTemplateVector(payload.templateId, payload.accountId, payload.allowAutomatedUse);
        });

        // Listener de la Extensión (Soberano/Garantizado)
        coreEventBus.on('fluxcore.template.settings.changed', async (payload: { templateId: string; accountId: string; authorizeForAI: boolean }) => {
            console.log(`[SemanticService] EVENTO RECIBIDO: fluxcore.template.settings.changed para ${payload.templateId}`);
            await this.syncTemplateVector(payload.templateId, payload.accountId, payload.authorizeForAI);
        });
    }

    /**
     * Sincroniza el vector de una plantilla basándose en su estado.
     */
    async syncTemplateVector(templateId: string, accountId: string, allowAutomatedUse: boolean) {
        try {
            if (!allowAutomatedUse) {
                await this.setTemplateVectorStatus(templateId, accountId, 'hidden');
                return;
            }

            // 1. Obtener instrucciones de IA
            const [settings] = await db.select().from(fluxcoreTemplateSettings).where(eq(fluxcoreTemplateSettings.templateId, templateId)).limit(1);
            
            let textToEmbed = settings?.aiUsageInstructions;

            // 🎯 FALLBACK SEMÁNTICO: Si no hay instrucciones de uso explícitas, 
            // usamos el Nombre de la Plantilla para que el vector no sea nulo.
            if (!textToEmbed) {
                const [template] = await db.select().from(templates).where(eq(templates.id, templateId)).limit(1);
                textToEmbed = template?.name;
                if (textToEmbed) {
                    console.log(`[SemanticService] Usando fallback (nombre: "${textToEmbed}") para vectorizar plantilla ${templateId}`);
                }
            }

            if (!textToEmbed) {
                console.warn(`[SemanticService] No hay instrucciones ni nombre para la plantilla ${templateId}. Saltando vectorización.`);
                return;
            }

            // 2. Generar embedding (Local MiniLM - 384)
            const { embedding } = await embeddingService.embedWithConfig(textToEmbed, {
                provider: 'local',
                model: 'paraphrase-multilingual-MiniLM-L12-v2',
                dimensions: 384
            });

            // 3. Obtener/Crear el Almacén de Sistema
            const storeId = await this.getOrCreateSystemStore(accountId);

            // 4. Asegurar que existe el "Archivo Virtual" para esta plantilla (FK constraint)
            await this.getOrCreateSystemFile(templateId, storeId);

            // 5. Upsert en fluxcore_document_chunks
            // Primero insertamos/actualizamos el registro básico (sin embedding)
            const [chunk] = await db.insert(fluxcoreDocumentChunks).values({
                vectorStoreId: storeId,
                fileId: templateId, // FK a fluxcore_vector_store_files
                accountId,
                content: textToEmbed,
                chunkIndex: 0,
                tokenCount: 0,
                metadata: {
                    type: 'template',
                    template_id: templateId,
                    status: 'active',
                    updatedAt: new Date().toISOString()
                }
            }).onConflictDoUpdate({
                target: [fluxcoreDocumentChunks.fileId, fluxcoreDocumentChunks.chunkIndex],
                set: {
                    content: textToEmbed,
                    metadata: {
                        type: 'template',
                        template_id: templateId,
                        status: 'active',
                        updatedAt: new Date().toISOString()
                    },
                    updatedAt: new Date()
                }
            }).returning({ id: fluxcoreDocumentChunks.id });

            // Luego actualizamos el embedding vía SQL Raw (porque no está en el esquema TS)
            if (chunk?.id) {
                const embeddingStr = `[${embedding.join(',')}]`;
                await db.execute(sql`
                    UPDATE fluxcore_document_chunks
                    SET embedding = ${sql.raw(`'${embeddingStr}'::vector`)}
                    WHERE id = ${chunk.id}::uuid
                `);
            }

            console.log(`[SemanticService] Vector actualizado para plantilla: ${templateId}`);

        } catch (error) {
            console.error(`[SemanticService] Error sincronizando vector:`, error);
        }
    }

    /**
     * Cambia el estado lógico del vector (Baja lógica).
     */
    private async setTemplateVectorStatus(templateId: string, accountId: string, status: 'active' | 'hidden') {
        await db.update(fluxcoreDocumentChunks)
            .set({
                metadata: sql`jsonb_set(metadata, '{status}', ${JSON.stringify(status)}::jsonb)`,
                updatedAt: new Date()
            })
            .where(and(
                eq(fluxcoreDocumentChunks.fileId, templateId),
                eq(fluxcoreDocumentChunks.accountId, accountId)
            ));
    }

    /**
     * Obtiene los IDs de las plantillas más relevantes semánticamente.
     */
    async searchRelevantTemplateIds(query: string, accountId: string, limit: number = 5): Promise<string[]> {
        const storeId = await this.getOrCreateSystemStore(accountId);
        
        // Generar embedding de consulta
        const { embedding } = await embeddingService.embedWithConfig(query, {
            provider: 'local',
            model: 'paraphrase-multilingual-MiniLM-L12-v2',
            dimensions: 384
        });

        const embeddingStr = `[${embedding.join(',')}]`;

        // Búsqueda vectorial directa (Recuperamos metadatos completos para extracción segura en JS)
        const results = await db.select({
            metadata: fluxcoreDocumentChunks.metadata,
            embeddingDist: sql<number>`embedding <=> ${sql.raw(`'${embeddingStr}'::vector`)}`
        })
        .from(fluxcoreDocumentChunks)
        .where(and(
            eq(fluxcoreDocumentChunks.vectorStoreId, storeId),
            eq(fluxcoreDocumentChunks.accountId, accountId),
            // Guard de dimensiones para evitar errores de pgvector
            sql`vector_dims(embedding) = 384`
        ))
        .orderBy(sql`embedding <=> ${sql.raw(`'${embeddingStr}'::vector`)}`)
        .limit(limit * 2); // Tomamos un margen por si hay plantillas inactivas

        // Extracción y filtrado en capa de aplicación (venciendo problemas de operadores SQL JSONB)
        return results
            .map(r => {
                const meta = (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) as any;
                if (meta?.status === 'active') {
                    return meta.template_id || meta.templateId; // Soporte para ambos por si acaso
                }
                return null;
            })
            .filter((id): id is string => !!id)
            .slice(0, limit);
    }

    /**
     * Obtiene los IDs de las plantillas más relevantes semánticamente con sus puntuaciones.
     */
    async searchRelevantTemplatesWithScores(query: string, accountId: string, limit: number = 5): Promise<{ id: string; score: number }[]> {
        const storeId = await this.getOrCreateSystemStore(accountId);
        
        // Generar embedding de consulta
        const { embedding } = await embeddingService.embedWithConfig(query, {
            provider: 'local',
            model: 'paraphrase-multilingual-MiniLM-L12-v2',
            dimensions: 384
        });

        const embeddingStr = `[${embedding.join(',')}]`;

        // Búsqueda vectorial directa
        const results = await db.select({
            metadata: fluxcoreDocumentChunks.metadata,
            embeddingDist: sql<number>`embedding <=> ${sql.raw(`'${embeddingStr}'::vector`)}`
        })
        .from(fluxcoreDocumentChunks)
        .where(and(
            eq(fluxcoreDocumentChunks.vectorStoreId, storeId),
            eq(fluxcoreDocumentChunks.accountId, accountId),
            sql`vector_dims(embedding) = 384`
        ))
        .orderBy(sql`embedding <=> ${sql.raw(`'${embeddingStr}'::vector`)}`)
        .limit(limit * 2);

        return results
            .map(r => {
                const meta = (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) as any;
                if (meta?.status === 'active') {
                    return {
                        id: meta.template_id || meta.templateId,
                        score: 1 - r.embeddingDist // Convertimos distancia (0-2) a similitud (1 = idénticos)
                    };
                }
                return null;
            })
            .filter((res): res is { id: string; score: number } => !!res)
            .slice(0, limit);
    }

    private async getOrCreateSystemStore(accountId: string): Promise<string> {
        const [existing] = await db.select().from(fluxcoreVectorStores)
            .where(and(
                eq(fluxcoreVectorStores.accountId, accountId),
                eq(fluxcoreVectorStores.name, this.SYSTEM_STORE_NAME)
            ))
            .limit(1);

        if (existing) return existing.id;

        const [created] = await db.insert(fluxcoreVectorStores).values({
            accountId,
            name: this.SYSTEM_STORE_NAME,
            description: 'Almacén interno para búsqueda semántica de plantillas',
            visibility: 'private',
            status: 'production',
            backend: 'local'
        }).returning();

        return created.id;
    }

    private async getOrCreateSystemFile(templateId: string, storeId: string): Promise<string> {
        const [existing] = await db.select().from(fluxcoreVectorStoreFiles)
            .where(eq(fluxcoreVectorStoreFiles.id, templateId))
            .limit(1);

        if (existing) return existing.id;

        const [created] = await db.insert(fluxcoreVectorStoreFiles).values({
            id: templateId,
            vectorStoreId: storeId,
            name: `Template-Virtual: ${templateId}`,
            status: 'completed'
        }).returning();

        return created.id;
    }
}

export const templateSemanticService = new TemplateSemanticService();
