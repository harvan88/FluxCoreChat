/**
 * FluxCore Service
 * 
 * Servicio para gestionar entidades de FluxCore:
 * - Asistentes
 * - Instrucciones
 * - Vector Stores
 * - Tools
 */

import { Buffer } from 'node:buffer';
import { eq, and, desc, ne } from 'drizzle-orm';
import * as openaiSync from './openai-sync.service';
import {
  db,
  fluxcoreAssistants,
  fluxcoreInstructions,
  fluxcoreVectorStores,
  fluxcoreVectorStoreFiles,
  fluxcoreToolDefinitions,
  fluxcoreToolConnections,
  fluxcoreAssistantInstructions,
  fluxcoreAssistantVectorStores,
  fluxcoreAssistantTools,
  fluxcoreInstructionVersions,
  accounts,
  type FluxcoreAssistant,
  type NewFluxcoreAssistant,
  type FluxcoreInstruction,
  type NewFluxcoreInstruction,
  type FluxcoreVectorStore,
  type NewFluxcoreVectorStore,
  type FluxcoreVectorStoreFile,
  type NewFluxcoreVectorStoreFile,
  type FluxcoreToolConnection,
  type NewFluxcoreToolConnection,
  type FluxcoreToolDefinition,
} from '@fluxcore/db';

export type FluxcoreInstructionWithContent = FluxcoreInstruction & {
  content: string;
  sizeBytes: number;
  tokensEstimated: number;
  wordCount: number;
  lineCount: number;
};

export type FluxcoreAssistantWithRelations = FluxcoreAssistant & {
  instructionIds: string[];
  vectorStoreIds: string[];
  toolIds: string[];
};

type FluxcoreConflictError = Error & {
  statusCode?: number;
  details?: any;
};

// ============================================================================
// DYNAMIC CONTENT GENERATION
// ============================================================================

/**
 * Genera dinámicamente el contenido de una instrucción gestionada
 * basándose en el perfil y contexto privado de la cuenta
 */
async function generateManagedInstructionContent(accountId: string): Promise<string> {
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

  sections.push('\n### Tiempo actual (momento de generar esta respuesta):');
  sections.push(`- UTC: ${nowUtc}`);
  sections.push(`- America/Argentina/Buenos_Aires: ${nowArgentina} (UTC-03:00)`);
  sections.push('Los timestamps del historial entre corchetes (ej: [2025-12-18T15:50:59.683Z]) están en UTC.');

  // Contexto privado
  const privateContext = typeof account.privateContext === 'string'
    ? account.privateContext.trim()
    : '';

  if (privateContext.length > 0) {
    sections.push('\n### Contexto para la IA:');
    sections.push(privateContext.substring(0, 5000));
  }

  sections.push('Tu objetivo es generar respuestas que mantengan la voz y estilo del usuario.');
  sections.push('Responde de forma concisa y natural, como lo haría el usuario.');

  // Contexto del perfil
  if (account.profile && typeof account.profile === 'object') {
    const profile = account.profile as Record<string, any>;
    const bio = profile.bio;
    if (bio && typeof bio === 'string' && bio.length > 0) {
      sections.push(`\n### Sobre ${account.displayName}:`);
      sections.push(`Bio: ${bio.substring(0, 200)}`);
    }
  }

  // Instrucciones finales
  sections.push('\n### Instrucciones:');
  sections.push('- Mantén el tono consistente con los mensajes anteriores del usuario.');
  sections.push('- No uses emojis a menos que el usuario los use frecuentemente.');
  sections.push('- Responde en el mismo idioma del mensaje recibido.');
  sections.push('- Sé breve pero útil.');
  sections.push('- No incluyas timestamps ni prefijos tipo [2025-...Z] en tu respuesta.');

  return sections.join('\n');
}

// ============================================================================
// COMPOSITION & RUNTIME (Brain)
// ============================================================================

export interface AssistantComposition {
  assistant: FluxcoreAssistant;
  instructions: { content: string; order: number; versionId: string | null; name: string }[];
  vectorStores: (FluxcoreVectorStore & { accessMode: string })[];
  tools: (FluxcoreToolDefinition & { config: any; connectionId: string; connectionStatus: string })[];
}

