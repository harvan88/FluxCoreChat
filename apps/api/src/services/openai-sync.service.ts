/**
 * OpenAI Sync Service
 * 
 * Servicio para sincronizar asistentes y vector stores con la plataforma OpenAI.
 * FluxCore es la fuente de verdad, este servicio hace push unidireccional a OpenAI.
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

export interface CreateOpenAIVectorStoreParams {
  name: string;
  fileIds?: string[]; // IDs externos de archivos OpenAI
}

export interface UpdateOpenAIVectorStoreParams {
  externalId: string;
  name?: string;
  fileIds?: string[];
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
 */
export async function createOpenAIVectorStore(params: CreateOpenAIVectorStoreParams): Promise<string> {
  const client = getOpenAIClient();

  const payload: any = { name: params.name };
  if (params.fileIds && params.fileIds.length > 0) {
    payload.file_ids = params.fileIds;
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
      return vectorStore.id;
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
 */
export async function addFileToOpenAIVectorStore(vectorStoreId: string, fileId: string): Promise<void> {
  const client = getOpenAIClient();

  const vectorStores: any = getVectorStoresApi(client);
  if (!vectorStores?.files?.create) {
    throw new Error('OpenAI SDK: vectorStores.files.create no disponible');
  }

  await vectorStores.files.create(vectorStoreId, {
    file_id: fileId,
  });
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
