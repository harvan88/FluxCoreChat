import { Buffer } from 'node:buffer';
import { eq, and, desc, ne, sql } from 'drizzle-orm';
import * as openaiSync from '../openai-sync.service';
import {
    db,
    fluxcoreAssistants,
    fluxcoreInstructions,
    fluxcoreVectorStores,
    fluxcoreAssistantInstructions,
    fluxcoreAssistantVectorStores,
    fluxcoreAssistantTools,
    fluxcoreInstructionVersions,
    accounts,
    type FluxcoreAssistant,
    type NewFluxcoreAssistant,
} from '@fluxcore/db';

export type FluxcoreAssistantWithRelations = FluxcoreAssistant & {
    instructionIds: string[];
    vectorStoreIds: string[];
    toolIds: string[];
};

export interface CreateAssistantDTO extends NewFluxcoreAssistant {
    instructionIds?: string[];
    vectorStoreIds?: string[];
    toolIds?: string[];
}

// ============================================================================
// ASSISTANTS LOGIC
// ============================================================================

/**
 * Genera dinámicamente el contenido de una instrucción gestionada
 * basándose en el perfil y contexto privado de la cuenta
 */
export async function generateManagedInstructionContent(accountId: string): Promise<string> {
    const [account] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);

    if (!account) {
        return 'Eres Cori, asistente IA.';
    }

    const sections: string[] = [];

    // Instrucciones base
    sections.push(`🤖 Eres Cori, asistente IA de la persona que ayuda a ${account.displayName || 'el usuario'} a responder mensajes de forma natural y empática.`);

    // Tiempo actual
    const now = new Date();
    const nowUtc = now.toISOString();
    let nowArgentina: string;
    try {
        nowArgentina = new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        }).format(now);
    } catch (_err) {
        nowArgentina = nowUtc;
    }

    sections.push(`\n📅 FECHA Y HORA ACTUAL: ${nowArgentina}`);

    // Contexto del Negocio/Perfil
    if (account.profile) {
        const profile = typeof account.profile === 'string' ? JSON.parse(account.profile) : account.profile;
        sections.push('\n🏢 INFORMACIÓN DEL NEGOCIO/PERFIL:');
        sections.push(JSON.stringify(profile, null, 2));
    }

    // Contexto Privado
    if (account.privateContext) {
        sections.push('\n🔒 CONTEXTO PRIVADO (Instrucciones específicas):');
        sections.push(account.privateContext);
    }

    // Guidelines de estilo
    sections.push(`
📝 PAUTAS DE ESTILO:
- Sé breve y directo, como en WhatsApp.
- Usa emojis con moderación si el tono lo permite.
- Si no sabes algo, di que consultarás, no inventes.
- El objetivo es ayudar a cerrar ventas o resolver dudas rápido.
`);

    return sections.join('\n');
}


// ============================================================================
// ASSISTANTS LOGIC
// ============================================================================

export async function ensureActiveAssistant(accountId: string): Promise<FluxcoreAssistant> {
    const [active] = await db
        .select()
        .from(fluxcoreAssistants)
        .where(and(eq(fluxcoreAssistants.accountId, accountId), eq(fluxcoreAssistants.status, 'active')))
        .orderBy(desc(fluxcoreAssistants.updatedAt))
        .limit(1);

    if (active) {
        return active;
    }

    // Crear instrucción gestionada por defecto
    const defaultInstructionContent = await generateManagedInstructionContent(accountId);
    const wordCount = defaultInstructionContent.split(/\s+/).filter(Boolean).length;
    const lineCount = defaultInstructionContent.split('\n').length;
    const sizeBytes = Buffer.byteLength(defaultInstructionContent, 'utf8');
    const tokensEstimated = Math.ceil(wordCount * 1.3);

    const [defaultInstruction] = await db
        .insert(fluxcoreInstructions)
        .values({
            accountId,
            name: 'Instrucciones para el asistente (por defecto)',
            description: 'Instrucciones del sistema gestionadas dinámicamente desde tu perfil',
            status: 'active',
            visibility: 'private',
            isManaged: true,
            updatedAt: new Date(),
        })
        .returning();

    const [defaultVersion] = await db
        .insert(fluxcoreInstructionVersions)
        .values({
            instructionId: defaultInstruction.id,
            versionNumber: 1,
            content: defaultInstructionContent,
            sizeBytes,
            tokensEstimated,
            wordCount,
            lineCount,
        })
        .returning();

    await db
        .update(fluxcoreInstructions)
        .set({ currentVersionId: defaultVersion.id })
        .where(eq(fluxcoreInstructions.id, defaultInstruction.id));

    // Crear asistente por defecto
    const [created] = await db
        .insert(fluxcoreAssistants)
        .values({
            accountId,
            name: 'Asistente por defecto',
            description: 'Asistente activo por defecto',
            status: 'active',
            modelConfig: sql.raw(`'${JSON.stringify({
                provider: 'groq',
                model: 'llama-3.1-8b-instant',
                temperature: 1.0,
                topP: 1.0,
                responseFormat: 'text',
            })}'::jsonb`),
            timingConfig: sql.raw(`'${JSON.stringify({
                responseDelaySeconds: 2,
                smartDelay: false,
            })}'::jsonb`),
            updatedAt: new Date(),
        } as any)
        .returning();

    // Vincular instrucción al asistente
    await db
        .insert(fluxcoreAssistantInstructions)
        .values({
            assistantId: created.id,
            instructionId: defaultInstruction.id,
            order: 1,
            isEnabled: true,
        });

    return created;
}

