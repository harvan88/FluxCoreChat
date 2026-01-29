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
  AccountDeletionJob,
  AccountDeletionLog,
  AccountDataReference,
  AccountOrphanReference,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiService {
  private token: string | null = null;
  private currentUserId: string | null = null;

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

  setCurrentUserId(userId: string | null) {
    this.currentUserId = userId;
  }

  getAdminHeaders(): HeadersInit {
    return {
      'x-user-id': this.currentUserId ?? '',
      'x-admin-scope': 'ACCOUNT_DELETE_FORCE',
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();

    const isFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const headers: HeadersInit = {
      ...(isFormDataBody ? {} : { 'Content-Type': 'application/json' }),
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
  async register(data: RegisterData): Promise<ApiResponse<{ user: User; token: string; accounts: Account[] }>> {
    const response = await this.request<{ user: User; token: string; accounts: Account[] }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
      this.setCurrentUserId(response.data.user?.id ?? null);
    }
    return response;
  }

  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; token: string; accounts: Account[] }>> {
    const response = await this.request<{ user: User; token: string; accounts: Account[] }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
      this.setCurrentUserId(response.data.user?.id ?? null);
    }
    return response;
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
    this.setToken(null);
    this.setCurrentUserId(null);
  }

  async getSession(): Promise<ApiResponse<{ user: User; accounts: Account[] }>> {
    return this.request<{ user: User; accounts: Account[] }>('/auth/me');
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
  async getRelationships(accountId?: string): Promise<ApiResponse<Relationship[]>> {
    const query = accountId ? `?accountId=${accountId}` : '';
    return this.request<Relationship[]>(`/relationships${query}`);
  }

  async createRelationship(data: { accountAId: string; accountBId: string }): Promise<ApiResponse<Relationship>> {
    return this.request<Relationship>('/relationships', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Conversations
  async getConversations(accountId?: string): Promise<ApiResponse<Conversation[]>> {
    const query = accountId ? `?accountId=${accountId}` : '';
    return this.request<Conversation[]>(`/conversations${query}`);
  }

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

  async deleteMessage(id: string): Promise<ApiResponse<void>> {
    return this.request(`/messages/${id}`, { method: 'DELETE' });
  }

  // Health
  async health(): Promise<ApiResponse<{ status: string }>> {
    return this.request<{ status: string }>('/health');
  }

  // AI traces (Prompt Inspector)
  async getAITraces(params: {
    accountId: string;
    conversationId?: string;
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    const query = new URLSearchParams();
    query.set('accountId', params.accountId);
    if (params.conversationId) query.set('conversationId', params.conversationId);
    if (typeof params.limit === 'number') query.set('limit', String(params.limit));
    return this.request<any[]>(`/ai/traces?${query.toString()}`);
  }

  async getAITrace(params: { accountId: string; traceId: string }): Promise<ApiResponse<any>> {
    const query = new URLSearchParams();
    query.set('accountId', params.accountId);
    return this.request<any>(`/ai/traces/${encodeURIComponent(params.traceId)}?${query.toString()}`);
  }

  async downloadAITraces(params: {
    accountId: string;
    conversationId?: string;
    limit?: number;
  }): Promise<ApiResponse<string>> {
    const query = new URLSearchParams();
    query.set('accountId', params.accountId);
    if (params.conversationId) query.set('conversationId', params.conversationId);
    if (typeof params.limit === 'number') query.set('limit', String(params.limit));

    const token = this.getToken();
    try {
      const response = await fetch(`${API_URL}/ai/traces/export?${query.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/jsonl',
        },
      });
      const text = await response.text();
      if (!response.ok) {
        return {
          success: false,
          error: text || `Error ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: text,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Error de conexión',
      };
    }
  }

  async getCreditsBalance(accountId: string): Promise<ApiResponse<{ balance: number }>> {
    const query = new URLSearchParams();
    query.set('accountId', accountId);
    return this.request<{ balance: number }>(`/credits/balance?${query.toString()}`);
  }

  async getCreditsSession(params: {
    accountId: string;
    conversationId: string;
    featureKey?: string;
  }): Promise<
    ApiResponse<
      | {
          id: string;
          featureKey: string;
          engine: string;
          model: string;
          tokenBudget: number;
          tokensUsed: number;
          tokensRemaining: number;
          expiresAt: string;
        }
      | null
    >
  > {
    const query = new URLSearchParams();
    query.set('accountId', params.accountId);
    query.set('conversationId', params.conversationId);
    if (typeof params.featureKey === 'string' && params.featureKey.trim().length > 0) {
      query.set('featureKey', params.featureKey);
    }
    return this.request(
      `/credits/session?${query.toString()}`
    ) as any;
  }

  async creditsAdminSearch(q: string): Promise<
    ApiResponse<
      Array<{
        id: string;
        username: string;
        displayName: string;
        accountType: 'personal' | 'business';
        balance: number;
      }>
    >
  > {
    return this.request(
      `/credits/admin/search?q=${encodeURIComponent(q)}`
    ) as any;
  }

  async creditsAdminGrant(params: {
    accountId?: string;
    query?: string;
    amount: number;
    featureKey?: string;
    metadata?: Record<string, any>;
  }): Promise<ApiResponse<{ accountId: string; balance: number }>> {
    return this.request<{ accountId: string; balance: number }>(
      '/credits/admin/grant',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  }

  async clearAITraces(accountId: string): Promise<ApiResponse<{ cleared: number }>> {
    const query = new URLSearchParams();
    query.set('accountId', accountId);
    return this.request<{ cleared: number }>(`/ai/traces?${query.toString()}`, {
      method: 'DELETE',
    });
  }

  // Search accounts by @alias, email, or name
  async searchAccounts(query: string): Promise<ApiResponse<Account[]>> {
    return this.request<Account[]>(`/accounts/search?q=${encodeURIComponent(query)}`);
  }

  // Create relationship (add contact)
  async addContact(accountAId: string, accountBId: string): Promise<ApiResponse<Relationship>> {
    return this.request<Relationship>('/relationships', {
      method: 'POST',
      body: JSON.stringify({ accountAId, accountBId }),
    });
  }

  // Delete relationship (remove contact)
  async deleteContact(relationshipId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/relationships/${relationshipId}`, {
      method: 'DELETE',
    });
  }

  // Delete conversation
  async deleteConversation(conversationId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  // Convert account to business
  async convertToBusiness(accountId: string): Promise<ApiResponse<Account>> {
    return this.request<Account>(`/accounts/${accountId}/convert-to-business`, {
      method: 'POST',
    });
  }

  async requestAccountDeletion(
    accountId: string,
    options?: { sessionAccountId?: string; dataHandling?: 'download_snapshot' | 'delete_all' }
  ): Promise<ApiResponse<AccountDeletionJob>> {
    return this.request<AccountDeletionJob>(`/accounts/${accountId}/delete/request`, {
      method: 'POST',
      body: JSON.stringify({
        sessionAccountId: options?.sessionAccountId,
        dataHandling: options?.dataHandling,
      }),
    });
  }

  async prepareAccountDeletionSnapshot(accountId: string): Promise<ApiResponse<AccountDeletionJob>> {
    return this.request<AccountDeletionJob>(`/accounts/${accountId}/delete/snapshot`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async verifyPassword(password: string): Promise<ApiResponse<{ valid: boolean }>> {
    return this.request<{ valid: boolean }>(`/auth/verify-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async acknowledgeAccountDeletionSnapshot(
    accountId: string,
    payload: { downloaded?: boolean; consent?: boolean }
  ): Promise<ApiResponse<AccountDeletionJob>> {
    return this.request<AccountDeletionJob>(`/accounts/${accountId}/delete/snapshot/ack`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    });
  }

  async downloadAccountDeletionSnapshot(accountId: string): Promise<Blob> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/accounts/${accountId}/delete/snapshot/download`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      let message = `Error ${response.status}: ${response.statusText}`;
      try {
        const data = await response.json();
        if (data?.message) {
          message = data.message;
        }
      } catch {
        // ignore json parse error
      }

      throw new Error(message);
    }

    return response.blob();
  }

  async confirmAccountDeletion(
    accountId: string,
    options?: { sessionAccountId?: string | null }
  ): Promise<ApiResponse<AccountDeletionJob>> {
    return this.request<AccountDeletionJob>(`/accounts/${accountId}/delete/confirm`, {
      method: 'POST',
      body: JSON.stringify({ sessionAccountId: options?.sessionAccountId ?? null }),
    });
  }

  async getAccountDeletionJob(accountId: string): Promise<ApiResponse<AccountDeletionJob | null>> {
    return this.request<AccountDeletionJob | null>(`/accounts/${accountId}/delete/job`);
  }

  async getAccountDeletionLogs(params: {
    limit?: number;
    accountId?: string;
    jobId?: string;
    status?: string;
    createdAfter?: string;
    createdBefore?: string;
  }): Promise<ApiResponse<AccountDeletionLog[]>> {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    if (params.accountId) query.set('accountId', params.accountId);
    if (params.jobId) query.set('jobId', params.jobId);
    if (params.status) query.set('status', params.status);
    if (params.createdAfter) query.set('createdAfter', params.createdAfter);
    if (params.createdBefore) query.set('createdBefore', params.createdBefore);

    return this.request<AccountDeletionLog[]>(`/internal/account-deletions/logs?${query.toString()}`, {
      headers: this.getAdminHeaders(),
    });
  }

  async getAccountDataReferences(accountId: string): Promise<ApiResponse<AccountDataReference[]>> {
    const query = new URLSearchParams({ accountId });
    return this.request<AccountDataReference[]>(`/internal/account-deletions/references?${query.toString()}`, {
      headers: this.getAdminHeaders(),
    });
  }

  async getAccountOrphanReferences(sampleLimit?: number): Promise<ApiResponse<AccountOrphanReference[]>> {
    const query = new URLSearchParams();
    if (sampleLimit) query.set('sampleLimit', String(sampleLimit));
    return this.request<AccountOrphanReference[]>(`/internal/account-deletions/orphans?${query.toString()}`, {
      headers: this.getAdminHeaders(),
    });
  }

  // Forgot password
  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Reset password
  async resetPassword(token: string, password: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  // Avatar upload
  async uploadAvatar(file: File, accountId?: string): Promise<ApiResponse<{ url: string; filename: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    
    const query = accountId ? `?accountId=${accountId}` : '';
    
    const response = await this.request<{ url: string; filename: string }>(`/upload/avatar${query}`, {
      method: 'POST',
      body: formData,
    });
    
    return response;
  }

  // Generic file upload (attachments)
  async uploadFile(params: {
    file: File;
    type: 'image' | 'document' | 'audio' | 'video';
    messageId?: string;
  }): Promise<ApiResponse<{ attachment: any; url: string }>> {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('type', params.type);
    if (params.messageId) formData.append('messageId', params.messageId);

    return this.request<{ attachment: any; url: string }>('/upload/file', {
      method: 'POST',
      body: formData,
    });
  }

  // Voice note upload
  async uploadAudio(params: {
    file: File;
    messageId?: string;
  }): Promise<ApiResponse<{ attachment: any; url: string; waveformData?: any }>> {
    const formData = new FormData();
    formData.append('file', params.file);
    if (params.messageId) formData.append('messageId', params.messageId);

    return this.request<{ attachment: any; url: string; waveformData?: any }>('/upload/audio', {
      method: 'POST',
      body: formData,
    });
  }

  // Vector store files
  async getVectorStoreFiles(storeId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/fluxcore/vector-stores/${storeId}/files`);
  }

  async deleteVectorStoreFile(storeId: string, fileId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/fluxcore/vector-stores/${storeId}/files/${fileId}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();
