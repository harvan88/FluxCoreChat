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
import * as vectorStoreService from './fluxcore/vector-store.service';
import * as assistantsService from './fluxcore/assistants.service';
import * as runtimeService from './fluxcore/runtime.service';
import {
  db,
  fluxcoreAssistants,
  fluxcoreInstructions,
  fluxcoreInstructionVersions,
  fluxcoreAssistantInstructions,
  fluxcoreToolDefinitions,
  fluxcoreToolConnections,
  type FluxcoreInstruction,
  type NewFluxcoreInstruction,
  type FluxcoreToolConnection,
  type NewFluxcoreToolConnection,
} from '@fluxcore/db';

export type FluxcoreInstructionWithContent = FluxcoreInstruction & {
  content: string;
  sizeBytes: number;
  tokensEstimated: number;
  wordCount: number;
  lineCount: number;
};



type FluxcoreConflictError = Error & {
  statusCode?: number;
  details?: any;
};



// ============================================================================
// COMPOSITION & RUNTIME (Refactorizado a ./fluxcore/runtime.service.ts)
// ============================================================================
export * from './fluxcore/runtime.service';

// ============================================================================
// ASSISTANTS (Refactorizado a ./fluxcore/assistants.service.ts)
// ============================================================================
export * from './fluxcore/assistants.service';

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
    content = await assistantsService.generateManagedInstructionContent(accountId);
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
// VECTOR STORES (Refactorizado a ./fluxcore/vector-store.service.ts)
// ============================================================================
export * from './fluxcore/vector-store.service';

// ============================================================================
// TOOLS
// ============================================================================

const TEMPLATES_TOOL_DEF_ID = '9e8c7b6a-5d4e-4f3a-2b1c-0d9e8f7a6b5c';

async function ensureSystemTools() {
  const [existing] = await db
    .select()
    .from(fluxcoreToolDefinitions)
    .where(eq(fluxcoreToolDefinitions.id, TEMPLATES_TOOL_DEF_ID));

  if (!existing) {
    // Si no existe, lo creamos. Si ya existe slug duplicado, podría fallar,
    // pero asumimos que este ID es el canónico para este slug.
    await db.insert(fluxcoreToolDefinitions).values({
      id: TEMPLATES_TOOL_DEF_ID,
      slug: 'templates',
      name: 'Envío de Plantillas',
      description: 'Permite a la IA seleccionar y enviar plantillas de mensajes predefinidas y autorizadas.',
      category: 'Comunicación',
      authType: 'none',
      isEnabled: true,
      updatedAt: new Date(),
    });
  }
}

export async function getToolDefinitions() {
  await ensureSystemTools();

  const dbTools = await db
    .select()
    .from(fluxcoreToolDefinitions)
    .where(eq(fluxcoreToolDefinitions.isEnabled, true))
    .orderBy(fluxcoreToolDefinitions.category);

  return dbTools;
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
  await ensureSystemTools();
  await ensureToolConnections(accountId);

  const dbConnections = await db
    .select()
    .from(fluxcoreToolConnections)
    .where(eq(fluxcoreToolConnections.accountId, accountId))
    .orderBy(desc(fluxcoreToolConnections.updatedAt));

  return dbConnections;
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
  getAssistants: assistantsService.getAssistants,
  getAssistantById: assistantsService.getAssistantById,
  createAssistant: assistantsService.createAssistant,
  updateAssistant: assistantsService.updateAssistant,
  setActiveAssistant: assistantsService.setActiveAssistant,
  deleteAssistant: assistantsService.deleteAssistant,

  // Instructions
  getInstructions,
  getInstructionById,
  createInstruction,
  updateInstruction,
  deleteInstruction,

  // Vector Stores
  getVectorStores: vectorStoreService.getVectorStores,
  getVectorStoreById: vectorStoreService.getVectorStoreById,
  createVectorStore: vectorStoreService.createVectorStore,
  updateVectorStore: vectorStoreService.updateVectorStore,
  updateVectorStoreFromOpenAI: vectorStoreService.updateVectorStoreFromOpenAI,
  deleteVectorStore: vectorStoreService.deleteVectorStore,
  getVectorStoreFiles: vectorStoreService.getVectorStoreFiles,
  addVectorStoreFile: vectorStoreService.addVectorStoreFile,
  deleteVectorStoreFile: vectorStoreService.deleteVectorStoreFile,
  getVectorStoreFileById: vectorStoreService.getVectorStoreFileById,
  updateVectorStoreFileStatus: vectorStoreService.updateVectorStoreFileStatus,
  syncVectorStoreFiles: vectorStoreService.syncVectorStoreFiles, // <--- EXPORTADO

  // Tools
  getToolDefinitions,
  getToolConnections,
  createToolConnection,
  updateToolConnection,
  deleteToolConnection,

  // Runtime
  getAssistantComposition: runtimeService.getAssistantComposition,
  resolveActiveAssistant: runtimeService.resolveActiveAssistant,
};
