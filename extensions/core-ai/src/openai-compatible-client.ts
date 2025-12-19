export type AIErrorType =
  | 'timeout'
  | 'unauthorized'
  | 'rate_limited'
  | 'server_error'
  | 'network_error'
  | 'bad_request'
  | 'unknown';

export class AIClientError extends Error {
  readonly type: AIErrorType;
  readonly statusCode?: number;

  constructor(message: string, type: AIErrorType, statusCode?: number) {
    super(message);
    this.name = 'AIClientError';
    this.type = type;
    this.statusCode = statusCode;
  }
}

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: OpenAIChatCompletionUsage;
}

export interface OpenAIChatCompletionRequestBody {
  model: string;
  messages: OpenAIChatMessage[];
  max_tokens: number;
  temperature: number;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return res;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new AIClientError('Request timed out', 'timeout');
    }

    throw new AIClientError(error?.message || 'Network error', 'network_error');
  } finally {
    clearTimeout(timeout);
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return `HTTP ${res.status}`;

    try {
      const json = JSON.parse(text);
      const msg = json?.error?.message || json?.message;
      if (typeof msg === 'string' && msg.trim().length > 0) {
        return msg;
      }
    } catch {
      // ignore JSON parse error
    }

    return text.slice(0, 200);
  } catch {
    return `HTTP ${res.status}`;
  }
}

function classifyHttpError(status: number, message: string): AIClientError {
  if (status === 401 || status === 403) return new AIClientError(message, 'unauthorized', status);
  if (status === 429) return new AIClientError(message, 'rate_limited', status);
  if (status >= 500) return new AIClientError(message, 'server_error', status);
  if (status >= 400) return new AIClientError(message, 'bad_request', status);
  return new AIClientError(message, 'unknown', status);
}

export class OpenAICompatibleClient {
  constructor(private readonly baseUrl: string) {}

  async createChatCompletion(params: {
    apiKey: string;
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    model: string;
    maxTokens: number;
    temperature: number;
    timeoutMs: number;
  }): Promise<{ content: string; usage: OpenAIChatCompletionUsage; requestBody: OpenAIChatCompletionRequestBody }>
  {
    const url = `${this.baseUrl}/chat/completions`;

    const requestBody: OpenAIChatCompletionRequestBody = {
      model: params.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        ...params.messages,
      ] as OpenAIChatMessage[],
      max_tokens: params.maxTokens,
      temperature: params.temperature,
    };

    const res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      },
      params.timeoutMs
    );

    if (!res.ok) {
      const message = await parseErrorMessage(res);
      throw classifyHttpError(res.status, message);
    }

    const data = (await res.json()) as OpenAIChatCompletionResponse;

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new AIClientError('No response from provider', 'unknown');
    }

    return {
      content,
      usage: data.usage,
      requestBody,
    };
  }

  async testConnection(params: { apiKey: string; timeoutMs: number }): Promise<void> {
    const url = `${this.baseUrl}/models`;

    const res = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${params.apiKey}`,
        },
      },
      params.timeoutMs
    );

    if (!res.ok) {
      const message = await parseErrorMessage(res);
      throw classifyHttpError(res.status, message);
    }
  }
}
