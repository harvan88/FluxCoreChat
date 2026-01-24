/**
 * OpenAI Sync Service
 * 
 * Servicio para interactuar con la plataforma OpenAI.
 * 
 * CONFORMIDAD CON REGLAS ARQUITECTÓNICAS:
 * - Regla 2.1: vs.openai es la ÚNICA fuente de verdad
 * - Regla 3.1: FluxCore almacena registro referencial derivado
 * - Regla 4.1: Toda mutación se ejecuta PRIMERO en OpenAI
 * - Regla 5.1: Ante discrepancias, vs.openai GANA SIEMPRE
 * - Regla 6.1: Búsqueda directa es solo para QA/debugging/testing
 * 
 * Este servicio:
 * - Ejecuta operaciones en OpenAI
 * - Lee estados desde OpenAI (fuente de verdad)
 * - Retorna datos para que FluxCore los refleje localmente
 */

import OpenAI from 'openai';
import type { AssistantModelConfig } from '@fluxcore/db';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno');
    }

    openaiClient = new OpenAI({
      apiKey,
      defaultHeaders: {
        'OpenAI-Beta': 'assistants=v2',
      },
    });
  }
  return openaiClient;
}

export async function getOpenAIAssistant(externalId: string): Promise<any> {
  const client = getOpenAIClient();
  const assistantsApi: any = (client as any).beta?.assistants ?? (client as any).assistants;
  if (!assistantsApi?.retrieve) {
    throw new Error('OpenAI SDK: assistants.retrieve no disponible');
  }
  return assistantsApi.retrieve(externalId);
}

function getVectorStoresApi(client: OpenAI): any {
  return (client as any).vectorStores ?? (client as any).beta?.vectorStores;
}

function getVectorStoresCandidates(client: OpenAI): any[] {
  const stable = (client as any).vectorStores;
  const beta = (client as any).beta?.vectorStores;
  return [stable, beta].filter(Boolean);
}

// ════════════════════════════════════════════════════════════════════════════
// INTERFACES - Assistants
// ════════════════════════════════════════════════════════════════════════════

export interface CreateOpenAIAssistantParams {
  name: string;
  description?: string;
  instructions: string;
  modelConfig: AssistantModelConfig;
  vectorStoreIds?: string[]; // IDs externos de OpenAI
}

export interface UpdateOpenAIAssistantParams {
  externalId: string;
  name?: string;
  description?: string;
  instructions?: string;
  modelConfig?: Partial<AssistantModelConfig>;
  vectorStoreIds?: string[];
}

// ════════════════════════════════════════════════════════════════════════════
// INTERFACES - Vector Stores (Alineadas con OpenAI API)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Estrategia de chunking en formato OpenAI
 */
export interface ChunkingStrategy {
  type: 'auto' | 'static';
  static?: {
    max_chunk_size_tokens: number;  // 100-4096
    chunk_overlap_tokens: number;    // <= max/2
  };
}

/**
 * File counts en formato OpenAI (LEÍDO desde OpenAI)
 */
export interface OpenAIFileCounts {
  in_progress: number;
  completed: number;
  failed: number;
  cancelled: number;
  total: number;
}

/**
 * Parámetros para crear Vector Store en OpenAI
 */
export interface CreateOpenAIVectorStoreParams {
  name: string;
  description?: string;
  fileIds?: string[];
  chunkingStrategy?: ChunkingStrategy;
  expiresAfter?: { anchor: 'last_active_at'; days: number };
  metadata?: Record<string, string>;
}

/**
 * Parámetros para actualizar Vector Store en OpenAI
 */
export interface UpdateOpenAIVectorStoreParams {
  externalId: string;
  name?: string;
  expiresAfter?: { anchor: 'last_active_at'; days: number } | null;
  metadata?: Record<string, string>;
}

/**
 * Parámetros para agregar archivo a Vector Store
 */
