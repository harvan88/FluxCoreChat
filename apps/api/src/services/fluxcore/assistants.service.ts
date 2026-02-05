import { Buffer } from 'node:buffer';
import { eq, and, desc, ne } from 'drizzle-orm';
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
    fluxcoreToolConnections,
    type FluxcoreAssistant,
    type NewFluxcoreAssistant,
} from '@fluxcore/db';
import { inArray } from 'drizzle-orm';
import { templateService } from '../template.service';

const TEMPLATES_TOOL_DEF_ID = '9e8c7b6a-5d4e-4f3a-2b1c-0d9e8f7a6b5c';

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

/**
 * Construye el bloque de instrucciones para el uso de plantillas
 */
export async function buildTemplatesInstructionBlock(accountId: string): Promise<string> {
    const aiTemplates = await templateService.listAITemplates(accountId);
    if (aiTemplates.length === 0) return '';

    const templatesList = aiTemplates.map(t =>
        `| ${t.id} | ${t.name} | ${t.variables.map(v => v.name).join(', ') || 'n/a'} |`
    ).join('\n');

    return `
# REGLA DE ORO: DISPARADOR DE PLANTILLAS OFICIALES (SIN ACCESO A CONTENIDO)

Actúa como un selector de respuestas oficiales. Para garantizar la entrega de documentos (PDFs, imágenes) y el formato exacto, TIENES PROHIBIDO redactar respuestas para las intenciones listadas abajo.

REGLA DE SILENCIO TOTAL:
1. Si la intención del usuario coincide con un "Nombre de Plantilla", DEBES llamar a \`send_template\`.
2. Tu respuesta de texto debe estar totalmente VACÍA. Solo emite la llamada a la herramienta.
3. NO conoces el contenido de la plantilla, por lo que NO puedes parafrasearla. Confía en el sistema para entregar el mensaje oficial.

## LIBRERÍA DE INTENCIONES AUTORIZADAS:
| ID (template_id) | Nombre de Plantilla (Intención) | Variables Requeridas |
|---|---|---|
${templatesList}
    `.trim();
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
            modelConfig: {
                provider: 'groq',
                model: 'llama-3.1-8b-instant',
                temperature: 1.0,
                topP: 1.0,
                responseFormat: 'text',
            },
            timingConfig: {
                responseDelaySeconds: 2,
                smartDelay: false,
            },
            updatedAt: new Date(),
        })
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

            // Inyectar plantillas si la herramienta está activa
            let finalInstructions = assistantData.description || 'You are a helpful assistant.';
            if (toolIds && toolIds.length > 0) {
                const connections = await tx
                    .select()
                    .from(fluxcoreToolConnections)
                    .where(inArray(fluxcoreToolConnections.id, toolIds));

                const hasTemplates = connections.some(c => c.toolDefinitionId === TEMPLATES_TOOL_DEF_ID);
                if (hasTemplates) {
                    const templateBlock = await buildTemplatesInstructionBlock(assistantData.accountId);
                    if (templateBlock) {
                        finalInstructions = `${templateBlock}\n\n${finalInstructions}`;
                    }
                }
            }

            externalId = await openaiSync.createOpenAIAssistant({
                name: assistantData.name,
                description: assistantData.description || undefined,
                instructions: finalInstructions,
                modelConfig: assistantData.modelConfig as any,
                vectorStoreIds: openaiVectorStoreExternalIds.length > 0 ? openaiVectorStoreExternalIds : undefined,
            });

            const [assistant] = await tx
                .insert(fluxcoreAssistants)
                .values({ ...assistantData, externalId })
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
        const [assistant] = await tx
            .insert(fluxcoreAssistants)
            .values({ ...assistantData, externalId })
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

export async function updateAssistant(
    id: string,
    accountId: string,
    data: Partial<CreateAssistantDTO> & { instructions?: string }
): Promise<FluxcoreAssistant | null> {
    const { instructionIds, vectorStoreIds, toolIds, instructions, ...assistantData } = data;

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

        const [assistant] = await tx
            .update(fluxcoreAssistants)
            .set({ ...assistantData, updatedAt: new Date() })
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

            // Inyectar plantillas si la herramienta está activa
            let finalInstructions = instructions || 'You are a helpful assistant.';

            // Determinar si Templates está activo (ya sea en toolIds nuevos o existentes)
            let isTemplatesActive = false;
            if (toolIds !== undefined) {
                if (toolIds.length > 0) {
                    const connections = await tx
                        .select()
                        .from(fluxcoreToolConnections)
                        .where(inArray(fluxcoreToolConnections.id, toolIds));
                    isTemplatesActive = connections.some(c => c.toolDefinitionId === TEMPLATES_TOOL_DEF_ID);
                }
            } else {
                // Chequear conexiones actuales del asistente
                const currentTools = await tx
                    .select({ defId: fluxcoreToolConnections.toolDefinitionId })
                    .from(fluxcoreAssistantTools)
                    .innerJoin(fluxcoreToolConnections, eq(fluxcoreAssistantTools.toolConnectionId, fluxcoreToolConnections.id))
                    .where(eq(fluxcoreAssistantTools.assistantId, id));
                isTemplatesActive = currentTools.some(t => t.defId === TEMPLATES_TOOL_DEF_ID);
            }

            if (isTemplatesActive) {
                const templateBlock = await buildTemplatesInstructionBlock(accountId);
                if (templateBlock) {
                    finalInstructions = `${templateBlock}\n\n${finalInstructions}`;
                }
            }

            await openaiSync.updateOpenAIAssistant({
                externalId: assistant.externalId,
                name: assistantData.name,
                description: typeof assistantData.description === 'string' ? assistantData.description : undefined,
                instructions: finalInstructions,
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