export async function attachAssistantRelations(assistant: FluxcoreAssistant): Promise<FluxcoreAssistantWithRelations> {
    const [instructionLinks, vectorLinks, toolLinks] = await Promise.all([
        db
            .select({
                instructionId: fluxcoreAssistantInstructions.instructionId,
            })
            .from(fluxcoreAssistantInstructions)
            .where(eq(fluxcoreAssistantInstructions.assistantId, assistant.id))
            .orderBy(fluxcoreAssistantInstructions.order),
        db
            .select({
                vectorStoreId: fluxcoreAssistantVectorStores.vectorStoreId,
            })
            .from(fluxcoreAssistantVectorStores)
            .where(eq(fluxcoreAssistantVectorStores.assistantId, assistant.id)),
        db
            .select({
                toolConnectionId: fluxcoreAssistantTools.toolConnectionId,
            })
            .from(fluxcoreAssistantTools)
            .where(eq(fluxcoreAssistantTools.assistantId, assistant.id)),
    ]);

    return {
        ...assistant,
        instructionIds: instructionLinks.map((link) => link.instructionId),
        vectorStoreIds: vectorLinks.map((link) => link.vectorStoreId),
        toolIds: toolLinks.map((link) => link.toolConnectionId),
    };
}

export async function getAssistants(accountId: string): Promise<FluxcoreAssistantWithRelations[]> {
    const assistants = await db
        .select()
        .from(fluxcoreAssistants)
        .where(eq(fluxcoreAssistants.accountId, accountId))
        .orderBy(desc(fluxcoreAssistants.updatedAt));

    if (assistants.length === 0) {
        const created = await ensureActiveAssistant(accountId);
        return [await attachAssistantRelations(created)];
    }

    return Promise.all(assistants.map(attachAssistantRelations));
}

export async function getAssistantById(id: string, accountId: string): Promise<FluxcoreAssistantWithRelations | null> {
    const [assistant] = await db
        .select()
        .from(fluxcoreAssistants)
        .where(and(
            eq(fluxcoreAssistants.id, id),
            eq(fluxcoreAssistants.accountId, accountId)
        ))
        .limit(1);

    if (!assistant) return null;
    return attachAssistantRelations(assistant);
}

