
import { eq, and } from 'drizzle-orm';
import {
    db,
    fluxcoreAssistants,
    fluxcoreInstructions,
    fluxcoreVectorStores,
    fluxcoreToolDefinitions,
    fluxcoreToolConnections,
    fluxcoreAssistantInstructions,
    fluxcoreAssistantVectorStores,
    fluxcoreAssistantTools,
    fluxcoreInstructionVersions,
    type FluxcoreAssistant,
    type FluxcoreVectorStore,
    type FluxcoreToolDefinition,
} from '@fluxcore/db';
import * as assistantsService from './assistants.service';

export interface AssistantComposition {
    assistant: FluxcoreAssistant;
    instructions: { content: string; order: number; versionId: string | null; name: string }[];
    vectorStores: (FluxcoreVectorStore & { accessMode: string })[];
    tools: (FluxcoreToolDefinition & { config: any; connectionId: string; connectionStatus: string })[];
}

/**
 * Reconstruye el asistente completo con todas sus referencias
 */
export async function getAssistantComposition(assistantId: string): Promise<AssistantComposition | null> {
    // 1. Fetch Assistant
    const [assistant] = await db
        .select()
        .from(fluxcoreAssistants)
        .where(eq(fluxcoreAssistants.id, assistantId))
        .limit(1);

    if (!assistant) return null;

    // 2. Fetch Instructions (Ordered) with Content
    const instructionsResult = await db
        .select({
            instruction: fluxcoreInstructions,
            link: fluxcoreAssistantInstructions,
            version: fluxcoreInstructionVersions,
        })
        .from(fluxcoreAssistantInstructions)
        .innerJoin(
            fluxcoreInstructions,
            eq(fluxcoreAssistantInstructions.instructionId, fluxcoreInstructions.id)
        )
        .leftJoin(
            fluxcoreInstructionVersions,
            eq(fluxcoreInstructionVersions.id, fluxcoreInstructions.currentVersionId)
        )
        .where(and(
            eq(fluxcoreAssistantInstructions.assistantId, assistantId),
            eq(fluxcoreAssistantInstructions.isEnabled, true)
        ))
        .orderBy(fluxcoreAssistantInstructions.order);

    // Mapear y manejar version pinning manualmente
    const instructions = await Promise.all(instructionsResult.map(async ({ instruction, link, version }) => {
        let content = version?.content || '';

        // Si la instrucción es gestionada, generar contenido dinámicamente
        if (instruction.isManaged) {
            content = await assistantsService.generateManagedInstructionContent(assistant.accountId);
        } else {
            // Si hay una versión fijada y no coincide con la current, hacer fetch extra
            if (link.versionId && link.versionId !== instruction.currentVersionId) {
                const [pinnedVersion] = await db
                    .select()
                    .from(fluxcoreInstructionVersions)
                    .where(eq(fluxcoreInstructionVersions.id, link.versionId))
                    .limit(1);
                if (pinnedVersion) content = pinnedVersion.content;
            }
        }

        return {
            id: instruction.id,
            name: instruction.name,
            content,
            order: link.order,
            versionId: link.versionId,
        };
    }));

    // 3. Fetch Vector Stores
    const vectorStoresResult = await db
        .select({
            store: fluxcoreVectorStores,
            link: fluxcoreAssistantVectorStores,
        })
        .from(fluxcoreAssistantVectorStores)
        .innerJoin(
            fluxcoreVectorStores,
            eq(fluxcoreAssistantVectorStores.vectorStoreId, fluxcoreVectorStores.id)
        )
        .where(and(
            eq(fluxcoreAssistantVectorStores.assistantId, assistantId),
            eq(fluxcoreAssistantVectorStores.isEnabled, true)
        ));

    const vectorStores = vectorStoresResult.map(({ store, link }) => ({
        ...store,
        accessMode: link.accessMode || 'read',
    }));

    // 4. Fetch Tools
    const toolsResult = await db
        .select({
            def: fluxcoreToolDefinitions,
            conn: fluxcoreToolConnections,
            link: fluxcoreAssistantTools,
        })
        .from(fluxcoreAssistantTools)
        .innerJoin(
            fluxcoreToolConnections,
            eq(fluxcoreAssistantTools.toolConnectionId, fluxcoreToolConnections.id)
        )
        .innerJoin(
            fluxcoreToolDefinitions,
            eq(fluxcoreToolConnections.toolDefinitionId, fluxcoreToolDefinitions.id)
        )
        .where(and(
            eq(fluxcoreAssistantTools.assistantId, assistantId),
            eq(fluxcoreAssistantTools.isEnabled, true)
        ));

    const tools = toolsResult.map(({ def, conn }) => ({
        ...def,
        config: conn.authConfig,
        connectionId: conn.id,
        connectionStatus: conn.status,
    }));

    return {
        assistant,
        instructions,
        vectorStores,
        tools,
    };
}

/**
 * Determina qué asistente debe responder para una cuenta
 */
export async function resolveActiveAssistant(accountId: string): Promise<AssistantComposition | null> {
    const activeAssistant = await assistantsService.ensureActiveAssistant(accountId);
    return getAssistantComposition(activeAssistant.id);
}
