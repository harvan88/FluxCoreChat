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
  AIStatusResponse,
  AIEligibilityResponse,
  PromptPreviewData,
  KernelSession,
  KernelSessionStatus,
} from '../types';
import type {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '../components/templates/types';

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

    const shouldSendJsonHeader = !isFormDataBody && options.body !== undefined;

    const headers: HeadersInit = {
      ...(shouldSendJsonHeader ? { 'Content-Type': 'application/json' } : {}),
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

  async getAIStatus(accountId: string): Promise<ApiResponse<AIStatusResponse>> {
    const query = new URLSearchParams({ accountId });
    return this.request<AIStatusResponse>(`/ai/status?${query.toString()}`);
  }

  async getAIEligibility(params: { accountId: string; conversationId: string }): Promise<ApiResponse<AIEligibilityResponse>> {
    const query = new URLSearchParams({ accountId: params.accountId, conversationId: params.conversationId });
    return this.request<AIEligibilityResponse>(`/ai/eligibility?${query.toString()}`);
  }

  async updateAIRuntime(accountId: string, runtimeId: string): Promise<ApiResponse<{ success: true }>> {
    return this.request<{ success: true }>('/ai/runtime', {
      method: 'POST',
      body: JSON.stringify({ accountId, runtimeId }),
    });
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

  async deleteMessagesBulk(messageIds: string[], scope: 'self' | 'all' = 'self', accountId?: string): Promise<ApiResponse<{
    deleted: number;
    failed: number;
    scope: string;
    action: string;
  }>> {
    return this.request('/messages/bulk', { 
      method: 'DELETE',
      body: JSON.stringify({ messageIds, scope, accountId })
    });
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

  async deleteAITrace(params: { accountId: string; traceId: string }): Promise<ApiResponse<{ success: true }>> {
    const query = new URLSearchParams();
    query.set('accountId', params.accountId);
    return this.request<{ success: true }>(`/ai/traces/${encodeURIComponent(params.traceId)}?${query.toString()}`, {
      method: 'DELETE',
    });
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
    return this.request<{ cleared: number }>(`/ai/traces/clear?${query.toString()}`);
  }

  async getKernelSessions(params: {
    accountId: string;
    actorId?: string;
    statuses?: KernelSessionStatus[];
  }): Promise<ApiResponse<{ sessions: KernelSession[] }>> {
    const query = new URLSearchParams();
    query.set('accountId', params.accountId);
    if (params.actorId) {
      query.set('actorId', params.actorId);
    }
    if (params.statuses && params.statuses.length > 0) {
      query.set('status', params.statuses.join(','));
    }

    return this.request<{ sessions: KernelSession[] }>(`/kernel/sessions/active?${query.toString()}`);
  }

  async getAgents(accountId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/fluxcore/agents?accountId=${encodeURIComponent(accountId)}`);
  }

  async getAgent(accountId: string, agentId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/agents/${encodeURIComponent(agentId)}?accountId=${encodeURIComponent(accountId)}`);
  }

  async createAgent(params: {
    accountId: string;
    name: string;
    description?: string;
    status?: string;
    flow?: any;
    scopes?: any;
    triggerConfig?: any;
    assistantIds?: Array<{ assistantId: string; role?: string; stepId?: string }>;
  }): Promise<ApiResponse<any>> {
    return this.request<any>('/fluxcore/agents', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async updateAgent(accountId: string, agentId: string, params: Record<string, any>): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/agents/${encodeURIComponent(agentId)}`, {
      method: 'PUT',
      body: JSON.stringify({ accountId, ...params }),
    });
  }

  async deleteAgent(accountId: string, agentId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/agents/${encodeURIComponent(agentId)}?accountId=${encodeURIComponent(accountId)}`, {
      method: 'DELETE',
    });
  }

  async activateAgent(accountId: string, agentId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/agents/${encodeURIComponent(agentId)}/activate`, {
      method: 'POST',
      body: JSON.stringify({ accountId }),
    });
  }

  async deactivateAgent(accountId: string, agentId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/agents/${encodeURIComponent(agentId)}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ accountId }),
    });
  }

  async updateAgentFlow(accountId: string, agentId: string, flow: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/agents/${encodeURIComponent(agentId)}/flow`, {
      method: 'PUT',
      body: JSON.stringify({ accountId, flow }),
    });
  }

  async updateAgentScopes(accountId: string, agentId: string, scopes: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/agents/${encodeURIComponent(agentId)}/scopes`, {
      method: 'PUT',
      body: JSON.stringify({ accountId, scopes }),
    });
  }

  async setAgentAssistants(accountId: string, agentId: string, assistants: Array<{ assistantId: string; role?: string; stepId?: string }>): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/agents/${encodeURIComponent(agentId)}/assistants`, {
      method: 'PUT',
      body: JSON.stringify({ accountId, assistants }),
    });
  }

  async getPromptPreview(assistantId: string, accountId?: string): Promise<ApiResponse<PromptPreviewData>> {
    const query = new URLSearchParams();
    if (accountId) query.set('accountId', accountId);
    const qs = query.toString();
    const suffix = qs ? `?${qs}` : '';
    return this.request<PromptPreviewData>(`/fluxcore/runtime/prompt-preview/${assistantId}${suffix}`);
  }

  async creditsAdminListPolicies(filters?: {
    featureKey?: string;
    engine?: string;
    model?: string;
    active?: boolean;
  }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (filters?.featureKey) params.set('featureKey', filters.featureKey);
    if (filters?.engine) params.set('engine', filters.engine);
    if (filters?.model) params.set('model', filters.model);
    if (typeof filters?.active === 'boolean') params.set('active', filters.active ? 'true' : 'false');

    const query = params.toString();
    const endpoint = query ? `/credits/admin/policies?${query}` : '/credits/admin/policies';
    return this.request(endpoint) as any;
  }

  async creditsAdminCreatePolicy(payload: {
    featureKey: string;
    engine: string;
    model: string;
    costCredits: number;
    tokenBudget: number;
    durationHours?: number;
    active?: boolean;
  }): Promise<ApiResponse<{ id: string }>> {
    return this.request('/credits/admin/policies', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as any;
  }

  async creditsAdminUpdatePolicy(id: string, payload: {
    featureKey?: string;
    engine?: string;
    model?: string;
    costCredits?: number;
    tokenBudget?: number;
    durationHours?: number;
    active?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.request(`/credits/admin/policies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }) as any;
  }

  async creditsAdminTogglePolicy(id: string, active: boolean): Promise<ApiResponse<any>> {
    return this.request(`/credits/admin/policies/${id}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ active }),
    }) as any;
  }

  // Search accounts by @alias, email, or name
  async searchAccounts(query: string): Promise<ApiResponse<Account[]>> {
    return this.request<Account[]>(`/accounts/search?q=${encodeURIComponent(query)}`);
  }

  // ... rest of the code remains the same ...
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

  // Clear chat (hide all messages for current actor)
  async clearChat(conversationId: string): Promise<ApiResponse<{ hiddenCount: number }>> {
    return this.request<{ hiddenCount: number }>(`/conversations/${conversationId}/clear`, {
      method: 'POST',
    });
  }

  // Delete conversation (leave / soft delete)
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

  // Templates CRUD -----------------------------------------------------------
  async listTemplates(accountId: string): Promise<ApiResponse<Template[]>> {
    const query = new URLSearchParams({ accountId });
    return this.request<Template[]>(`/api/templates?${query.toString()}`);
  }

  async getTemplate(accountId: string, templateId: string): Promise<ApiResponse<Template>> {
    const query = new URLSearchParams({ accountId });
    return this.request<Template>(`/api/templates/${templateId}?${query.toString()}`);
  }

  async createTemplate(accountId: string, payload: CreateTemplateInput): Promise<ApiResponse<Template>> {
    return this.request<Template>('/api/templates', {
      method: 'POST',
      body: JSON.stringify({ accountId, ...payload }),
    });
  }

  async updateTemplate(accountId: string, templateId: string, payload: UpdateTemplateInput): Promise<ApiResponse<Template>> {
    return this.request<Template>(`/api/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify({ accountId, ...payload }),
    });
  }

  async deleteTemplate(accountId: string, templateId: string): Promise<ApiResponse<{ success: boolean }>> {
    const query = new URLSearchParams({ accountId });
    return this.request<{ success: boolean }>(`/api/templates/${templateId}?${query.toString()}`, {
      method: 'DELETE',
    });
  }

  async linkTemplateAsset(accountId: string, templateId: string, assetId: string, slot: string = 'attachment'): Promise<ApiResponse<{ success: boolean }>> {
    const query = new URLSearchParams({ accountId });
    return this.request<{ success: boolean }>(`/api/templates/${templateId}/assets?${query.toString()}`, {
      method: 'POST',
      body: JSON.stringify({ assetId, slot }),
    });
  }

  async unlinkTemplateAsset(accountId: string, templateId: string, assetId: string, slot: string = 'attachment'): Promise<ApiResponse<{ success: boolean }>> {
    const query = new URLSearchParams({ accountId, slot });
    return this.request<{ success: boolean }>(`/api/templates/${templateId}/assets/${assetId}?${query.toString()}`, {
      method: 'DELETE',
    });
  }

  async executeTemplate(
    accountId: string,
    templateId: string,
    params: {
      conversationId: string;
      variables?: Record<string, string>;
    }
  ): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/templates/${templateId}/execute`, {
      method: 'POST',
      body: JSON.stringify({
        accountId,
        conversationId: params.conversationId,
        variables: params.variables
      }),
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
  async uploadAvatarAsset(params: {
    accountId: string;
    file: File;
    uploadedBy?: string;
  }): Promise<ApiResponse<{ assetId: string; url: string }>> {
    console.log('[API] uploadAvatarAsset called with:', {
      accountId: params.accountId,
      fileName: params.file.name,
      fileSize: params.file.size,
      fileType: params.file.type,
      uploadedBy: params.uploadedBy
    });

    try {
      // Create upload session
      console.log('[API] Step 1: Creating upload session...');
      const sessionResp = await this.request<{ sessionId: string }>(
        `/api/accounts/${params.accountId}/avatar/upload-session`,
        {
          method: 'POST',
          body: JSON.stringify({
            fileName: `avatar_${Date.now()}_${params.file.name}`,
            mimeType: params.file.type,
            sizeBytes: params.file.size,
          }),
          headers: {
            // Include kernel context headers for compatibility with Kernel Bootstrap
            'x-account-id': params.accountId,
            'x-user-id': this.currentUserId || '',
          },
        }
      );

      console.log('[API] Upload session response:', {
        success: sessionResp.success,
        error: sessionResp.error,
        data: sessionResp.data
      });

      if (!sessionResp.success || !sessionResp.data) {
        console.error('[API] Failed to create upload session:', sessionResp.error);
        return {
          success: false,
          error: sessionResp.error || 'No se pudo crear la sesión de upload',
        };
      }

      const { sessionId } = sessionResp.data;
      console.log('[API] Step 2: Uploading file to session:', sessionId);
      
      const uploadSuccess = await this.uploadAssetFile(params.accountId, sessionId, params.file);
      
      console.log('[API] File upload result:', {
        success: uploadSuccess.success,
        error: uploadSuccess.error
      });

      if (!uploadSuccess.success) {
        console.error('[API] File upload failed:', uploadSuccess.error);
        await this.cancelAssetUpload(sessionId, params.accountId).catch(() => undefined);
        return {
          success: false,
          error: uploadSuccess.error || 'Error subiendo archivo',
        };
      }

      console.log('[API] Step 3: Committing upload...');
      const commitResp = await this.request<{ asset: { id: string }; account: Account }>(
        `/api/accounts/${params.accountId}/avatar/upload/${sessionId}/commit`,
        {
          method: 'POST',
          body: JSON.stringify({ uploadedBy: params.uploadedBy }),
          headers: {
            // Include kernel context headers for compatibility with Kernel Bootstrap
            'x-account-id': params.accountId,
            'x-user-id': this.currentUserId || '',
          },
        }
      );

      console.log('[API] Commit response:', {
        success: commitResp.success,
        error: commitResp.error,
        data: commitResp.data
      });

      if (!commitResp.success || !commitResp.data) {
        console.error('[API] Commit failed:', commitResp.error);
        return {
          success: false,
          error: commitResp.error || 'No se pudo confirmar el asset',
        };
      }

      console.log('[API] Step 4: Signing asset URL...');
      const assetId = commitResp.data.asset.id;
      const signResp = await this.signAssetUrl(assetId, params.accountId, {
        actorId: params.uploadedBy || this.currentUserId || '',
        action: 'preview',
        channel: 'web',
      });

      console.log('[API] Sign URL response:', {
        success: signResp.success,
        error: signResp.error,
        hasData: !!signResp.data
      });

      if (!signResp.success || !signResp.data) {
        console.error('[API] URL signing failed:', signResp.error);
        return {
          success: false,
          error: signResp.error || 'No se pudo firmar el asset',
        };
      }

      console.log('[API] Avatar upload completed successfully:', {
        assetId,
        url: signResp.data.url
      });

      return {
        success: true,
        data: {
          assetId,
          url: signResp.data.url,
        },
      };
    } catch (error) {
      console.error('[API] Avatar upload exception:', error);
      return {
        success: false,
        error: 'Error al subir el avatar',
      };
    }
  }

  async updateAccountAvatar(params: {
    accountId: string;
    avatarAssetId: string;
  }): Promise<ApiResponse<void>> {
    console.log('[API] updateAccountAvatar called with:', {
      accountId: params.accountId,
      avatarAssetId: params.avatarAssetId
    });

    try {
      const response = await this.request<void>(`/api/accounts/${params.accountId}/avatar`, {
        method: 'PATCH',
        body: JSON.stringify({ avatarAssetId: params.avatarAssetId }),
      });

      console.log('[API] updateAccountAvatar result:', {
        success: response.success,
        error: response.error
      });

      return response;
    } catch (error) {
      console.error('[API] updateAccountAvatar exception:', error);
      return {
        success: false,
        error: 'Error al actualizar avatar',
      };
    }
  }

  private async uploadAssetFile(accountId: string, sessionId: string, file: File): Promise<ApiResponse<{ success: true }>> {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/api/assets/upload/${sessionId}?accountId=${accountId}`, {
      method: 'PUT',
      body: formData,
      headers: {
        ...this.getToken()
          ? {
              Authorization: `Bearer ${this.getToken()}`,
            }
          : undefined,
        // Include kernel context headers for compatibility with Kernel Bootstrap
        'x-account-id': accountId,
        'x-user-id': this.currentUserId || '',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: error || 'Error subiendo archivo' };
    }

    return { success: true, data: { success: true } };
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

  // ════════════════════════════════════════════════════════════════════════════
  // ASSET MANAGEMENT (Chat Core)
  // ════════════════════════════════════════════════════════════════════════════

  async createAssetUploadSession(params: {
    accountId: string;
    fileName: string;
    mimeType: string;
    totalBytes: number;
    maxSizeBytes?: number;
    allowedMimeTypes?: string[];
  }): Promise<ApiResponse<{
    sessionId: string;
    expiresAt: string;
    maxSizeBytes: number;
    allowedMimeTypes: string[];
  }>> {
    return this.request<{ sessionId: string; expiresAt: string; maxSizeBytes: number; allowedMimeTypes: string[] }>(
      `/api/assets/upload-session?accountId=${params.accountId}`,
      {
        method: 'POST',
        body: JSON.stringify({
          accountId: params.accountId,
          fileName: params.fileName,
          mimeType: params.mimeType,
          sizeBytes: params.totalBytes,
          maxSizeBytes: params.maxSizeBytes,
          allowedMimeTypes: params.allowedMimeTypes,
        }),
        headers: {
          // Include kernel context headers for compatibility with Kernel Bootstrap
          'x-account-id': params.accountId,
          'x-user-id': this.currentUserId || '',
        },
      }
    );
  }

  async commitAssetUpload(
    sessionId: string,
    accountId: string,
    options?: {
      scope?: string;
    }
  ): Promise<ApiResponse<{
    assetId: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    status: string;
  }>> {
    return this.request(`/api/assets/upload/${sessionId}/commit?accountId=${accountId}`, {
      method: 'POST',
      body: JSON.stringify({
        accountId,
        scope: options?.scope || 'message_attachment',
        uploadedBy: this.currentUserId || null, // Use actual user ID instead of "system"
      }),
      headers: {
        // Include kernel context headers for compatibility with Kernel Bootstrap
        'x-account-id': accountId,
        'x-user-id': this.currentUserId || '',
      },
    });
  }

  async cancelAssetUpload(sessionId: string, _accountId: string): Promise<ApiResponse<void>> {
    return this.request(`/api/assets/upload/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async getAsset(assetId: string, accountId: string): Promise<ApiResponse<{
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    status: string;
    scope: string;
    version: number;
    createdAt: string;
  }>> {
    return this.request(`/api/assets/${assetId}?accountId=${accountId}`);
  }

  async signAssetUrl(
    assetId: string,
    accountId: string,
    params: {
      actorId: string;
      actorType?: 'user' | 'assistant' | 'system';
      action?: string;
      channel?: string;
      disposition?: 'inline' | 'attachment';
    }
  ): Promise<ApiResponse<{
    url: string;
    expiresAt: string;
    ttlSeconds?: number;
  }>> {
    const { actorId, actorType = 'user', action = 'download', channel = 'web', disposition } = params;

    return this.request(`/api/assets/${assetId}/sign?accountId=${accountId}`, {
      method: 'POST',
      body: JSON.stringify({
        actorId,
        actorType,
        action,
        channel,
        disposition,
      }),
    });
  }

  async searchAssets(params: {
    accountId: string;
    scope?: string;
    status?: string;
    mimeType?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{
    assets: Array<{
      id: string;
      name: string;
      mimeType: string;
      sizeBytes: number;
      status: string;
      scope: string;
      createdAt: string;
    }>;
    total: number;
  }>> {
    return this.request(`/api/assets/search?accountId=${params.accountId}`, {
      method: 'POST',
      body: JSON.stringify({
        scope: params.scope,
        status: params.status,
        mimeType: params.mimeType,
        search: params.search,
        limit: params.limit,
        offset: params.offset,
      }),
    });
  }

  async deleteAsset(assetId: string, accountId: string): Promise<ApiResponse<void>> {
    return this.request(`/api/assets/${assetId}?accountId=${accountId}`, {
      method: 'DELETE',
      body: JSON.stringify({ accountId }),
    });
  }

  // Kernel Status
  async getKernelStatusOverview(params?: { accountId?: string }): Promise<ApiResponse<{
    kernel: {
      total_signals: number;
      unique_fact_types: number;
      last_signal_at: string;
      signals_last_hour: number;
      signals_last_24h: number;
      status: 'active' | 'inactive';
    };
    outbox: {
      total: number;
      certified: number;
      pending: number;
      last_outbox_at: string;
      outbox_last_hour: number;
    };
    sessions: {
      total: number;
      active: number;
      pending: number;
      invalidated: number;
      last_activity: string;
    };
    recent_signal_types: Array<{
      fact_type: string;
      count: number;
      last_seen: string;
    }>;
    projectors: Array<{
      name: string;
      last_sequence_number: number;
      error_count: number;
      last_error: string | null;
      is_healthy: boolean;
    }>;
    system_metrics: Array<{
      metric_name: string;
      metric_value: string;
      recorded_at: string;
    }>;
  }>> {
    const query = params?.accountId ? `?accountId=${params.accountId}` : '';
    return this.request(`/kernel/status/overview${query}`);
  }

  async getKernelSignals(params?: { 
    limit?: number; 
    offset?: number; 
    factType?: string;
  }): Promise<ApiResponse<{
    signals: Array<{
      sequence_number: number;
      fact_type: string;
      source_namespace: string;
      source_key: string;
      subject_namespace: string;
      subject_key: string;
      object_namespace: string;
      object_key: string;
      evidence_raw: any;
      evidence_format: string;
      certified_by_adapter: string;
      certified_adapter_version: string;
      claimed_occurred_at: string;
      observed_at: string;
    }>;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      has_more: boolean;
    };
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.factType) queryParams.append('factType', params.factType);
    
    const query = queryParams.toString();
    return this.request(`/kernel/status/signals${query ? `?${query}` : ''}`);
  }

  async getAssetVersions(assetId: string, accountId: string): Promise<ApiResponse<Array<{
    version: number;
    sizeBytes: number;
    createdAt: string;
  }>>> {
    return this.request(`/api/assets/${assetId}/versions?accountId=${accountId}`);
  }

  // Asset Relations
  async linkAssetToMessage(messageId: string, assetId: string, accountId: string, position?: number): Promise<ApiResponse<void>> {
    return this.request(`/api/messages/${messageId}/assets?accountId=${accountId}`, {
      method: 'POST',
      body: JSON.stringify({ assetId, position }),
    });
  }

  async getMessageAssets(messageId: string): Promise<ApiResponse<Array<{
    assetId: string;
    version: number;
    position: number;
    name: string;
    mimeType: string;
    sizeBytes: number;
    status: string;
  }>>> {
    return this.request(`/api/messages/${messageId}/assets`);
  }

  async unlinkAssetFromMessage(messageId: string, assetId: string, accountId: string): Promise<ApiResponse<void>> {
    return this.request(`/api/messages/${messageId}/assets/${assetId}?accountId=${accountId}`, {
      method: 'DELETE',
    });
  }

  // WES-180: Fluxi Work Execution System
  async getProposedWorks(accountId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/fluxcore/works/proposed?accountId=${accountId}`);
  }

  async getActiveWorks(accountId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/fluxcore/works/active?accountId=${accountId}`);
  }

  async getWorkHistory(accountId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/fluxcore/works/history?accountId=${accountId}`);
  }

  async getProposedWork(accountId: string, id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/works/proposed/${id}?accountId=${accountId}`);
  }

  async getWork(accountId: string, id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/works/${id}?accountId=${accountId}`);
  }

  async openWork(accountId: string, workId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/works/${workId}/open?accountId=${accountId}`, {
      method: 'POST',
    });
  }

  async discardWork(accountId: string, workId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/fluxcore/works/${workId}/discard?accountId=${accountId}`, {
      method: 'POST',
    });
  }

  async getAssistantMode(accountId: string): Promise<ApiResponse<{ mode: string; assistantId: string | null; assistantName: string | null }>> {
    return this.request(`/fluxcore/assistants/active-mode?accountId=${accountId}`);
  }

  async setAssistantMode(accountId: string, mode: 'auto' | 'suggest' | 'off'): Promise<ApiResponse<{ mode: string; assistantId: string | null }>> {
    return this.request(`/fluxcore/assistants/active-mode`, {
      method: 'PATCH',
      body: JSON.stringify({ accountId, mode }),
    });
  }
}

export const api = new ApiService();