export async function createAssistant(data: CreateAssistantDTO): Promise<FluxcoreAssistant> {
    const { instructionIds, vectorStoreIds, toolIds, ...assistantData } = data;

    // Defensive: ensure jsonb fields are objects, not double-serialized strings
    if (assistantData.modelConfig) {
        assistantData.modelConfig = safeJsonbParse(assistantData.modelConfig) as any;
    }
    if (assistantData.timingConfig) {
        assistantData.timingConfig = safeJsonbParse(assistantData.timingConfig) as any;
    }

    return db.transaction(async (tx) => {
        if (assistantData.status === 'active' && typeof assistantData.accountId === 'string') {
            await tx
                .update(fluxcoreAssistants)
                .set({ status: 'draft', updatedAt: new Date() })
                .where(and(
                    eq(fluxcoreAssistants.accountId, assistantData.accountId),
                    eq(fluxcoreAssistants.status, 'active')
                ));
        }

        let externalId = assistantData.externalId;

        // FLUJO OPENAI
        if (assistantData.runtime === 'openai') {
            const openaiVectorStoreExternalIds: string[] = [];
            if (vectorStoreIds && vectorStoreIds.length > 0) {
                const vectorStores = await tx
                    .select()
                    .from(fluxcoreVectorStores)
                    .where(eq(fluxcoreVectorStores.accountId, assistantData.accountId));

                for (const vs of vectorStores) {
                    if (vectorStoreIds.includes(vs.id) && vs.backend === 'openai' && vs.externalId) {
                        openaiVectorStoreExternalIds.push(vs.externalId);
                    }
                }
            }

            externalId = await openaiSync.createOpenAIAssistant({
                name: assistantData.name,
                description: assistantData.description || undefined,
                instructions: assistantData.description || 'You are a helpful assistant.',
                modelConfig: assistantData.modelConfig as any,
                vectorStoreIds: openaiVectorStoreExternalIds.length > 0 ? openaiVectorStoreExternalIds : undefined,
            });

            const insertValues: Record<string, any> = { ...assistantData, externalId };
            if (insertValues.modelConfig && typeof insertValues.modelConfig === 'object') {
                const escaped = JSON.stringify(insertValues.modelConfig).replace(/'/g, "''");
                insertValues.modelConfig = sql.raw(`'${escaped}'::jsonb`);
            }
            if (insertValues.timingConfig && typeof insertValues.timingConfig === 'object') {
                const escaped = JSON.stringify(insertValues.timingConfig).replace(/'/g, "''");
                insertValues.timingConfig = sql.raw(`'${escaped}'::jsonb`);
            }

            const [assistant] = await tx
                .insert(fluxcoreAssistants)
                .values(insertValues)
                .returning();

            if (vectorStoreIds && vectorStoreIds.length > 0) {
                const openaiVsIds = await tx
                    .select({ id: fluxcoreVectorStores.id })
                    .from(fluxcoreVectorStores)
                    .where(and(
                        eq(fluxcoreVectorStores.accountId, assistantData.accountId),
                        eq(fluxcoreVectorStores.backend, 'openai')
                    ));
                const openaiVsIdSet = new Set(openaiVsIds.map(v => v.id));
                const filteredVsIds = vectorStoreIds.filter(id => openaiVsIdSet.has(id));

                if (filteredVsIds.length > 0) {
                    await tx.insert(fluxcoreAssistantVectorStores).values(
                        filteredVsIds.map((id) => ({
                            assistantId: assistant.id,
                            vectorStoreId: id,
                            accessMode: 'read',
                        }))
                    );
                }
            }

            return assistant;
        }

        // FLUJO LOCAL
        const localInsertValues: Record<string, any> = { ...assistantData, externalId };
        if (localInsertValues.modelConfig && typeof localInsertValues.modelConfig === 'object') {
            const escaped = JSON.stringify(localInsertValues.modelConfig).replace(/'/g, "''");
            localInsertValues.modelConfig = sql.raw(`'${escaped}'::jsonb`);
        }
        if (localInsertValues.timingConfig && typeof localInsertValues.timingConfig === 'object') {
            const escaped = JSON.stringify(localInsertValues.timingConfig).replace(/'/g, "''");
            localInsertValues.timingConfig = sql.raw(`'${escaped}'::jsonb`);
        }

        const [assistant] = await tx
            .insert(fluxcoreAssistants)
            .values(localInsertValues)
            .returning();

        if (instructionIds && instructionIds.length > 0) {
            await tx.insert(fluxcoreAssistantInstructions).values(
                instructionIds.map((id, index) => ({
                    assistantId: assistant.id,
                    instructionId: id,
                    order: index,
                }))
            );
        }

        if (vectorStoreIds && vectorStoreIds.length > 0) {
            await tx.insert(fluxcoreAssistantVectorStores).values(
                vectorStoreIds.map((id) => ({
                    assistantId: assistant.id,
                    vectorStoreId: id,
                    accessMode: 'read',
                }))
            );
        }

        if (toolIds && toolIds.length > 0) {
            await tx.insert(fluxcoreAssistantTools).values(
                toolIds.map((toolConnectionId) => ({
                    assistantId: assistant.id,
                    toolConnectionId,
                }))
            );
        }

        return assistant;
    });
}

/**
 * Safely parse a jsonb field that might be double-serialized as a string.
 */
function safeJsonbParse<T>(value: T | string | undefined): T | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'string') {
        try { return JSON.parse(value) as T; } catch { return value as unknown as T; }
    }
    return value;
}

export async function updateAssistant(
    id: string,
    accountId: string,
    data: Partial<CreateAssistantDTO> & { instructions?: string }
): Promise<FluxcoreAssistant | null> {
    const { instructionIds, vectorStoreIds, toolIds, instructions, ...assistantData } = data;

    // Defensive: ensure jsonb fields are objects, not double-serialized strings
    if (assistantData.modelConfig) {
        assistantData.modelConfig = safeJsonbParse(assistantData.modelConfig) as any;
    }
    if (assistantData.timingConfig) {
        assistantData.timingConfig = safeJsonbParse(assistantData.timingConfig) as any;
    }

    return db.transaction(async (tx) => {
        const [existingAssistant] = await tx
            .select()
            .from(fluxcoreAssistants)
            .where(and(
                eq(fluxcoreAssistants.id, id),
                eq(fluxcoreAssistants.accountId, accountId)
            ))
            .limit(1);

        if (!existingAssistant) return null;

        if (assistantData.status === 'active') {
            await tx
                .update(fluxcoreAssistants)
                .set({ status: 'draft', updatedAt: new Date() })
                .where(and(
                    eq(fluxcoreAssistants.accountId, accountId),
                    eq(fluxcoreAssistants.status, 'active'),
                    ne(fluxcoreAssistants.id, id)
                ));
        }

        // FIX: Use sql.raw() to embed JSON directly in SQL, bypassing postgres.js
        // parameter serialization which double-stringifies objects for jsonb columns.
        const setPayload: Record<string, any> = { ...assistantData, updatedAt: new Date() };
        if (setPayload.modelConfig && typeof setPayload.modelConfig === 'object') {
            const escaped = JSON.stringify(setPayload.modelConfig).replace(/'/g, "''");
            setPayload.modelConfig = sql.raw(`'${escaped}'::jsonb`);
        }
        if (setPayload.timingConfig && typeof setPayload.timingConfig === 'object') {
            const escaped = JSON.stringify(setPayload.timingConfig).replace(/'/g, "''");
            setPayload.timingConfig = sql.raw(`'${escaped}'::jsonb`);
        }

        const [assistant] = await tx
            .update(fluxcoreAssistants)
            .set(setPayload)
            .where(and(
                eq(fluxcoreAssistants.id, id),
                eq(fluxcoreAssistants.accountId, accountId)
            ))
            .returning();

        if (!assistant) return null;

        // FLUJO OPENAI
        if (assistant.runtime === 'openai' && assistant.externalId) {
            const openaiVectorStoreExternalIds: string[] = [];

            if (vectorStoreIds !== undefined && vectorStoreIds.length > 0) {
                const vectorStores = await tx
                    .select()
                    .from(fluxcoreVectorStores)
                    .where(eq(fluxcoreVectorStores.accountId, accountId));

                for (const vs of vectorStores) {
                    if (vectorStoreIds.includes(vs.id) && vs.backend === 'openai' && vs.externalId) {
                        openaiVectorStoreExternalIds.push(vs.externalId);
                    }
                }
            }

            await openaiSync.updateOpenAIAssistant({
                externalId: assistant.externalId,
                name: assistantData.name,
                description: typeof assistantData.description === 'string' ? assistantData.description : undefined,
                instructions: instructions || 'You are a helpful assistant.',
                modelConfig: assistantData.modelConfig as any,
                vectorStoreIds: openaiVectorStoreExternalIds.length > 0 ? openaiVectorStoreExternalIds : undefined,
            });

            if (vectorStoreIds !== undefined) {
                await tx.delete(fluxcoreAssistantVectorStores).where(eq(fluxcoreAssistantVectorStores.assistantId, id));
                if (vectorStoreIds.length > 0) {
                    const openaiVsIds = await tx
                        .select({ id: fluxcoreVectorStores.id })
                        .from(fluxcoreVectorStores)
                        .where(and(
                            eq(fluxcoreVectorStores.accountId, accountId),
                            eq(fluxcoreVectorStores.backend, 'openai')
                        ));
                    const openaiVsIdSet = new Set(openaiVsIds.map(v => v.id));
                    const filteredVsIds = vectorStoreIds.filter(vsId => openaiVsIdSet.has(vsId));

                    if (filteredVsIds.length > 0) {
                        await tx.insert(fluxcoreAssistantVectorStores).values(
                            filteredVsIds.map((vsId) => ({
                                assistantId: id,
                                vectorStoreId: vsId,
                                accessMode: 'read',
                            }))
                        );
                    }
                }
            }

            if (toolIds !== undefined) {
                await tx.delete(fluxcoreAssistantTools).where(eq(fluxcoreAssistantTools.assistantId, id));
                if (toolIds.length > 0) {
                    await tx.insert(fluxcoreAssistantTools).values(
                        toolIds.map((toolConnectionId) => ({
                            assistantId: id,
                            toolConnectionId,
                        }))
                    );
                }
            }

            return assistant;
        }

        // FLUJO LOCAL
        if (instructionIds !== undefined) {
            await tx.delete(fluxcoreAssistantInstructions).where(eq(fluxcoreAssistantInstructions.assistantId, id));
            if (instructionIds.length > 0) {
                await tx.insert(fluxcoreAssistantInstructions).values(
                    instructionIds.map((instId, index) => ({
                        assistantId: id,
                        instructionId: instId,
                        order: index,
                    }))
                );
            }
        }

        if (vectorStoreIds !== undefined) {
            await tx.delete(fluxcoreAssistantVectorStores).where(eq(fluxcoreAssistantVectorStores.assistantId, id));
            if (vectorStoreIds.length > 0) {
                await tx.insert(fluxcoreAssistantVectorStores).values(
                    vectorStoreIds.map((vsId) => ({
                        assistantId: id,
                        vectorStoreId: vsId,
                        accessMode: 'read',
                    }))
                );
            }
        }

        if (toolIds !== undefined) {
            await tx.delete(fluxcoreAssistantTools).where(eq(fluxcoreAssistantTools.assistantId, id));
            if (toolIds.length > 0) {
                await tx.insert(fluxcoreAssistantTools).values(
                    toolIds.map((toolConnectionId) => ({
                        assistantId: id,
                        toolConnectionId,
                    }))
                );
            }
        }

        return assistant;
    });
}

export async function setActiveAssistant(id: string, accountId: string): Promise<FluxcoreAssistant | null> {
    return db.transaction(async (tx) => {
        await tx
            .update(fluxcoreAssistants)
            .set({ status: 'draft', updatedAt: new Date() })
            .where(and(
                eq(fluxcoreAssistants.accountId, accountId),
                eq(fluxcoreAssistants.status, 'active'),
                ne(fluxcoreAssistants.id, id)
            ));

        const [assistant] = await tx
            .update(fluxcoreAssistants)
            .set({ status: 'active', updatedAt: new Date() })
            .where(and(
                eq(fluxcoreAssistants.id, id),
                eq(fluxcoreAssistants.accountId, accountId)
            ))
            .returning();

        return assistant || null;
    });
}

export async function deleteAssistant(id: string, accountId: string): Promise<boolean> {
    const [assistant] = await db
        .select()
        .from(fluxcoreAssistants)
        .where(and(
            eq(fluxcoreAssistants.id, id),
            eq(fluxcoreAssistants.accountId, accountId)
        ))
        .limit(1);

    if (assistant?.runtime === 'openai' && assistant.externalId) {
        try {
            await openaiSync.deleteOpenAIAssistant(assistant.externalId);
        } catch (error) {
            console.error('Error eliminando asistente de OpenAI:', error);
        }
    }

    const result = await db
        .delete(fluxcoreAssistants)
        .where(and(
            eq(fluxcoreAssistants.id, id),
            eq(fluxcoreAssistants.accountId, accountId)
        ))
        .returning();
    return result.length > 0;
}
