/**
 * LLMClient — FluxCore v8.2
 *
 * Canon §4.7.1: Sovereign LLM client for AsistentesLocalRuntime.
 *
 * Thin wrapper over OpenAI-compatible chat completions API.
 * Supports groq and openai providers. Reads API keys from env.
 * No DB access. No state between calls.
 *
 * Invariant: This service ONLY calls the LLM API. It does NOT
 * read from DB, resolve assistants, or manage credits.
 */

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    tool_call_id?: string;
    tool_calls?: LLMToolCall[];
}

export interface LLMTool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}

export interface LLMToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface LLMCompletionParams {
    provider: 'groq' | 'openai';
    model: string;
    messages: LLMMessage[];
    maxTokens?: number;
    temperature?: number;
    tools?: LLMTool[];
    toolChoice?: 'auto' | 'none';
}

export interface LLMCompletionResult {
    content: string | null;
    toolCalls?: LLMToolCall[];
    finishReason?: string;
    model: string;
    provider: 'groq' | 'openai';
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

const PROVIDER_BASE_URLS: Record<'groq' | 'openai', string> = {
    groq: 'https://api.groq.com/openai/v1',
    openai: 'https://api.openai.com/v1',
};

class LLMClientService {

    /**
     * Call the LLM and return the completion text.
     * Falls back to the other provider if the primary fails.
     */
    async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
        const apiKey = this.getApiKey(params.provider);

        if (!apiKey) {
            // Try fallback provider
            const fallback = params.provider === 'groq' ? 'openai' : 'groq';
            const fallbackKey = this.getApiKey(fallback);
            if (!fallbackKey) {
                throw new Error(`No API key configured for providers: ${params.provider}, ${fallback}`);
            }
            console.warn(`[LLMClient] No key for ${params.provider}, falling back to ${fallback}`);
            return this.callAPI({ ...params, provider: fallback }, fallbackKey);
        }

        try {
            return await this.callAPI(params, apiKey);
        } catch (error: any) {
            // Attempt fallback on recoverable errors
            const fallback = params.provider === 'groq' ? 'openai' : 'groq';
            const fallbackKey = this.getApiKey(fallback);
            if (fallbackKey && (error.status === 429 || error.status === 503)) {
                console.warn(`[LLMClient] ${params.provider} failed (${error.status}), falling back to ${fallback}`);
                return this.callAPI({ ...params, provider: fallback }, fallbackKey);
            }
            throw error;
        }
    }

    private async callAPI(
        params: LLMCompletionParams,
        apiKey: string
    ): Promise<LLMCompletionResult> {
        const baseUrl = PROVIDER_BASE_URLS[params.provider];
        const url = `${baseUrl}/chat/completions`;

        const body: Record<string, unknown> = {
            model: params.model,
            messages: params.messages,
            max_tokens: params.maxTokens ?? 1024,
            temperature: params.temperature ?? 0.7,
        };

        if (params.tools && params.tools.length > 0) {
            body.tools = params.tools;
            body.tool_choice = params.toolChoice ?? 'auto';
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            const err = new Error(`LLM API error ${response.status}: ${errText.slice(0, 200)}`);
            (err as any).status = response.status;
            throw err;
        }

        const data = await response.json() as any;
        const choice = data.choices?.[0];
        const message = choice?.message;
        const finishReason: string = choice?.finish_reason ?? 'stop';

        const toolCalls: LLMToolCall[] | undefined =
            Array.isArray(message?.tool_calls) && message.tool_calls.length > 0
                ? message.tool_calls
                : undefined;

        const content: string | null = message?.content ?? null;

        if (!content && !toolCalls) {
            throw new Error(`LLM returned empty content and no tool calls. Model: ${params.model}`);
        }

        return {
            content,
            toolCalls,
            finishReason,
            model: data.model || params.model,
            provider: params.provider,
            usage: data.usage ? {
                promptTokens: data.usage.prompt_tokens ?? 0,
                completionTokens: data.usage.completion_tokens ?? 0,
                totalTokens: data.usage.total_tokens ?? 0,
            } : undefined,
        };
    }

    private getApiKey(provider: 'groq' | 'openai'): string | null {
        if (provider === 'groq') {
            return process.env.GROQ_API_KEY || null;
        }
        return process.env.OPENAI_API_KEY || null;
    }
}

export const llmClient = new LLMClientService();