async function ensureActiveAssistant(accountId: string): Promise<FluxcoreAssistant> {
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
      // Si el link tiene versionId, usar esa. Si no, usar currentVersionId de la instrucción
      // Nota: Drizzle OR no es trivial en joins, simplificamos asumiendo current por ahora si null
      // o haciendo lógica en JS.
      // Mejor estrategia: Join con version si existe, si no fetch current.
      // Para simplificar en una query: Join 'ON version.id = COALESCE(link.versionId, instruction.currentVersionId)'
      // Pero Drizzle raw SQL es mejor para COALESCE.
      // Usaremos lógica en memoria por simplicidad si no es performance critical.
      eq(fluxcoreInstructionVersions.id, fluxcoreInstructions.currentVersionId) 
    )
    .where(and(
      eq(fluxcoreAssistantInstructions.assistantId, assistantId),
      eq(fluxcoreAssistantInstructions.isEnabled, true)
    ))
    .orderBy(fluxcoreAssistantInstructions.order);

  // Mapear y manejar version pinning manualmente si es necesario
  const instructions = await Promise.all(instructionsResult.map(async ({ instruction, link, version }) => {
    let content = version?.content || '';
    
    // Si la instrucción es gestionada, generar contenido dinámicamente
    if (instruction.isManaged) {
      content = await generateManagedInstructionContent(assistant.accountId);
    } else {
      // Si hay una versión fijada y no coincide con la current (que trajimos en el join por defecto), hacer fetch extra
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
  const activeAssistant = await ensureActiveAssistant(accountId);
  return getAssistantComposition(activeAssistant.id);
}

// ============================================================================
// ASSISTANTS
// ============================================================================

async function attachAssistantRelations(assistant: FluxcoreAssistant): Promise<FluxcoreAssistantWithRelations> {
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

export interface CreateAssistantDTO extends NewFluxcoreAssistant {
  instructionIds?: string[];
  vectorStoreIds?: string[];
  toolIds?: string[];
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

    // ════════════════════════════════════════════════════════════════════════
    // FLUJO OPENAI: Crear asistente en OpenAI, NO crear instrucciones locales
    // Las instrucciones viven SOLO en OpenAI, no en FluxCore
    // ════════════════════════════════════════════════════════════════════════
    if (assistantData.runtime === 'openai') {
      // Obtener externalIds de vector stores OpenAI seleccionados
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

      // Crear asistente en OpenAI con instrucciones directas (no locales)
      externalId = await openaiSync.createOpenAIAssistant({
        name: assistantData.name,
        description: assistantData.description || undefined,
        instructions: assistantData.description || 'You are a helpful assistant.',
        modelConfig: assistantData.modelConfig as any,
        vectorStoreIds: openaiVectorStoreExternalIds.length > 0 ? openaiVectorStoreExternalIds : undefined,
      });

      // Insertar asistente local como REFERENCIA (sin instrucciones locales)
      const [assistant] = await tx
        .insert(fluxcoreAssistants)
        .values({ ...assistantData, externalId })
        .returning();

      // Solo vincular vector stores OpenAI (para saber cuáles están asociados)
      if (vectorStoreIds && vectorStoreIds.length > 0) {
        // Filtrar solo vector stores con backend='openai'
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

      // NO vincular instructionIds - las instrucciones viven en OpenAI
      // NO vincular toolIds - los tools se gestionan en OpenAI

      return assistant;
    }

    // ════════════════════════════════════════════════════════════════════════
    // FLUJO LOCAL: Crear asistente con instrucciones, vector stores y tools
    // ════════════════════════════════════════════════════════════════════════
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

    // ════════════════════════════════════════════════════════════════════════
    // FLUJO OPENAI: Actualizar en OpenAI, NO usar instrucciones locales
    // ════════════════════════════════════════════════════════════════════════
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

      // Enviar instructions directamente a OpenAI (256K chars max)
      await openaiSync.updateOpenAIAssistant({
        externalId: assistant.externalId,
        name: assistantData.name,
        description: assistantData.description !== null ? assistantData.description : undefined,
        instructions,
        modelConfig: assistantData.modelConfig as any,
        vectorStoreIds: openaiVectorStoreExternalIds.length > 0 ? openaiVectorStoreExternalIds : undefined,
      });

      // Para asistentes OpenAI: solo actualizar vector stores OpenAI
      if (vectorStoreIds !== undefined) {
        await tx.delete(fluxcoreAssistantVectorStores).where(eq(fluxcoreAssistantVectorStores.assistantId, id));
        if (vectorStoreIds.length > 0) {
          // Filtrar solo vector stores OpenAI
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

      // NO vincular instructionIds ni toolIds para OpenAI
      return assistant;
    }

    // ════════════════════════════════════════════════════════════════════════
    // FLUJO LOCAL: Actualizar instrucciones, vector stores y tools locales
    // ════════════════════════════════════════════════════════════════════════
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

// ============================================================================
// INSTRUCTIONS
// ============================================================================

export async function getInstructions(accountId: string): Promise<FluxcoreInstructionWithContent[]> {
  const rows = await db
    .select({
      instruction: fluxcoreInstructions,
      version: fluxcoreInstructionVersions,
    })
    .from(fluxcoreInstructions)
    .leftJoin(
      fluxcoreInstructionVersions,
      eq(fluxcoreInstructionVersions.id, fluxcoreInstructions.currentVersionId)
    )
    .where(eq(fluxcoreInstructions.accountId, accountId))
    .orderBy(desc(fluxcoreInstructions.updatedAt));

  return rows.map(({ instruction, version }) => ({
    ...instruction,
    content: version?.content || '',
    sizeBytes: version?.sizeBytes || 0,
    tokensEstimated: version?.tokensEstimated || 0,
    wordCount: version?.wordCount || 0,
    lineCount: version?.lineCount || 0,
  }));
}

export async function getInstructionById(id: string, accountId: string): Promise<FluxcoreInstructionWithContent | null> {
  const [row] = await db
    .select({
      instruction: fluxcoreInstructions,
      version: fluxcoreInstructionVersions,
    })
    .from(fluxcoreInstructions)
    .leftJoin(
      fluxcoreInstructionVersions,
      eq(fluxcoreInstructionVersions.id, fluxcoreInstructions.currentVersionId)
    )
    .where(and(
      eq(fluxcoreInstructions.id, id),
      eq(fluxcoreInstructions.accountId, accountId)
    ))
    .limit(1);

  if (!row) return null;

  // Si es instrucción gestionada, generar contenido dinámicamente
  let content = row.version?.content || '';
  let sizeBytes = row.version?.sizeBytes || 0;
  let tokensEstimated = row.version?.tokensEstimated || 0;
  let wordCount = row.version?.wordCount || 0;
  let lineCount = row.version?.lineCount || 0;

  if (row.instruction.isManaged) {
    content = await generateManagedInstructionContent(accountId);
    wordCount = content.split(/\s+/).filter(Boolean).length;
    lineCount = content.split('\n').length;
    sizeBytes = Buffer.byteLength(content, 'utf8');
    tokensEstimated = Math.ceil(wordCount * 1.3);
  }

  return {
    ...row.instruction,
    content,
    sizeBytes,
    tokensEstimated,
    wordCount,
    lineCount,
  };
}

export interface CreateInstructionDTO extends NewFluxcoreInstruction {
  content: string;
}

export interface UpdateInstructionDTO extends Partial<NewFluxcoreInstruction> {
  content?: string;
}

export async function createInstruction(data: CreateInstructionDTO): Promise<FluxcoreInstruction> {
  const { content, ...instructionData } = data;

  const [instruction] = await db
    .insert(fluxcoreInstructions)
    .values({
      ...instructionData,
      updatedAt: new Date(),
    })
    .returning();

  const safeContent = typeof content === 'string' ? content : '';
  const wordCount = safeContent.split(/\s+/).filter(Boolean).length;
  const lineCount = safeContent.split('\n').length;
  const sizeBytes = Buffer.byteLength(safeContent, 'utf8');
  const tokensEstimated = Math.ceil(wordCount * 1.3);

  const [version] = await db
    .insert(fluxcoreInstructionVersions)
    .values({
      instructionId: instruction.id,
      versionNumber: 1,
      content: safeContent,
      sizeBytes,
      tokensEstimated,
      wordCount,
      lineCount,
    })
    .returning();

  const [updatedInstruction] = await db
    .update(fluxcoreInstructions)
    .set({ currentVersionId: version.id, updatedAt: new Date() })
    .where(eq(fluxcoreInstructions.id, instruction.id))
    .returning();

  return updatedInstruction || instruction;
}

export async function updateInstruction(
  id: string,
  accountId: string,
  data: UpdateInstructionDTO
): Promise<FluxcoreInstruction | null> {
  const { content, ...instructionData } = data;

  // Verificar si es instrucción gestionada
  const [existing] = await db
    .select()
    .from(fluxcoreInstructions)
    .where(and(
      eq(fluxcoreInstructions.id, id),
      eq(fluxcoreInstructions.accountId, accountId)
    ))
    .limit(1);

  if (!existing) return null;
  if (existing.isManaged) {
    throw new Error('No se puede editar una instrucción gestionada. Edita tu perfil en Configuración.');
  }

  const [instruction] = await db
    .update(fluxcoreInstructions)
    .set({ ...instructionData, updatedAt: new Date() })
    .where(and(
      eq(fluxcoreInstructions.id, id),
      eq(fluxcoreInstructions.accountId, accountId)
    ))
    .returning();

  if (!instruction) return null;

  if (typeof content === 'string') {
    const safeContent = content;
    const wordCount = safeContent.split(/\s+/).filter(Boolean).length;
    const lineCount = safeContent.split('\n').length;
    const sizeBytes = Buffer.byteLength(safeContent, 'utf8');
    const tokensEstimated = Math.ceil(wordCount * 1.3);

    const [latestVersion] = await db
      .select({ versionNumber: fluxcoreInstructionVersions.versionNumber })
      .from(fluxcoreInstructionVersions)
      .where(eq(fluxcoreInstructionVersions.instructionId, id))
      .orderBy(desc(fluxcoreInstructionVersions.versionNumber))
      .limit(1);

    const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    const [version] = await db
      .insert(fluxcoreInstructionVersions)
      .values({
        instructionId: id,
        versionNumber: nextVersionNumber,
        content: safeContent,
        sizeBytes,
        tokensEstimated,
        wordCount,
        lineCount,
      })
      .returning();

    const [updatedInstruction] = await db
      .update(fluxcoreInstructions)
      .set({ currentVersionId: version.id, updatedAt: new Date() })
      .where(and(
        eq(fluxcoreInstructions.id, id),
        eq(fluxcoreInstructions.accountId, accountId)
      ))
      .returning();

    // ARQUITECTURA: Las instrucciones locales son SOLO para asistentes locales.
    // Los asistentes OpenAI gestionan sus instrucciones directamente en OpenAI.
    // NO sincronizar instrucciones locales a OpenAI.

    return updatedInstruction || instruction;
  }

  return instruction;
}

export async function deleteInstruction(id: string, accountId: string): Promise<boolean> {
  const usedBy = await db
    .select({ id: fluxcoreAssistants.id, name: fluxcoreAssistants.name })
    .from(fluxcoreAssistantInstructions)
    .innerJoin(
      fluxcoreAssistants,
      eq(fluxcoreAssistantInstructions.assistantId, fluxcoreAssistants.id)
    )
    .where(and(
      eq(fluxcoreAssistantInstructions.instructionId, id),
      eq(fluxcoreAssistants.accountId, accountId)
    ))
    .limit(1);

  if (usedBy.length > 0) {
    const err = new Error('No se puede eliminar: esta instrucción está siendo usada por un asistente') as FluxcoreConflictError;
    err.statusCode = 409;
    err.details = { usedByAssistants: usedBy };
    throw err;
  }

  const result = await db
    .delete(fluxcoreInstructions)
    .where(and(
      eq(fluxcoreInstructions.id, id),
      eq(fluxcoreInstructions.accountId, accountId)
    ))
    .returning();
  return result.length > 0;
}

// ============================================================================
// VECTOR STORES
// ============================================================================

export async function getVectorStores(accountId: string): Promise<FluxcoreVectorStore[]> {
  return db
    .select()
    .from(fluxcoreVectorStores)
    .where(eq(fluxcoreVectorStores.accountId, accountId))
    .orderBy(desc(fluxcoreVectorStores.updatedAt));
}

export async function getVectorStoreById(id: string, accountId: string): Promise<FluxcoreVectorStore | null> {
  const [store] = await db
    .select()
    .from(fluxcoreVectorStores)
    .where(and(
      eq(fluxcoreVectorStores.id, id),
      eq(fluxcoreVectorStores.accountId, accountId)
    ))
    .limit(1);
  return store || null;
}

export async function createVectorStore(data: NewFluxcoreVectorStore): Promise<FluxcoreVectorStore> {
  let externalId = data.externalId;

  if (data.backend === 'openai') {
    externalId = await openaiSync.createOpenAIVectorStore({
      name: data.name,
    });
  }

  const [store] = await db
    .insert(fluxcoreVectorStores)
    .values({
      ...data,
      externalId,
    })
    .returning();
  return store;
}

export async function updateVectorStore(
  id: string,
  accountId: string,
  data: Partial<NewFluxcoreVectorStore>
): Promise<FluxcoreVectorStore | null> {
  const [existing] = await db
    .select()
    .from(fluxcoreVectorStores)
    .where(and(
      eq(fluxcoreVectorStores.id, id),
      eq(fluxcoreVectorStores.accountId, accountId)
    ))
    .limit(1);

  if (!existing) return null;

  if (existing.backend === 'openai' && typeof existing.externalId === 'string' && existing.externalId.length > 0) {
    if (data.name !== undefined) {
      await openaiSync.updateOpenAIVectorStore({
        externalId: existing.externalId,
        name: data.name,
      });
    }
  }

  const [store] = await db
    .update(fluxcoreVectorStores)
    .set({ ...data, updatedAt: new Date() })
    .where(and(
      eq(fluxcoreVectorStores.id, id),
      eq(fluxcoreVectorStores.accountId, accountId)
    ))
    .returning();
  return store || null;
}

export async function deleteVectorStore(id: string, accountId: string): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(fluxcoreVectorStores)
    .where(and(
      eq(fluxcoreVectorStores.id, id),
      eq(fluxcoreVectorStores.accountId, accountId)
    ))
    .limit(1);

  if (!existing) return false;

  const usedBy = await db
    .select({ id: fluxcoreAssistants.id, name: fluxcoreAssistants.name })
    .from(fluxcoreAssistantVectorStores)
    .innerJoin(
      fluxcoreAssistants,
      eq(fluxcoreAssistantVectorStores.assistantId, fluxcoreAssistants.id)
    )
    .where(and(
      eq(fluxcoreAssistantVectorStores.vectorStoreId, id),
      eq(fluxcoreAssistants.accountId, accountId)
    ))
    .limit(1);

  if (usedBy.length > 0) {
    const err = new Error('No se puede eliminar: este vector store está siendo usado por un asistente') as FluxcoreConflictError;
    err.statusCode = 409;
    err.details = { usedByAssistants: usedBy };
    throw err;
  }

  if (existing.backend === 'openai' && typeof existing.externalId === 'string' && existing.externalId.length > 0) {
    await openaiSync.deleteOpenAIVectorStore(existing.externalId);
  }

  const result = await db
    .delete(fluxcoreVectorStores)
    .where(and(
      eq(fluxcoreVectorStores.id, id),
      eq(fluxcoreVectorStores.accountId, accountId)
    ))
    .returning();
  return result.length > 0;
}

// Vector Store Files
export async function getVectorStoreFiles(vectorStoreId: string): Promise<FluxcoreVectorStoreFile[]> {
  return db
    .select()
    .from(fluxcoreVectorStoreFiles)
    .where(eq(fluxcoreVectorStoreFiles.vectorStoreId, vectorStoreId))
    .orderBy(desc(fluxcoreVectorStoreFiles.createdAt));
}

export async function addVectorStoreFile(data: NewFluxcoreVectorStoreFile): Promise<FluxcoreVectorStoreFile> {
  const [file] = await db
    .insert(fluxcoreVectorStoreFiles)
    .values(data)
    .returning();
  
  // Actualizar contador de archivos en el vector store
  const files = await db
    .select()
    .from(fluxcoreVectorStoreFiles)
    .where(eq(fluxcoreVectorStoreFiles.vectorStoreId, data.vectorStoreId));
  
  await db
    .update(fluxcoreVectorStores)
    .set({ 
      fileCount: files.length,
      updatedAt: new Date() 
    })
    .where(eq(fluxcoreVectorStores.id, data.vectorStoreId));
  
  return file;
}

export async function deleteVectorStoreFile(id: string, vectorStoreId: string): Promise<boolean> {
  const result = await db
    .delete(fluxcoreVectorStoreFiles)
    .where(and(
      eq(fluxcoreVectorStoreFiles.id, id),
      eq(fluxcoreVectorStoreFiles.vectorStoreId, vectorStoreId)
    ))
    .returning();
  return result.length > 0;
}

export async function getVectorStoreFileById(id: string, vectorStoreId: string): Promise<FluxcoreVectorStoreFile | null> {
  const [row] = await db
    .select()
    .from(fluxcoreVectorStoreFiles)
    .where(and(
      eq(fluxcoreVectorStoreFiles.id, id),
      eq(fluxcoreVectorStoreFiles.vectorStoreId, vectorStoreId)
    ))
    .limit(1);
  return row || null;
}

export async function updateVectorStoreFileStatus(
  id: string,
  status: 'pending' | 'processing' | 'completed' | 'failed'
): Promise<void> {
  await db
    .update(fluxcoreVectorStoreFiles)
    .set({ status, updatedAt: new Date() })
    .where(eq(fluxcoreVectorStoreFiles.id, id));
}

// ============================================================================
// TOOLS
// ============================================================================

export async function getToolDefinitions() {
  return db
    .select()
    .from(fluxcoreToolDefinitions)
    .where(eq(fluxcoreToolDefinitions.isEnabled, true))
    .orderBy(fluxcoreToolDefinitions.category);
}

async function ensureToolConnections(accountId: string): Promise<void> {
  const defs = await db
    .select({
      id: fluxcoreToolDefinitions.id,
      authType: fluxcoreToolDefinitions.authType,
    })
    .from(fluxcoreToolDefinitions)
    .where(eq(fluxcoreToolDefinitions.isEnabled, true));

  if (defs.length === 0) return;

  const existing = await db
    .select({ toolDefinitionId: fluxcoreToolConnections.toolDefinitionId })
    .from(fluxcoreToolConnections)
    .where(eq(fluxcoreToolConnections.accountId, accountId));

  const existingIds = new Set(existing.map((c) => c.toolDefinitionId));
  const missing = defs.filter((d) => !existingIds.has(d.id));

  if (missing.length === 0) return;

  await db.insert(fluxcoreToolConnections).values(
    missing.map((def) => ({
      accountId,
      toolDefinitionId: def.id,
      status: 'disconnected',
      authConfig: { type: (def.authType as any) || 'none' },
    }))
  );
}

export async function getToolConnections(accountId: string): Promise<FluxcoreToolConnection[]> {
  await ensureToolConnections(accountId);
  return db
    .select()
    .from(fluxcoreToolConnections)
    .where(eq(fluxcoreToolConnections.accountId, accountId))
    .orderBy(desc(fluxcoreToolConnections.updatedAt));
}

export async function createToolConnection(data: NewFluxcoreToolConnection): Promise<FluxcoreToolConnection> {
  const [connection] = await db
    .insert(fluxcoreToolConnections)
    .values(data)
    .returning();
  return connection;
}

export async function updateToolConnection(
  id: string,
  accountId: string,
  data: Partial<NewFluxcoreToolConnection>
): Promise<FluxcoreToolConnection | null> {
  const [connection] = await db
    .update(fluxcoreToolConnections)
    .set({ ...data, updatedAt: new Date() })
    .where(and(
      eq(fluxcoreToolConnections.id, id),
      eq(fluxcoreToolConnections.accountId, accountId)
    ))
    .returning();
  return connection || null;
}

export async function deleteToolConnection(id: string, accountId: string): Promise<boolean> {
  const result = await db
    .delete(fluxcoreToolConnections)
    .where(and(
      eq(fluxcoreToolConnections.id, id),
      eq(fluxcoreToolConnections.accountId, accountId)
    ))
    .returning();
  return result.length > 0;
}

// Export como objeto para consistencia con otros servicios
export const fluxcoreService = {
  // Assistants
  getAssistants,
  getAssistantById,
  createAssistant,
  updateAssistant,
  setActiveAssistant,
  deleteAssistant,
  
  // Instructions
  getInstructions,
  getInstructionById,
  createInstruction,
  updateInstruction,
  deleteInstruction,
  
  // Vector Stores
  getVectorStores,
  getVectorStoreById,
  createVectorStore,
  updateVectorStore,
  deleteVectorStore,
  getVectorStoreFiles,
  addVectorStoreFile,
  deleteVectorStoreFile,
  getVectorStoreFileById,
  updateVectorStoreFileStatus,
  
  // Tools
  getToolDefinitions,
  getToolConnections,
  createToolConnection,
  updateToolConnection,
  deleteToolConnection,

  // Runtime
  getAssistantComposition,
  resolveActiveAssistant,
};
