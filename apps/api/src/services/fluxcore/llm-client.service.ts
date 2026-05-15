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
    provider: 'groq' | 'openai' | 'google';
    model: string;
    messages: LLMMessage[];
    maxTokens?: number;
    temperature?: number;
    tools?: LLMTool[];
    toolChoice?: 'auto' | 'none';
    responseFormat?: { type: 'text' | 'json_object' };
}

export interface LLMCompletionResult {
    content: string | null;
    toolCalls?: LLMToolCall[];
    finishReason?: string;
    model: string;
    provider: 'groq' | 'openai' | 'google';
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
     * Strictly uses the requested provider.
     */
    async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
        const apiKey = this.getApiKey(params.provider);

        if (!apiKey) {
            throw new Error(`[LLMClient] No API key configured for provider: ${params.provider}`);
        }

        if (params.provider === 'google') {
            return await this.callGoogleAPI(params, apiKey);
        }

        return await this.callAPI(params, apiKey);
    }

    private async callAPI(
        params: LLMCompletionParams,
        apiKey: string
    ): Promise<LLMCompletionResult> {
        const baseUrl = PROVIDER_BASE_URLS[params.provider as 'groq' | 'openai'];
        const url = `${baseUrl}/chat/completions`;

        const body: Record<string, unknown> = {
            model: params.model,
            messages: params.messages,
            max_tokens: params.maxTokens ?? 1024,
            temperature: params.temperature ?? 0.7,
        };

        if (params.responseFormat && params.responseFormat.type !== 'text') {
            body.response_format = params.responseFormat;
        }

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

    private async callGoogleAPI(
        params: LLMCompletionParams,
        apiKey: string
    ): Promise<LLMCompletionResult> {
        // Google Native API Endpoint
        // format: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent`;

        // Map system message to system_instruction
        const systemMessage = params.messages.find(m => m.role === 'system');
        const otherMessages = params.messages.filter(m => m.role !== 'system');

        const contents = otherMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || '' }]
        }));

        const body: Record<string, unknown> = {
            contents,
            generationConfig: {
                maxOutputTokens: params.maxTokens ?? 1024,
                temperature: params.temperature ?? 0.7,
            }
        };

        if (systemMessage) {
            body.system_instruction = {
                parts: [{ text: systemMessage.content || '' }]
            };
        }

        if (params.tools && params.tools.length > 0) {
            body.tools = [
                {
                    function_declarations: params.tools.map(t => ({
                        name: t.function.name,
                        description: t.function.description,
                        parameters: t.function.parameters
                    }))
                }
            ];
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-goog-api-key': apiKey,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            const err = new Error(`Google AI API error ${response.status}: ${errText.slice(0, 200)}`);
            (err as any).status = response.status;
            throw err;
        }

        const data = await response.json() as any;
        const candidate = data.candidates?.[0];
        const message = candidate?.content;
        const finishReason = candidate?.finishReason?.toLowerCase() || 'stop';

        const content = message?.parts?.[0]?.text || null;
        const toolCalls: LLMToolCall[] | undefined = Array.isArray(message?.parts)
            ? message.parts
                .filter((p: any) => p.functionCall)
                .map((p: any) => ({
                    id: `call_${Math.random().toString(36).substring(7)}`, // Google doesn't always provide IDs in native format
                    type: 'function',
                    function: {
                        name: p.functionCall.name,
                        arguments: JSON.stringify(p.functionCall.args)
                    }
                }))
            : undefined;

        if (!content && (!toolCalls || toolCalls.length === 0)) {
            throw new Error(`Google AI returned empty content and no tool calls. Model: ${params.model}`);
        }

        return {
            content,
            toolCalls: (toolCalls?.length ?? 0) > 0 ? toolCalls : undefined,
            finishReason,
            model: params.model,
            provider: 'google',
            usage: data.usageMetadata ? {
                promptTokens: data.usageMetadata.promptTokenCount ?? 0,
                completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
                totalTokens: data.usageMetadata.totalTokenCount ?? 0,
            } : undefined,
        };
    }

    private getApiKey(provider: 'groq' | 'openai' | 'google'): string | null {
        if (provider === 'groq') {
            return process.env.GROQ_API_KEY || null;
        }
        if (provider === 'google') {
            return process.env.GOOGLE_API_KEY || null;
        }
        return process.env.OPENAI_API_KEY || null;
    }
}

export const llmClient = new LLMClientService();
