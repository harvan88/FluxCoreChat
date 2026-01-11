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
import { eq, and, desc } from 'drizzle-orm';
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

// ============================================================================
// COMPOSITION & RUNTIME (Brain)
// ============================================================================

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
    
    // Si hay una versión fijada y no coincide con la current (que trajimos en el join por defecto), hacer fetch extra
    if (link.versionId && link.versionId !== instruction.currentVersionId) {
      const [pinnedVersion] = await db
        .select()
        .from(fluxcoreInstructionVersions)
        .where(eq(fluxcoreInstructionVersions.id, link.versionId))
        .limit(1);
      if (pinnedVersion) content = pinnedVersion.content;
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
  const [activeAssistant] = await db
    .select()
    .from(fluxcoreAssistants)
    .where(and(
      eq(fluxcoreAssistants.accountId, accountId),
      eq(fluxcoreAssistants.status, 'production')
    ))
    .limit(1);

  if (!activeAssistant) {
    return null;
  }

  return getAssistantComposition(activeAssistant.id);
}

// ============================================================================
// ASSISTANTS
// ============================================================================

export async function getAssistants(accountId: string): Promise<FluxcoreAssistant[]> {
  return db
    .select()
    .from(fluxcoreAssistants)
    .where(eq(fluxcoreAssistants.accountId, accountId))
    .orderBy(desc(fluxcoreAssistants.updatedAt));
}

export async function getAssistantById(id: string, accountId: string): Promise<FluxcoreAssistant | null> {
  const [assistant] = await db
    .select()
    .from(fluxcoreAssistants)
    .where(and(
      eq(fluxcoreAssistants.id, id),
      eq(fluxcoreAssistants.accountId, accountId)
    ))
    .limit(1);
  return assistant || null;
}

export interface CreateAssistantDTO extends NewFluxcoreAssistant {
  instructionIds?: string[];
  vectorStoreIds?: string[];
  toolIds?: string[];
}

export async function createAssistant(data: CreateAssistantDTO): Promise<FluxcoreAssistant> {
  // 1. Create Assistant
  const { instructionIds, vectorStoreIds, toolIds, ...assistantData } = data;
  
  const [assistant] = await db
    .insert(fluxcoreAssistants)
    .values(assistantData)
    .returning();

  // 2. Create Relations
  if (instructionIds && instructionIds.length > 0) {
    await db.insert(fluxcoreAssistantInstructions).values(
      instructionIds.map((id, index) => ({
        assistantId: assistant.id,
        instructionId: id,
        order: index,
      }))
    );
  }

  if (vectorStoreIds && vectorStoreIds.length > 0) {
    await db.insert(fluxcoreAssistantVectorStores).values(
      vectorStoreIds.map((id) => ({
        assistantId: assistant.id,
        vectorStoreId: id,
        accessMode: 'read',
      }))
    );
  }

  if (toolIds && toolIds.length > 0) {
    await db.insert(fluxcoreAssistantTools).values(
      toolIds.map((toolConnectionId) => ({
        assistantId: assistant.id,
        toolConnectionId,
      }))
    );
  }

  return assistant;
}

export async function updateAssistant(
  id: string,
  accountId: string,
  data: Partial<CreateAssistantDTO>
): Promise<FluxcoreAssistant | null> {
  const { instructionIds, vectorStoreIds, toolIds, ...assistantData } = data;

  // 1. Update Assistant Fields
  const [assistant] = await db
    .update(fluxcoreAssistants)
    .set({ ...assistantData, updatedAt: new Date() })
    .where(and(
      eq(fluxcoreAssistants.id, id),
      eq(fluxcoreAssistants.accountId, accountId)
    ))
    .returning();

  if (!assistant) return null;

  // 2. Update Relations (Replace All strategy for simplicity)
  
  // Instructions
  if (instructionIds !== undefined) {
    await db.delete(fluxcoreAssistantInstructions).where(eq(fluxcoreAssistantInstructions.assistantId, id));
    if (instructionIds.length > 0) {
      await db.insert(fluxcoreAssistantInstructions).values(
        instructionIds.map((instId, index) => ({
          assistantId: id,
          instructionId: instId,
          order: index,
        }))
      );
    }
  }

  // Vector Stores
  if (vectorStoreIds !== undefined) {
    await db.delete(fluxcoreAssistantVectorStores).where(eq(fluxcoreAssistantVectorStores.assistantId, id));
    if (vectorStoreIds.length > 0) {
      await db.insert(fluxcoreAssistantVectorStores).values(
        vectorStoreIds.map((vsId) => ({
          assistantId: id,
          vectorStoreId: vsId,
          accessMode: 'read',
        }))
      );
    }
  }

  // Tools
  if (toolIds !== undefined) {
    await db.delete(fluxcoreAssistantTools).where(eq(fluxcoreAssistantTools.assistantId, id));
    if (toolIds.length > 0) {
      await db.insert(fluxcoreAssistantTools).values(
        toolIds.map((toolConnectionId) => ({
          assistantId: id,
          toolConnectionId,
        }))
      );
    }
  }

  return assistant;
}

export async function deleteAssistant(id: string, accountId: string): Promise<boolean> {
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

  return {
    ...row.instruction,
    content: row.version?.content || '',
    sizeBytes: row.version?.sizeBytes || 0,
    tokensEstimated: row.version?.tokensEstimated || 0,
    wordCount: row.version?.wordCount || 0,
    lineCount: row.version?.lineCount || 0,
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

    return updatedInstruction || instruction;
  }

  return instruction;
}

export async function deleteInstruction(id: string, accountId: string): Promise<boolean> {
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
  const [store] = await db
    .insert(fluxcoreVectorStores)
    .values(data)
    .returning();
  return store;
}

export async function updateVectorStore(
  id: string,
  accountId: string,
  data: Partial<NewFluxcoreVectorStore>
): Promise<FluxcoreVectorStore | null> {
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