export interface AddFileToVectorStoreParams {
  vectorStoreId: string;
  fileId: string;
  chunkingStrategy?: ChunkingStrategy;
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Datos de Vector Store LEÍDOS desde OpenAI (fuente de verdad)
 */
export interface OpenAIVectorStoreData {
  id: string;
  status: 'expired' | 'in_progress' | 'completed';
  usageBytes: number;
  fileCounts: OpenAIFileCounts;
  lastActiveAt: number | null;
  expiresAt: number | null;
  name: string;
  metadata: Record<string, string> | null;
}

/**
 * Datos de archivo LEÍDOS desde OpenAI (fuente de verdad)
 */
export interface OpenAIFileData {
  id: string;
  status: string;
  usageBytes: number;
  attributes: Record<string, any>;
  chunkingStrategy: any;
  lastError: { code: string; message: string } | null;
}

// ════════════════════════════════════════════════════════════════════════════
// INTERFACES - Búsqueda (solo para QA/debugging/testing - Regla 6.1)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Parámetros para búsqueda en Vector Store
 * NOTA: Esta búsqueda NO reemplaza al Assistant. Es solo para QA/debugging.
 */
export interface VectorStoreSearchParams {
  query: string | string[];
  maxNumResults?: number;  // 1-50, default 10
  rewriteQuery?: boolean;
  rankingOptions?: {
    ranker?: 'none' | 'auto' | 'default-2024-11-15';
    scoreThreshold?: number;
  };
  filters?: SearchFilter;
}

export type SearchFilter =
  | { type: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'; key: string; value: string | number }
  | { type: 'and' | 'or'; filters: SearchFilter[] };

export interface VectorStoreSearchResult {
  fileId: string;
  filename: string;
  score: number;
  attributes: Record<string, string | number | boolean>;
  content: Array<{ type: 'text'; text: string }>;
}

/**
 * Crea un asistente en OpenAI
 */
export async function createOpenAIAssistant(params: CreateOpenAIAssistantParams): Promise<string> {
  const client = getOpenAIClient();

  const tools: any[] = [];

  // Si hay vector stores, agregar file_search
  if (params.vectorStoreIds && params.vectorStoreIds.length > 0) {
    tools.push({ type: 'file_search' });
  }

  const assistant = await client.beta.assistants.create({
    name: params.name,
    description: params.description,
    model: params.modelConfig.model,
    instructions: params.instructions,
    temperature: params.modelConfig.temperature,
    top_p: params.modelConfig.topP,
    tools: tools.length > 0 ? tools : undefined,
    tool_resources: params.vectorStoreIds && params.vectorStoreIds.length > 0
      ? {
        file_search: {
          vector_store_ids: params.vectorStoreIds
        }
      }
      : undefined,
  });

  return assistant.id;
}

/**
 * Actualiza un asistente en OpenAI
 */
export async function updateOpenAIAssistant(params: UpdateOpenAIAssistantParams): Promise<void> {
  const client = getOpenAIClient();

  const updateData: any = {};

  if (params.name !== undefined) updateData.name = params.name;
  if (params.description !== undefined) updateData.description = params.description;
  if (params.instructions !== undefined) updateData.instructions = params.instructions;

  if (params.modelConfig) {
    if (params.modelConfig.model !== undefined) updateData.model = params.modelConfig.model;
    if (params.modelConfig.temperature !== undefined) updateData.temperature = params.modelConfig.temperature;
    if (params.modelConfig.topP !== undefined) updateData.top_p = params.modelConfig.topP;
  }

  if (params.vectorStoreIds !== undefined) {
    const tools: any[] = [];

    if (params.vectorStoreIds.length > 0) {
      tools.push({ type: 'file_search' });
      updateData.tool_resources = {
        file_search: {
          vector_store_ids: params.vectorStoreIds
        }
      };
    } else {
      updateData.tool_resources = {
        file_search: {
          vector_store_ids: []
        }
      };
    }

    if (tools.length > 0) {
      updateData.tools = tools;
    }
  }

  await client.beta.assistants.update(params.externalId, updateData);
}

/**
 * Elimina un asistente de OpenAI
 */
export async function deleteOpenAIAssistant(externalId: string): Promise<void> {
  const client = getOpenAIClient();
  const assistants: any = (client as any).beta?.assistants;
  if (assistants?.delete) {
    await assistants.delete(externalId);
    return;
  }
  if (assistants?.del) {
    await assistants.del(externalId);
    return;
  }
  throw new Error('OpenAI SDK: assistants.delete no disponible');
}

/**
 * Crea un vector store en OpenAI
 * Retorna el ID y los datos de OpenAI para que FluxCore los refleje localmente
 */
export async function createOpenAIVectorStore(params: CreateOpenAIVectorStoreParams): Promise<{
  id: string;
  externalData: OpenAIVectorStoreData;
}> {
  const client = getOpenAIClient();

  const payload: any = { name: params.name };

  // Descripción
  if (params.description) {
    payload.description = params.description;
  }

  // Archivos iniciales
  if (params.fileIds && params.fileIds.length > 0) {
    payload.file_ids = params.fileIds;
  }

  // Estrategia de chunking (solo aplica si hay file_ids)
  if (params.chunkingStrategy) {
    payload.chunking_strategy = params.chunkingStrategy;
  }

  // Política de expiración
  if (params.expiresAfter) {
    payload.expires_after = params.expiresAfter;
  }

  // Metadata
  if (params.metadata && Object.keys(params.metadata).length > 0) {
    payload.metadata = params.metadata;
  }

  const candidates = getVectorStoresCandidates(client);
  if (candidates.length === 0) {
    throw new Error('OpenAI SDK: vectorStores namespace no disponible');
  }

  let lastError: unknown;
  for (const api of candidates) {
    if (!api?.create) continue;
    try {
      const vectorStore = await api.create(payload);

      // Retornar datos LEÍDOS desde OpenAI (fuente de verdad)
      return {
        id: vectorStore.id,
        externalData: {
          id: vectorStore.id,
          status: vectorStore.status,
          usageBytes: vectorStore.usage_bytes || 0,
          fileCounts: vectorStore.file_counts || {
            in_progress: 0,
            completed: 0,
            failed: 0,
            cancelled: 0,
            total: 0,
          },
          lastActiveAt: vectorStore.last_active_at,
          expiresAt: vectorStore.expires_at,
          name: vectorStore.name,
          metadata: vectorStore.metadata,
        },
      };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to create vector store on OpenAI');
}

/**
 * Actualiza un vector store en OpenAI
 */
export async function updateOpenAIVectorStore(params: UpdateOpenAIVectorStoreParams): Promise<void> {
  const client = getOpenAIClient();

  const vectorStores: any = getVectorStoresApi(client);
  if (!vectorStores?.update) {
    throw new Error('OpenAI SDK: vectorStores.update no disponible');
  }

  const updateData: any = {};

  if (params.name !== undefined) {
    updateData.name = params.name;
  }

  await vectorStores.update(params.externalId, updateData);
}

/**
 * Elimina un vector store de OpenAI
 */
export async function deleteOpenAIVectorStore(externalId: string): Promise<void> {
  const client = getOpenAIClient();
  const vectorStores: any = getVectorStoresApi(client);
  if (vectorStores?.delete) {
    await vectorStores.delete(externalId);
    return;
  }
  if (vectorStores?.del) {
    await vectorStores.del(externalId);
    return;
  }
  throw new Error('OpenAI SDK: vectorStores.delete no disponible');
}

/**
 * Sube un archivo a OpenAI para usar en vector stores
 */
export async function uploadOpenAIFile(file: Buffer, filename: string): Promise<string> {
  const client = getOpenAIClient();

  const toFileFn = (OpenAI as any).toFile;
  const fileObj = toFileFn ? await toFileFn(file, filename) : new File([file as any], filename);
  const uploadedFile = await client.files.create({ file: fileObj, purpose: 'assistants' });

  return uploadedFile.id;
}

/**
 * Agrega un archivo a un vector store en OpenAI
 * Soporta chunkingStrategy y attributes
 */
export async function addFileToOpenAIVectorStore(
  params: AddFileToVectorStoreParams
): Promise<OpenAIFileData> {
  const client = getOpenAIClient();

  const vectorStores: any = getVectorStoresApi(client);
  if (!vectorStores?.files?.create) {
    throw new Error('OpenAI SDK: vectorStores.files.create no disponible');
  }

  const payload: any = {
    file_id: params.fileId,
  };

  // Estrategia de chunking
  if (params.chunkingStrategy) {
    payload.chunking_strategy = params.chunkingStrategy;
  }

  // Atributos para filtrado en búsquedas
  if (params.attributes && Object.keys(params.attributes).length > 0) {
    payload.attributes = params.attributes;
  }

  const file = await vectorStores.files.create(params.vectorStoreId, payload);

  // Retornar datos LEÍDOS desde OpenAI (fuente de verdad)
  return {
    id: file.id,
    status: file.status,
    usageBytes: file.usage_bytes || 0,
    attributes: file.attributes || {},
    chunkingStrategy: file.chunking_strategy,
    lastError: file.last_error || null,
  };
}

/**
 * Agrega un archivo a un vector store (firma legacy para compatibilidad)
 */
export async function addFileToOpenAIVectorStoreLegacy(
  vectorStoreId: string,
  fileId: string
): Promise<void> {
  await addFileToOpenAIVectorStore({ vectorStoreId, fileId });
}

/**
 * Elimina un archivo de un vector store en OpenAI
 */
export async function removeFileFromOpenAIVectorStore(vectorStoreId: string, fileId: string): Promise<void> {
  const client = getOpenAIClient();

  const vectorStores: any = getVectorStoresApi(client);
  if (vectorStores?.files?.delete) {
    await vectorStores.files.delete(vectorStoreId, fileId);
    return;
  }
  if (vectorStores?.files?.del) {
    await vectorStores.files.del(vectorStoreId, fileId);
    return;
  }
  throw new Error('OpenAI SDK: vectorStores.files.delete no disponible');
}

export async function getOpenAIVectorStoreFile(vectorStoreId: string, fileId: string): Promise<any> {
  const client = getOpenAIClient();
  const vectorStores: any = getVectorStoresApi(client);
  if (!vectorStores?.files?.retrieve) {
    throw new Error('OpenAI SDK: vectorStores.files.retrieve no disponible');
  }
  return vectorStores.files.retrieve(vectorStoreId, fileId);
}

/**
 * Elimina un archivo de OpenAI
 */
export async function deleteOpenAIFile(fileId: string): Promise<void> {
  const client = getOpenAIClient();
  const filesApi: any = (client as any).files;
  if (filesApi?.delete) {
    await filesApi.delete(fileId);
    return;
  }
  if (filesApi?.del) {
    await filesApi.del(fileId);
    return;
  }
  throw new Error('OpenAI SDK: files.delete no disponible');
}

/**
 * Verifica si la API key de OpenAI está configurada y es válida
 */
export async function validateOpenAIKey(): Promise<boolean> {
  try {
    const client = getOpenAIClient();
    await client.models.list();
    return true;
  } catch (error) {
    console.error('Error validando API key de OpenAI:', error);
    return false;
  }
}

/**
 * Verifica si OpenAI está disponible
 */
export function isOpenAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// ════════════════════════════════════════════════════════════════════════════
// ASSISTANTS API: Threads & Runs
// Estas funciones permiten usar la API de Assistants de OpenAI para generar

export interface CreateThreadAndRunParams {
  assistantExternalId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  additionalInstructions?: string;
  traceId?: string;
}

export interface AssistantRunResult {
  success: boolean;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  threadId?: string;
  runId?: string;
  error?: string;
}

/**
 * Crea un thread, agrega mensajes, ejecuta el asistente y espera la respuesta.
 * Este es el flujo completo para usar un asistente de OpenAI.
 */
export async function runAssistantWithMessages(
  params: CreateThreadAndRunParams
): Promise<AssistantRunResult> {
  const client = getOpenAIClient();
  const tracePrefix = params.traceId ? `[openai-sync][${params.traceId}]` : '[openai-sync]';
  const start = Date.now();

  try {
    console.log(`${tracePrefix} Starting assistant run`, {
      assistantExternalId: params.assistantExternalId,
      messagesCount: Array.isArray(params.messages) ? params.messages.length : 0,
      hasAdditionalInstructions: typeof params.additionalInstructions === 'string' && params.additionalInstructions.length > 0,
    });

    // 1. Crear un nuevo thread con los mensajes
    const thread = await client.beta.threads.create({
      messages: params.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    console.log(`${tracePrefix} Thread created`, {
      threadId: thread.id,
      elapsedMs: Date.now() - start,
    });

    // 2. Crear y ejecutar un run con el asistente
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: params.assistantExternalId,
      additional_instructions: params.additionalInstructions,
    });

    console.log(`${tracePrefix} Run created`, {
      threadId: thread.id,
      runId: run.id,
      elapsedMs: Date.now() - start,
    });

    // 3. Esperar a que el run complete (polling)
    const completedRun = await waitForRunCompletion(client, thread.id, run.id, 60000, params.traceId);

    console.log(`${tracePrefix} Run finished`, {
      threadId: thread.id,
      runId: run.id,
      status: completedRun?.status,
      elapsedMs: Date.now() - start,
      lastError: completedRun?.last_error?.message,
    });

    if (completedRun.status !== 'completed') {
      return {
        success: false,
        content: '',
        threadId: thread.id,
        runId: run.id,
        error: `Run terminó con estado: ${completedRun.status}${completedRun.last_error ? ` - ${completedRun.last_error.message}` : ''}`,
      };
    }

    // 4. Obtener los mensajes del thread (la respuesta del asistente)
    const messages = await client.beta.threads.messages.list(thread.id, {
      order: 'desc',
      limit: 1,
    });

    console.log(`${tracePrefix} Thread messages fetched`, {
      threadId: thread.id,
      runId: run.id,
      fetchedCount: Array.isArray(messages?.data) ? messages.data.length : 0,
      elapsedMs: Date.now() - start,
    });

    const assistantMessage = messages.data.find(m => m.role === 'assistant');
    if (!assistantMessage) {
      return {
        success: false,
        content: '',
        threadId: thread.id,
        runId: run.id,
        error: 'No se encontró respuesta del asistente',
      };
    }

    // Extraer el contenido de texto
    let responseContent = '';
    for (const block of assistantMessage.content) {
      if (block.type === 'text') {
        responseContent += block.text.value;
      }
    }

    return {
      success: true,
      content: responseContent,
      threadId: thread.id,
      runId: run.id,
      usage: completedRun.usage ? {
        promptTokens: completedRun.usage.prompt_tokens,
        completionTokens: completedRun.usage.completion_tokens,
        totalTokens: completedRun.usage.total_tokens,
      } : undefined,
    };
  } catch (error: any) {
    console.error(`${tracePrefix} Error running assistant`, {
      message: error?.message || String(error),
      stack: error?.stack,
      elapsedMs: Date.now() - start,
    });
    return {
      success: false,
      content: '',
      error: error.message || 'Error desconocido al ejecutar el asistente',
    };
  }
}

/**
 * Espera a que un run complete (polling con exponential backoff)
 */
async function waitForRunCompletion(
  client: OpenAI,
  threadId: string,
  runId: string,
  maxWaitMs: number = 60000,
  traceId?: string
): Promise<any> {
  const tracePrefix = traceId ? `[openai-sync][${traceId}]` : '[openai-sync]';
  const startTime = Date.now();
  let pollInterval = 500; // Empezar con 500ms
  const maxPollInterval = 2000; // Máximo 2 segundos
  let polls = 0;

  while (Date.now() - startTime < maxWaitMs) {
    let run: any;
    try {
      // Some SDK versions: retrieve(threadId, runId)
      run = await (client.beta.threads.runs as any).retrieve(threadId, runId);
    } catch (err) {
      // Other SDK versions: retrieve(runId, { thread_id })
      run = await (client.beta.threads.runs as any).retrieve(runId, { thread_id: threadId });
    }
    polls += 1;

    // Estados terminales
    if (['completed', 'failed', 'cancelled', 'expired', 'incomplete'].includes(run.status)) {
      console.log(`${tracePrefix} Polling finished`, {
        threadId,
        runId,
        status: run.status,
        polls,
        elapsedMs: Date.now() - startTime,
      });
      return run;
    }

    // Esperar antes del siguiente poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    // Incrementar el intervalo (exponential backoff)
    pollInterval = Math.min(pollInterval * 1.5, maxPollInterval);
  }

  console.warn(`${tracePrefix} Run timeout`, {
    threadId,
    runId,
    polls,
    maxWaitMs,
  });
  throw new Error(`Run timeout after ${maxWaitMs}ms`);
}

/**
 * Elimina un thread de OpenAI
 */
export async function deleteThread(threadId: string): Promise<void> {
  const client = getOpenAIClient();
  const threads: any = (client as any).beta?.threads ?? (client as any).threads;
  if (threads?.del) {
    await threads.del(threadId);
    return;
  }
  if (threads?.delete) {
    await threads.delete(threadId);
    return;
  }
  throw new Error('OpenAI SDK: threads.delete no disponible');
}

// ════════════════════════════════════════════════════════════════════════════
// NUEVAS FUNCIONES - Alineación con OpenAI API
// Conformidad con Reglas Arquitectónicas
// ════════════════════════════════════════════════════════════════════════════

/**
 * Lee el estado de un Vector Store desde OpenAI (fuente de verdad)
 * 
 * REGLA 2.1: vs.openai es la ÚNICA fuente de verdad
 * REGLA 5.1: Ante discrepancias, vs.openai GANA SIEMPRE
 * 
 * Esta función debe usarse para actualizar el registro local con datos reales.
 */


/**
 * Lista archivos de un Vector Store con paginación
 * Lee datos desde OpenAI (fuente de verdad)
 */
/**
 * Sincroniza un Vector Store local con el estado real de OpenAI
 * - Actualiza metadatos del VS
 * - Sincroniza lista completa de archivos (Updates/Deletes)
 */
export async function syncVectorStoreFromOpenAI(
  vectorStoreId: string,
  externalId: string,
  accountId: string
): Promise<void> {
  const { fluxcoreService } = await import('./fluxcore.service');

  // 1. Obtener lista completa de archivos desde OpenAI
  const remoteFiles: OpenAIFileData[] = [];
  let hasMore = true;
  let after: string | undefined = undefined;
  let pages = 0;

  while (hasMore && pages < 100) { // Safety limit
    const page = await listOpenAIVectorStoreFiles(externalId, { limit: 50, after });
    remoteFiles.push(...page.files);
    hasMore = page.hasMore;
    after = page.lastId;
    pages++;
  }

  // 2. Sincronizar archivos usando FluxCoreService
  await fluxcoreService.syncVectorStoreFiles(vectorStoreId, remoteFiles);

  // 3. Actualizar metadatos del VS (file counts, uso, expiración)
  try {
    const client = getOpenAIClient();
    const vectorStores: any = getVectorStoresApi(client);

    if (vectorStores?.retrieve) {
      const vs = await vectorStores.retrieve(externalId);
      await fluxcoreService.updateVectorStoreFromOpenAI(vectorStoreId, accountId, {
        status: vs.status,
        usageBytes: vs.usage_bytes || 0,
        fileCounts: vs.file_counts,
        lastActiveAt: vs.last_active_at ? new Date(vs.last_active_at * 1000) : null,
        expiresAt: vs.expires_at ? new Date(vs.expires_at * 1000) : null,
        metadata: vs.metadata,
        name: vs.name,
      });
    }
  } catch (err) {
    console.warn('[openai-sync] Error updating vector store metadata:', err);
    // No lanzar error si falla metadata, ya que los archivos era lo crítico
  }
}

export async function listOpenAIVectorStoreFiles(
  vectorStoreId: string,
  options?: {
    limit?: number;
    after?: string;
    filter?: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  }
): Promise<{
  files: OpenAIFileData[];
  hasMore: boolean;
  lastId?: string;
}> {
  const client = getOpenAIClient();
  const vectorStores: any = getVectorStoresApi(client);

  if (!vectorStores?.files?.list) {
    throw new Error('OpenAI SDK: vectorStores.files.list no disponible');
  }

  const params: any = {
    limit: options?.limit ?? 20,
  };
  if (options?.after) params.after = options.after;
  if (options?.filter) params.filter = options.filter;

  const response = await vectorStores.files.list(vectorStoreId, params);

  const files: OpenAIFileData[] = [];

  // Iterar sobre los resultados (puede ser async iterator o array)
  if (Symbol.asyncIterator in response) {
    for await (const file of response) {
      files.push({
        id: file.id,
        status: file.status,
        usageBytes: file.usage_bytes || 0,
        attributes: file.attributes || {},
        chunkingStrategy: file.chunking_strategy,
        lastError: file.last_error || null,
      });
    }
  } else if (Array.isArray(response.data)) {
    for (const file of response.data) {
      files.push({
        id: file.id,
        status: file.status,
        usageBytes: file.usage_bytes || 0,
        attributes: file.attributes || {},
        chunkingStrategy: file.chunking_strategy,
        lastError: file.last_error || null,
      });
    }
  }

  return {
    files,
    hasMore: response.has_more ?? false,
    lastId: files.length > 0 ? files[files.length - 1].id : undefined,
  };
}

/**
 * Búsqueda semántica en un Vector Store de OpenAI
 * 
 * REGLA 6.1: Esta búsqueda NO reemplaza al Assistant.
 * Su propósito es: QA, debugging, testing de embeddings, habilitar modelos no-OpenAI.
 */
export async function searchOpenAIVectorStore(
  vectorStoreId: string,
  params: VectorStoreSearchParams
): Promise<VectorStoreSearchResult[]> {
  const client = getOpenAIClient();
  const vectorStores: any = getVectorStoresApi(client);

  if (!vectorStores?.search) {
    throw new Error('OpenAI SDK: vectorStores.search no disponible');
  }

  const payload: any = {
    query: params.query,
    max_num_results: params.maxNumResults ?? 10,
    rewrite_query: params.rewriteQuery ?? false,
  };

  if (params.rankingOptions) {
    payload.ranking_options = {
      ranker: params.rankingOptions.ranker,
      score_threshold: params.rankingOptions.scoreThreshold,
    };
  }

  if (params.filters) {
    payload.filters = params.filters;
  }

  const response = await vectorStores.search(vectorStoreId, payload);

  const results: VectorStoreSearchResult[] = [];

  // Iterar sobre los resultados
  if (Symbol.asyncIterator in response) {
    for await (const result of response) {
      results.push({
        fileId: result.file_id,
        filename: result.filename,
        score: result.score,
        attributes: result.attributes || {},
        content: result.content || [],
      });
    }
  } else if (Array.isArray(response.data)) {
    for (const result of response.data) {
      results.push({
        fileId: result.file_id,
        filename: result.filename,
        score: result.score,
        attributes: result.attributes || {},
        content: result.content || [],
      });
    }
  }

  return results;
}

/**
 * Crea un batch de archivos en un Vector Store
 * Retorna el ID del batch para tracking
 */
export async function createOpenAIFileBatch(
  vectorStoreId: string,
  files: Array<{
    file_id: string;
    attributes?: Record<string, string | number | boolean>;
    chunking_strategy?: ChunkingStrategy;
  }>
): Promise<{
  batchId: string;
  status: string;
  fileCounts: OpenAIFileCounts;
}> {
  const client = getOpenAIClient();
  const vectorStores: any = getVectorStoresApi(client);

  if (!vectorStores?.fileBatches?.create) {
    throw new Error('OpenAI SDK: vectorStores.fileBatches.create no disponible');
  }

  const batch = await vectorStores.fileBatches.create(vectorStoreId, {
    files: files.map((f) => ({
      file_id: f.file_id,
      attributes: f.attributes,
      chunking_strategy: f.chunking_strategy,
    })),
  });

  return {
    batchId: batch.id,
    status: batch.status,
    fileCounts: batch.file_counts || {
      in_progress: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      total: 0,
    },
  };
}

/**
 * Obtiene el estado de un batch de archivos
 */
export async function getOpenAIFileBatchStatus(
  vectorStoreId: string,
  batchId: string
): Promise<{
  status: string;
  fileCounts: OpenAIFileCounts;
}> {
  const client = getOpenAIClient();
  const vectorStores: any = getVectorStoresApi(client);

  if (!vectorStores?.fileBatches?.retrieve) {
    throw new Error('OpenAI SDK: vectorStores.fileBatches.retrieve no disponible');
  }

  const batch = await vectorStores.fileBatches.retrieve(vectorStoreId, batchId);

  return {
    status: batch.status,
    fileCounts: batch.file_counts || {
      in_progress: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      total: 0,
    },
  };
}

