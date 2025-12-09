/**
 * API Service para comunicación con el backend
 */

import type {
  User,
  Account,
  Relationship,
  Conversation,
  Message,
  ApiResponse,
  LoginCredentials,
  RegisterData,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('fluxcore_token', token);
    } else {
      localStorage.removeItem('fluxcore_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('fluxcore_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // Intentar parsear JSON
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Si no es JSON, obtener texto para debug
        const text = await response.text();
        console.error(`[API] Non-JSON response from ${endpoint}:`, text.substring(0, 200));
        return {
          success: false,
          error: `Error del servidor: ${response.status} ${response.statusText}`,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `Error ${response.status}: ${response.statusText}`,
        };
      }

      return data;
    } catch (error: any) {
      console.error(`[API] Request failed for ${endpoint}:`, error);
      
      // Detectar errores específicos de red
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'No se puede conectar al servidor. Verifica que el backend esté corriendo.',
        };
      }
      
      return {
        success: false,
        error: error.message || 'Error de conexión',
      };
    }
  }

  // Auth
  async register(data: RegisterData): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }
    return response;
  }

  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }
    return response;
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
    this.setToken(null);
  }

  // Accounts
  async getAccounts(): Promise<ApiResponse<Account[]>> {
    return this.request<Account[]>('/accounts');
  }

  async createAccount(data: Partial<Account>): Promise<ApiResponse<Account>> {
    return this.request<Account>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAccount(id: string): Promise<ApiResponse<Account>> {
    return this.request<Account>(`/accounts/${id}`);
  }

  async updateAccount(id: string, data: Partial<Account>): Promise<ApiResponse<Account>> {
    return this.request<Account>(`/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Relationships
  async getRelationships(): Promise<ApiResponse<Relationship[]>> {
    return this.request<Relationship[]>('/relationships');
  }

  async createRelationship(data: { accountAId: string; accountBId: string }): Promise<ApiResponse<Relationship>> {
    return this.request<Relationship>('/relationships', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Conversations
  async createConversation(data: { relationshipId: string; channel: string }): Promise<ApiResponse<Conversation>> {
    return this.request<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getConversation(id: string): Promise<ApiResponse<Conversation>> {
    return this.request<Conversation>(`/conversations/${id}`);
  }

  async getConversationMessages(
    id: string,
    params?: { limit?: number; before?: string }
  ): Promise<ApiResponse<Message[]>> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.before) query.set('before', params.before);
    return this.request<Message[]>(`/conversations/${id}/messages?${query}`);
  }

  // Messages
  async sendMessage(data: {
    conversationId: string;
    senderAccountId: string;
    content: { text: string };
    type: 'outgoing';
  }): Promise<ApiResponse<{ messageId: string }>> {
    return this.request<{ messageId: string }>('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMessage(id: string): Promise<ApiResponse<Message>> {
    return this.request<Message>(`/messages/${id}`);
  }

  // Health
  async health(): Promise<ApiResponse<{ status: string }>> {
    return this.request<{ status: string }>('/health');
  }
}

export const api = new ApiService();
