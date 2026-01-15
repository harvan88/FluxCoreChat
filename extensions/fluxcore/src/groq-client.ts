/**
 * Groq Client - Cliente para la API de Groq
 * 
 * Proporciona acceso a modelos de IA rápidos como LLaMA y Mixtral
 */

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqCompletionRequest {
  model: string;
  messages: GroqMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
}

export interface GroqCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface GroqError {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

export class GroqClient {
  private readonly baseUrl = 'https://api.groq.com/openai/v1';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || '';
  }

  /**
   * Verifica si el cliente tiene una API key configurada
   */
  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Actualiza la API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Genera una completación de chat
   */
  async createChatCompletion(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<{ content: string; usage: GroqCompletionResponse['usage'] }> {
    if (!this.isConfigured()) {
      throw new Error('Groq API key not configured. Set GROQ_API_KEY environment variable or configure in extension settings.');
    }

    const model = options.model || 'llama-3.1-8b-instant';
    const maxTokens = options.maxTokens || 256;
    const temperature = options.temperature || 0.7;

    const groqMessages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const request: GroqCompletionRequest = {
      model,
      messages: groqMessages,
      max_tokens: maxTokens,
      temperature,
    };

    const url = `${this.baseUrl}/chat/completions`;
    const maxAttempts = 3;

    let response: Response | null = null;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(request),
        });

        if (response.ok) {
          lastError = null;
          break;
        }

        if (response.status >= 500 && attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 250 * Math.pow(2, attempt - 1)));
          continue;
        }

        break;
      } catch (error: any) {
        lastError = error;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 250 * Math.pow(2, attempt - 1)));
          continue;
        }
      }
    }

    if (!response) {
      throw new Error(lastError?.message || 'Groq request failed');
    }

    if (!response.ok) {
      const error: GroqError = await response.json();
      throw new Error(`Groq API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data: GroqCompletionResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from Groq API');
    }

    return {
      content: data.choices[0].message.content,
      usage: data.usage,
    };
  }

  /**
   * Lista los modelos disponibles
   */
  async listModels(): Promise<string[]> {
    if (!this.isConfigured()) {
      return ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'];
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        return ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'];
      }

      const data = await response.json();
      return data.data?.map((m: any) => m.id) || [];
    } catch {
      return ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'];
    }
  }

  /**
   * Verifica la conexión con la API
   */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default GroqClient;
